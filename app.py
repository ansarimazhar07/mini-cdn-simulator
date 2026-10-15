import os
import time
import base64
import json
import csv
from datetime import datetime
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Base path for origin storage
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ORIGIN_DIR = os.path.join(BASE_DIR, "origin")

# Ensure origin directory exists
os.makedirs(ORIGIN_DIR, exist_ok=True)

# 3 Independent in-memory edge caches
# Each dictionary represents an isolated edge server cache
EDGE_CACHES = {
    "edge1": {},
    "edge2": {},
    "edge3": {}
}

EDGE_LABELS = {
    "edge1": "Edge 1 (Node A)",
    "edge2": "Edge 2 (Node B)",
    "edge3": "Edge 3 (Node C)"
}

# Global statistics and request history
stats = {
    "total_requests": 0,
    "cache_hits": 0,
    "cache_misses": 0,
    "total_response_time_ms": 0.0,
    "history": []
}

# Simulated origin retrieval delay (in seconds)
ORIGIN_SIMULATED_LATENCY_SEC = 0.035  # ~35ms simulated origin retrieval


def get_file_content_and_type(filepath):
    """Safely reads file content from disk and returns formatted content, content_type, and size."""
    ext = os.path.splitext(filepath)[1].lower()
    
    # 1. Images
    if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
        with open(filepath, 'rb') as f:
            raw_bytes = f.read()
        b64 = base64.b64encode(raw_bytes).decode('utf-8')
        mime = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else ('image/png' if ext == '.png' else f'image/{ext.lstrip(".")}')
        data_url = f"data:{mime};base64,{b64}"
        return data_url, "image", len(raw_bytes)

    # 2. Videos
    elif ext in ['.mp4', '.webm', '.ogg']:
        with open(filepath, 'rb') as f:
            raw_bytes = f.read()
        b64 = base64.b64encode(raw_bytes).decode('utf-8')
        mime = 'video/mp4' if ext == '.mp4' else f'video/{ext.lstrip(".")}'
        data_url = f"data:{mime};base64,{b64}"
        return data_url, "video", len(raw_bytes)

    # 3. Audio
    elif ext in ['.mp3', '.wav', '.ogg', '.m4a']:
        with open(filepath, 'rb') as f:
            raw_bytes = f.read()
        b64 = base64.b64encode(raw_bytes).decode('utf-8')
        mime = 'audio/mpeg' if ext == '.mp3' else ('audio/wav' if ext == '.wav' else f'audio/{ext.lstrip(".")}')
        data_url = f"data:{mime};base64,{b64}"
        return data_url, "audio", len(raw_bytes)

    # 4. JSON
    elif ext == '.json':
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
        parsed = json.loads(text)
        return parsed, "json", len(text.encode('utf-8'))

    # 5. CSV Data Table
    elif ext == '.csv':
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
        reader = csv.reader(text.splitlines())
        rows = [row for row in reader if row]
        return {"headers": rows[0] if rows else [], "rows": rows[1:] if len(rows) > 1 else [], "raw": text}, "csv", len(text.encode('utf-8'))

    # 6. Text & Markdown
    else:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
        return text, "text", len(text.encode('utf-8'))


@app.route("/")
def index():
    """Serves the main interactive CDN simulator dashboard."""
    return render_template("index.html")


@app.route("/api/files", methods=["GET"])
def list_files():
    """Lists all available content files in origin storage with categorized metadata."""
    files = []
    if os.path.exists(ORIGIN_DIR):
        for name in sorted(os.listdir(ORIGIN_DIR)):
            path = os.path.join(ORIGIN_DIR, name)
            if os.path.isfile(path):
                ext = os.path.splitext(name)[1].lower()
                if ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                    category = "image"
                elif ext in ['.mp4', '.webm']:
                    category = "video"
                elif ext in ['.mp3', '.wav']:
                    category = "audio"
                elif ext == '.json':
                    category = "json"
                elif ext == '.csv':
                    category = "csv"
                else:
                    category = "text"

                files.append({
                    "filename": name,
                    "type": category,
                    "size_bytes": os.path.getsize(path),
                    "size_display": f"{os.path.getsize(path):,} bytes" if os.path.getsize(path) < 1048576 else f"{os.path.getsize(path) / 1048576:.2f} MB"
                })
    return jsonify({"status": "success", "files": files})


@app.route("/api/request", methods=["GET"])
def request_content():
    """Handles CDN content requests for any file through a selected edge cache."""
    filename = request.args.get("file", "").strip()
    edge = request.args.get("edge", "").strip().lower()

    if edge not in EDGE_CACHES:
        return jsonify({
            "status": "error",
            "message": f"Invalid edge identifier '{edge}'. Must be edge1, edge2, or edge3."
        }), 400

    clean_filename = os.path.basename(filename)
    if not clean_filename:
        return jsonify({"status": "error", "message": "Filename parameter is required."}), 400

    target_path = os.path.abspath(os.path.join(ORIGIN_DIR, clean_filename))
    if not target_path.startswith(ORIGIN_DIR) or not os.path.isfile(target_path):
        return jsonify({
            "status": "error",
            "message": f"File '{clean_filename}' was not found in the origin directory."
        }), 404

    t_start = time.perf_counter()
    edge_cache = EDGE_CACHES[edge]
    is_hit = clean_filename in edge_cache

    if is_hit:
        cached_entry = edge_cache[clean_filename]
        content = cached_entry["content"]
        content_type = cached_entry["content_type"]
        result = "CACHE HIT"
        source = "EDGE CACHE"
    else:
        if ORIGIN_SIMULATED_LATENCY_SEC > 0:
            time.sleep(ORIGIN_SIMULATED_LATENCY_SEC)
        
        content, content_type, size_bytes = get_file_content_and_type(target_path)
        
        edge_cache[clean_filename] = {
            "content": content,
            "content_type": content_type,
            "size_bytes": size_bytes,
            "cached_at": datetime.now().strftime("%H:%M:%S")
        }
        result = "CACHE MISS"
        source = "ORIGIN"

    elapsed_ms = round((time.perf_counter() - t_start) * 1000, 2)

    stats["total_requests"] += 1
    if is_hit:
        stats["cache_hits"] += 1
    else:
        stats["cache_misses"] += 1
    stats["total_response_time_ms"] += elapsed_ms

    history_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "filename": clean_filename,
        "edge": EDGE_LABELS[edge],
        "edge_id": edge,
        "result": result,
        "source": source,
        "response_time_ms": elapsed_ms
    }
    stats["history"].insert(0, history_entry)
    if len(stats["history"]) > 20:
        stats["history"].pop()

    return jsonify({
        "status": "success",
        "file": clean_filename,
        "edge": edge,
        "edge_label": EDGE_LABELS[edge],
        "result": result,
        "source": source,
        "response_time_ms": elapsed_ms,
        "content_type": content_type,
        "content": content
    })


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Returns current CDN statistics, per-edge cache inventories, and recent telemetry."""
    total = stats["total_requests"]
    hits = stats["cache_hits"]
    misses = stats["cache_misses"]
    hit_ratio = round((hits / total * 100), 1) if total > 0 else 0.0
    avg_resp_time = round((stats["total_response_time_ms"] / total), 2) if total > 0 else 0.0

    edges_info = {}
    for edge_id, cache_dict in EDGE_CACHES.items():
        edges_info[edge_id] = {
            "name": EDGE_LABELS[edge_id],
            "cached_count": len(cache_dict),
            "cached_files": list(cache_dict.keys())
        }

    return jsonify({
        "status": "success",
        "total_requests": total,
        "cache_hits": hits,
        "cache_misses": misses,
        "hit_ratio": hit_ratio,
        "avg_response_time_ms": avg_resp_time,
        "edges": edges_info,
        "history": stats["history"][:10]
    })


@app.route("/api/reset", methods=["POST"])
def reset_caches():
    """Clears all edge caches and resets all statistics and request history."""
    for edge_id in EDGE_CACHES:
        EDGE_CACHES[edge_id].clear()

    stats["total_requests"] = 0
    stats["cache_hits"] = 0
    stats["cache_misses"] = 0
    stats["total_response_time_ms"] = 0.0
    stats["history"].clear()

    return jsonify({
        "status": "success",
        "message": "All edge caches, statistics, and request history have been reset."
    })


if __name__ == "__main__":
    print("==================================================")
    print(" Mini CDN Simulator - Distributed Systems Project")
    print(" Running at: http://127.0.0.1:5000/")
    print("==================================================")
    app.run(host="127.0.0.1", port=5000, debug=True)

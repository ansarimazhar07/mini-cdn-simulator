# Mini CDN Simulator

> **Distributed Systems Course Project (CS-402)**  
> A simple, educational simulation of Content Delivery Network (CDN) edge caching, origin fallback, and request telemetry using Python Flask, HTML, CSS, and JavaScript.

---

## 1. Project Overview

A Content Delivery Network (CDN) accelerates web content delivery by caching copies of files on geographically dispersed edge proxy servers. When a user requests an asset:
- If the local edge node already possesses the file, it serves it immediately (**CACHE HIT**).
- If the file is missing from the local edge node, it fetches the file from the centralized origin server, saves a copy in its local cache, and delivers it to the user (**CACHE MISS**).

This project simulates a CDN architecture inside a single lightweight Python Flask application:
- **1 Central Origin Storage:** Located in the local `origin/` directory (`nature.jpg`, `datacenter.png`, `sample_video.mp4`, `sample_audio.mp3`, `metrics.csv`, `welcome.txt`, `about.json`).
- **3 Independent Edge Caches:** `Edge 1`, `Edge 2`, and `Edge 3` simulated using isolated in-memory Python dictionaries.
- **Interactive Light-Themed Web Dashboard:** An Emerald & Sage interface with live content preview (Image, HTML5 Video, HTML5 Audio, CSV Table, JSON, and Text), cache resolution badges, high-resolution response timing (`time.perf_counter()`), cache inventory status cards, aggregate statistics, and a 10-event request telemetry log.

> **Honest Academic Disclaimer:**  
> All components run on one machine within a single Flask process. The three edge caches are simulated as isolated in-memory hash maps to demonstrate distributed caching principles without requiring complex multi-server infrastructure.

---

## 2. Prerequisites

- **Operating System:** Windows, macOS, or Linux.
- **Python:** Python 3.8 or higher.
- **Web Browser:** Any modern browser (Chrome, Edge, Firefox, Brave, Safari).

---

## 3. Project Structure

```
edgex/
├── app.py                # Flask application & CDN routing controller
├── origin/               # Centralized origin storage directory
│   ├── nature.jpg        # Real landscape image (800x500 JPEG)
│   ├── datacenter.png    # Futuristic CDN Edge Topology graphic (PNG)
│   ├── sample_video.mp4  # Blooming flower video clip (H.264 MP4 - 1.1 MB)
│   ├── sample_audio.mp3  # Acoustic sound clip (MP3 - 40 KB)
│   ├── metrics.csv       # CDN edge telemetry log table (CSV)
│   ├── welcome.txt       # Project introduction text file
│   └── about.json        # System metadata in JSON format
├── templates/
│   └── index.html        # Interactive single-page dashboard with multimedia previewers
├── static/
│   ├── style.css         # Clean, light-themed CSS (Emerald/Sage non-blue palette)
│   └── script.js         # Vanilla JS fetch logic & dynamic media rendering
├── requirements.txt      # Dependencies (Flask, Pillow)
├── start.bat             # 1-click Windows startup script
├── README.md             # Project documentation and guide
└── REPORT.md             # Full academic report with viva questions
```

---

## 4. Installation & Setup

### Option A: One-Click Launch (Windows)
Double-click `start.bat` or run it from Command Prompt / PowerShell:
```cmd
start.bat
```
The script will automatically:
1. Verify Python installation.
2. Create a virtual environment (`.venv`) if one does not exist.
3. Activate `.venv` and install `requirements.txt`.
4. Launch the application on `http://127.0.0.1:5000/`.

### Option B: Manual Terminal Setup
```bash
# 1. Create a virtual environment
python -m venv .venv

# 2. Activate the virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (Command Prompt):
.venv\Scripts\activate.bat
# Linux / macOS:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the Flask application
python app.py
```

Open your browser and navigate to:
```
http://127.0.0.1:5000/
```

---

## 5. How to Demonstrate for College Viva

Follow this 5-step sequence to demonstrate CDN mechanics:

### Step 1: Demonstrate First Request (Cache Miss)
1. Select **File:** `nature.jpg`.
2. Select **Edge:** `Edge 1`.
3. Click **Request Content**.
4. **Observation:**
   - Status badge shows: **CACHE MISS** (Amber badge).
   - Response Source: **ORIGIN**.
   - Response Time: ~35–45 ms (due to origin retrieval).
   - Real landscape image is rendered in the preview area.
   - Under **Simulated Edge Caches**, `Edge 1` now shows `1 file: nature.jpg`. `Edge 2` and `Edge 3` remain empty (`0 files`).

### Step 2: Demonstrate Edge Cache Hit
1. Keep the exact same selections (`nature.jpg` + `Edge 1`).
2. Click **Request Content** again.
3. **Observation:**
   - Status badge instantly flips to: **CACHE HIT** (Emerald badge).
   - Response Source: **EDGE CACHE**.
   - Response Time: **< 1.5 ms** (served immediately from RAM).
   - Statistics update: 1 Hit, 1 Miss, 50.0% Hit Ratio.

### Step 3: Demonstrate Independent Edge Isolation
1. Change **Edge** to `Edge 2` (still requesting `nature.jpg`).
2. Click **Request Content**.
3. **Observation:**
   - Status badge shows: **CACHE MISS**.
   - **Viva Explanation:** Even though `nature.jpg` is cached on `Edge 1`, `Edge 2` is an independent regional node with its own isolated cache. This demonstrates edge partition independence.
   - `Edge 2` now caches its own copy.

### Step 4: Demonstrate Different Content Types
1. Select `welcome.txt` with `Edge 1` &rarr; Returns raw text stream with terminal preview.
2. Select `about.json` with `Edge 3` &rarr; Returns structured, formatted JSON metadata.

### Step 5: Demonstrate Cache Purging (Reset)
1. Click **Clear All Caches**.
2. Confirm the prompt.
3. **Observation:**
   - All 3 edge cache cards reset to `0 files (Cache empty)`.
   - Statistics reset to 0 (Hits, Misses, Requests, Ratio).
   - Request history table is cleared.
4. Request `nature.jpg` via `Edge 1` once more:
   - Result is once again a **CACHE MISS** from **ORIGIN**, verifying that the cache was completely flushed.

---

## 6. API Reference

| Endpoint | Method | Parameters | Description |
|---|---|---|---|
| `/` | `GET` | None | Serves the web dashboard |
| `/api/files` | `GET` | None | Lists all files available in `origin/` storage |
| `/api/request` | `GET` | `file=<name>&edge=<edge1\|edge2\|edge3>` | Queries edge cache, falls back to origin on miss, returns content and latency metrics |
| `/api/stats` | `GET` | None | Returns total requests, hit/miss count, ratio, avg latency, and per-edge cache inventories |
| `/api/reset` | `POST` | None | Purges all 3 edge caches, resets statistics and telemetry history |

---

## 7. Security & File Safety

To prevent directory traversal attacks (e.g. `../../etc/passwd` or `..\..\Windows`), the backend employs:
```python
clean_filename = os.path.basename(filename)
target_path = os.path.abspath(os.path.join(ORIGIN_DIR, clean_filename))
if not target_path.startswith(ORIGIN_DIR) or not os.path.isfile(target_path):
    return jsonify({"status": "error", "message": "Access denied"}), 404
```
This guarantees that only files physically stored inside the `origin/` directory can ever be accessed.

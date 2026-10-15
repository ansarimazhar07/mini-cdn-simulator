/**
 * Mini CDN Simulator - Frontend Logic
 * Implements fetch() requests to Flask backend, live multi-format content rendering
 * (Images, HD Video, Audio, CSV, JSON, Text), telemetry metrics updating, and cache state visualization.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const form = document.getElementById('cdn-request-form');
  const selectFile = document.getElementById('select-file');
  const selectEdge = document.getElementById('select-edge');
  const btnRequest = document.getElementById('btn-request');
  const btnReset = document.getElementById('btn-reset');

  // Result Elements
  const resultStatusBadge = document.getElementById('result-status-badge');
  const resStatus = document.getElementById('res-status');
  const resSource = document.getElementById('res-source');
  const resEdge = document.getElementById('res-edge');
  const resTime = document.getElementById('res-time');
  const resultExplanation = document.getElementById('result-explanation');

  // Route Flow Visualizer
  const flowEdgeStep = document.getElementById('flow-step-edge');
  const flowEdgeLabel = document.getElementById('flow-edge-label');
  const flowOriginStep = document.getElementById('flow-step-origin');

  // Content Preview Elements
  const emptyPreview = document.getElementById('empty-preview');
  
  // Image
  const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
  const deliveredImage = document.getElementById('delivered-image');
  const imageCaption = document.getElementById('image-caption');

  // Video
  const videoPreviewWrapper = document.getElementById('video-preview-wrapper');
  const deliveredVideo = document.getElementById('delivered-video');
  const videoCaption = document.getElementById('video-caption');

  // Audio
  const audioPreviewWrapper = document.getElementById('audio-preview-wrapper');
  const deliveredAudio = document.getElementById('delivered-audio');
  const audioTitle = document.getElementById('audio-title');

  // CSV
  const csvPreviewWrapper = document.getElementById('csv-preview-wrapper');
  const csvHeadRow = document.getElementById('csv-head-row');
  const csvBody = document.getElementById('csv-body');

  // Text
  const textPreviewWrapper = document.getElementById('text-preview-wrapper');
  const deliveredText = document.getElementById('delivered-text');

  // JSON
  const jsonPreviewWrapper = document.getElementById('json-preview-wrapper');
  const deliveredJson = document.getElementById('delivered-json');
  const tagFileType = document.getElementById('tag-file-type');

  // Statistics Elements
  const statTotal = document.getElementById('stat-total');
  const statHits = document.getElementById('stat-hits');
  const statMisses = document.getElementById('stat-misses');
  const statRatio = document.getElementById('stat-ratio');
  const statAvgTime = document.getElementById('stat-avg-time');

  // History Table
  const historyTableBody = document.getElementById('history-table-body');

  // Initial load
  loadFiles();
  refreshStats();

  /**
   * Fetch available origin files and populate categorized dropdown
   */
  async function loadFiles() {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.status === 'success' && data.files && data.files.length > 0) {
        selectFile.innerHTML = '';

        // Categorize into optgroups
        const groups = {
          'Images': [],
          'Video & Audio Streaming': [],
          'Structured Data & Documents': []
        };

        data.files.forEach(f => {
          if (f.type === 'image') {
            groups['Images'].push(f);
          } else if (f.type === 'video' || f.type === 'audio') {
            groups['Video & Audio Streaming'].push(f);
          } else {
            groups['Structured Data & Documents'].push(f);
          }
        });

        Object.keys(groups).forEach(grpName => {
          if (groups[grpName].length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = grpName;

            groups[grpName].forEach(f => {
              const opt = document.createElement('option');
              opt.value = f.filename;
              const typeLabel = f.type.toUpperCase();
              opt.textContent = `${f.filename} • ${typeLabel} (${f.size_display})`;
              optgroup.appendChild(opt);
            });

            selectFile.appendChild(optgroup);
          }
        });
      }
    } catch (err) {
      console.warn('Using default file options due to network delay:', err);
    }
  }

  /**
   * Handle Content Request submission
   */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = selectFile.value;
    const edge = selectEdge.value;

    // Visual loading state
    btnRequest.disabled = true;
    btnRequest.innerHTML = `
      <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span>Requesting...</span>
    `;

    // Reset flow indicators
    flowEdgeStep.className = 'flow-step step-edge active';
    flowEdgeLabel.textContent = edge.toUpperCase();
    flowOriginStep.className = 'flow-step step-origin';

    // Pause any playing media before new load
    if (deliveredVideo) deliveredVideo.pause();
    if (deliveredAudio) deliveredAudio.pause();

    try {
      const url = `/api/request?file=${encodeURIComponent(file)}&edge=${encodeURIComponent(edge)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'success') {
        renderResult(data);
        renderPreview(data);
        await refreshStats();
      } else {
        alert(`Error: ${data.message || 'Failed to fetch content'}`);
      }
    } catch (err) {
      console.error('Request failed:', err);
      alert('Network error while requesting content through CDN.');
    } finally {
      btnRequest.disabled = false;
      btnRequest.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Request Content</span>
      `;
    }
  });

  /**
   * Render result telemetry panel and route tracer
   */
  function renderResult(data) {
    const isHit = data.result === 'CACHE HIT';

    // Badge styling
    resultStatusBadge.className = `badge-status ${isHit ? 'badge-hit' : 'badge-miss'}`;
    resultStatusBadge.textContent = data.result;

    // Metric items
    resStatus.innerHTML = isHit 
      ? `<span class="pill hit-pill">HIT</span>` 
      : `<span class="pill miss-pill">MISS</span>`;
    
    resSource.textContent = data.source;
    resEdge.textContent = data.edge_label;
    resTime.textContent = `${data.response_time_ms.toFixed(2)} ms`;

    // Dynamic explanation
    if (isHit) {
      resultExplanation.innerHTML = `
        <strong>⚡ CACHE HIT:</strong> File <code>${data.file}</code> was found in <strong>${data.edge_label}</strong>'s memory cache. 
        Delivered directly from RAM in <strong>${data.response_time_ms} ms</strong> without contacting the origin server.
      `;
      flowEdgeStep.className = 'flow-step step-edge highlight-hit';
      flowOriginStep.className = 'flow-step step-origin';
    } else {
      resultExplanation.innerHTML = `
        <strong>🔄 CACHE MISS:</strong> File <code>${data.file}</code> was not present in <strong>${data.edge_label}</strong>. 
        Fetched from <strong>ORIGIN storage</strong>, cached in ${data.edge_label}'s memory, and delivered in <strong>${data.response_time_ms} ms</strong>.
      `;
      flowEdgeStep.className = 'flow-step step-edge highlight-miss';
      flowOriginStep.className = 'flow-step step-origin highlight-miss';
    }
  }

  /**
   * Render the actual delivered content preview across multiple media formats
   */
  function renderPreview(data) {
    emptyPreview.classList.add('hidden');
    imagePreviewWrapper.classList.add('hidden');
    videoPreviewWrapper.classList.add('hidden');
    audioPreviewWrapper.classList.add('hidden');
    csvPreviewWrapper.classList.add('hidden');
    textPreviewWrapper.classList.add('hidden');
    jsonPreviewWrapper.classList.add('hidden');

    tagFileType.textContent = `${data.file} (${data.content_type.toUpperCase()}) • Source: ${data.source}`;

    // 1. Image
    if (data.content_type === 'image') {
      deliveredImage.src = data.content;
      imageCaption.textContent = `${data.file} • Delivered via ${data.source} (${data.response_time_ms} ms)`;
      imagePreviewWrapper.classList.remove('hidden');
    }
    // 2. Video
    else if (data.content_type === 'video') {
      deliveredVideo.src = data.content;
      videoCaption.textContent = `${data.file} • Delivered via ${data.source} (${data.response_time_ms} ms)`;
      videoPreviewWrapper.classList.remove('hidden');
      deliveredVideo.play().catch(() => {}); // Autoplay if allowed
    }
    // 3. Audio
    else if (data.content_type === 'audio') {
      deliveredAudio.src = data.content;
      audioTitle.textContent = data.file;
      audioPreviewWrapper.classList.remove('hidden');
      deliveredAudio.play().catch(() => {});
    }
    // 4. CSV Table
    else if (data.content_type === 'csv') {
      csvHeadRow.innerHTML = '';
      csvBody.innerHTML = '';

      if (data.content.headers && data.content.headers.length > 0) {
        data.content.headers.forEach(h => {
          const th = document.createElement('th');
          th.textContent = h;
          csvHeadRow.appendChild(th);
        });
      }

      if (data.content.rows && data.content.rows.length > 0) {
        data.content.rows.forEach(rowArr => {
          const tr = document.createElement('tr');
          rowArr.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
          });
          csvBody.appendChild(tr);
        });
      }
      csvPreviewWrapper.classList.remove('hidden');
    }
    // 5. JSON
    else if (data.content_type === 'json') {
      deliveredJson.textContent = JSON.stringify(data.content, null, 2);
      jsonPreviewWrapper.classList.remove('hidden');
    }
    // 6. Text
    else {
      deliveredText.textContent = data.content;
      textPreviewWrapper.classList.remove('hidden');
    }
  }

  /**
   * Fetch current stats, edge cache states, and recent history table
   */
  async function refreshStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.status !== 'success') return;

      // Update aggregate metrics
      statTotal.textContent = data.total_requests;
      statHits.textContent = data.cache_hits;
      statMisses.textContent = data.cache_misses;
      statRatio.textContent = `${data.hit_ratio.toFixed(1)}%`;
      statAvgTime.textContent = `${data.avg_response_time_ms.toFixed(2)} ms`;

      // Update Edge Cards (Edge 1, Edge 2, Edge 3)
      ['edge1', 'edge2', 'edge3'].forEach(edgeId => {
        const edgeInfo = data.edges[edgeId];
        const countBadge = document.getElementById(`${edgeId}-count-badge`);
        const filesList = document.getElementById(`${edgeId}-files-list`);

        if (edgeInfo) {
          countBadge.textContent = `${edgeInfo.cached_count} ${edgeInfo.cached_count === 1 ? 'file' : 'files'}`;
          filesList.innerHTML = '';

          if (edgeInfo.cached_files && edgeInfo.cached_files.length > 0) {
            edgeInfo.cached_files.forEach(filename => {
              const li = document.createElement('li');
              li.className = 'cached-file-tag';
              li.textContent = filename;
              filesList.appendChild(li);
            });
          } else {
            const li = document.createElement('li');
            li.className = 'empty-cache-note';
            li.textContent = 'Cache empty';
            filesList.appendChild(li);
          }
        }
      });

      // Update Request Telemetry History Table
      if (data.history && data.history.length > 0) {
        historyTableBody.innerHTML = '';
        data.history.forEach(item => {
          const row = document.createElement('tr');
          const isHit = item.result === 'CACHE HIT';

          row.innerHTML = `
            <td class="font-mono text-muted">${item.timestamp}</td>
            <td><strong>${item.filename}</strong></td>
            <td>${item.edge}</td>
            <td>
              <span class="table-pill ${isHit ? 'hit-pill' : 'miss-pill'}">
                ${item.result}
              </span>
            </td>
            <td>
              <span class="table-pill ${item.source === 'EDGE CACHE' ? 'source-edge-pill' : 'source-origin-pill'}">
                ${item.source}
              </span>
            </td>
            <td class="font-mono">${item.response_time_ms.toFixed(2)} ms</td>
          `;
          historyTableBody.appendChild(row);
        });
      } else {
        historyTableBody.innerHTML = `
          <tr class="empty-row">
            <td colspan="6">No requests recorded yet. Initiate a request to log telemetry.</td>
          </tr>
        `;
      }
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  }

  /**
   * Clear All Caches Button Action
   */
  btnReset.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all 3 edge caches and reset statistics?')) {
      return;
    }

    try {
      btnReset.disabled = true;

      // Stop media
      if (deliveredVideo) {
        deliveredVideo.pause();
        deliveredVideo.src = '';
      }
      if (deliveredAudio) {
        deliveredAudio.pause();
        deliveredAudio.src = '';
      }

      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();

      if (data.status === 'success') {
        // Reset Result Panel
        resultStatusBadge.className = 'badge-status badge-waiting';
        resultStatusBadge.textContent = 'Cleared';
        resStatus.textContent = '-';
        resSource.textContent = '-';
        resEdge.textContent = '-';
        resTime.textContent = '-';
        resultExplanation.innerHTML = `
          <strong>Caches Purged:</strong> All 3 Edge memory caches, statistics, and history have been cleared. 
          The next request for any file will result in a <strong>CACHE MISS</strong>.
        `;

        // Reset Flow Tracer
        flowEdgeStep.className = 'flow-step step-edge';
        flowEdgeLabel.textContent = 'Edge Cache';
        flowOriginStep.className = 'flow-step step-origin';

        // Reset Preview to empty
        emptyPreview.classList.remove('hidden');
        imagePreviewWrapper.classList.add('hidden');
        videoPreviewWrapper.classList.add('hidden');
        audioPreviewWrapper.classList.add('hidden');
        csvPreviewWrapper.classList.add('hidden');
        textPreviewWrapper.classList.add('hidden');
        jsonPreviewWrapper.classList.add('hidden');
        deliveredImage.src = '';
        deliveredText.textContent = '';
        deliveredJson.textContent = '';
        tagFileType.textContent = 'No content yet';

        // Refresh stats (will clear tables & edge cards)
        await refreshStats();
      }
    } catch (err) {
      console.error('Failed to reset caches:', err);
      alert('Error resetting caches.');
    } finally {
      btnReset.disabled = false;
    }
  });
});

/**
 * GrabPic Content Script
 * Auto-detects generated & uploaded chat images in ChatGPT and Google Gemini.
 * Provides a Neo-Brutalism dark mode UI gallery drawer with batch ZIP and single downloads.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__grabpic_injected) return;
  window.__grabpic_injected = true;

  // Platform detection
  const isChatGPT = /chatgpt\.com|chat\.openai\.com/.test(window.location.hostname);
  const isGemini = /gemini\.google\.com/.test(window.location.hostname);
  const platformName = isChatGPT ? 'chatgpt' : isGemini ? 'gemini' : 'web';

  const COLOR_SHADOWS = ['green', 'purple', 'blue', 'yellow', 'orange'];

  // State
  let detectedImages = []; // Array of { id, src, width, height, isSelected, shadowColor }
  let isDrawerOpen = false;
  let observer = null;
  let scanDebounceTimer = null;

  // Initialize UI
  initUI();
  setupObserver();
  startContinuousScanner();

  // Scan immediately
  scanImages();

  function initUI() {
    const iconUrl = chrome.runtime.getURL('icon48.png');
    const rootContainer = document.createElement('div');
    rootContainer.id = 'grabpic-root';
    rootContainer.innerHTML = `
      <!-- FAB - Floating Tab di Sisi Kanan Tengah dengan Logo GrabPic Asli -->
      <div id="grabpic-fab" class="grabpic-fab" title="Buka GrabPic Galeri" style="display: none;">
        <div id="grabpic-badge" class="grabpic-badge">0</div>
        <img class="grabpic-fab-logo" src="${iconUrl}" alt="GrabPic" />
        <span class="grabpic-fab-text">GRABPIC</span>
      </div>

      <!-- Backdrop -->
      <div id="grabpic-overlay" class="grabpic-drawer-overlay"></div>

      <!-- Side Panel / Drawer -->
      <div id="grabpic-drawer" class="grabpic-drawer">
        <!-- Header -->
        <div class="grabpic-header">
          <div class="grabpic-brand">
            <img class="grabpic-header-logo" src="${iconUrl}" alt="GrabPic Logo" />
            <span class="grabpic-logo-tag">GRABPIC</span>
            <span class="grabpic-platform-tag">${platformName}</span>
          </div>
          <button id="grabpic-close-btn" class="grabpic-close-btn" title="Close Panel">✕</button>
        </div>

        <!-- Controls Bar -->
        <div class="grabpic-controls">
          <label class="grabpic-select-all-wrapper">
            <input type="checkbox" id="grabpic-select-all-cb" class="grabpic-checkbox" checked />
            <span class="grabpic-controls-label" id="grabpic-select-all-text">PILIH SEMUA</span>
          </label>
          <button id="grabpic-refresh-btn" class="grabpic-refresh-btn" title="Scan ulang gambar">
            <span>⚡ SCAN</span>
          </button>
        </div>

        <!-- Gallery Grid -->
        <div id="grabpic-gallery" class="grabpic-gallery">
          <!-- Populated dynamically -->
        </div>

        <!-- Footer -->
        <div class="grabpic-footer">
          <div class="grabpic-btn-group">
            <button id="grabpic-btn-download-all" class="grabpic-btn grabpic-btn-all">
              ⚡ DOWNLOAD SEMUA (<span id="grabpic-total-count">0</span>)
            </button>
            <button id="grabpic-btn-download-selected" class="grabpic-btn grabpic-btn-selected">
              DOWNLOAD TERPILIH (<span id="grabpic-selected-count">0</span>)
            </button>
          </div>
          <div class="grabpic-credit">
            made by <a href="https://instagram.com/ikifer" target="_blank" rel="noopener noreferrer">@ikifer</a>
          </div>
        </div>
      </div>

      <!-- Toast Notification -->
      <div id="grabpic-toast" class="grabpic-toast"></div>
    `;

    document.body.appendChild(rootContainer);

    // Event Listeners
    const fab = document.getElementById('grabpic-fab');
    const overlay = document.getElementById('grabpic-overlay');
    const closeBtn = document.getElementById('grabpic-close-btn');
    const selectAllCb = document.getElementById('grabpic-select-all-cb');
    const refreshBtn = document.getElementById('grabpic-refresh-btn');
    const downloadAllBtn = document.getElementById('grabpic-btn-download-all');
    const downloadSelectedBtn = document.getElementById('grabpic-btn-download-selected');

    fab.addEventListener('click', toggleDrawer);
    overlay.addEventListener('click', closeDrawer);
    closeBtn.addEventListener('click', closeDrawer);

    selectAllCb.addEventListener('change', (e) => {
      const checked = e.target.checked;
      detectedImages.forEach((img) => (img.isSelected = checked));
      updateGalleryUI();
    });

    refreshBtn.addEventListener('click', () => {
      scanImages(true);
      showToast('Memindai ulang gambar...', 'success');
    });

    downloadAllBtn.addEventListener('click', () => downloadImages(detectedImages));
    downloadSelectedBtn.addEventListener('click', () => {
      const selected = detectedImages.filter((img) => img.isSelected);
      if (selected.length === 0) {
        showToast('Pilih setidaknya satu gambar!', 'error');
        return;
      }
      downloadImages(selected);
    });
  }

  function toggleDrawer() {
    isDrawerOpen = !isDrawerOpen;
    const drawer = document.getElementById('grabpic-drawer');
    const overlay = document.getElementById('grabpic-overlay');

    if (isDrawerOpen) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      scanImages();
    } else {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
    }
  }

  function closeDrawer() {
    isDrawerOpen = false;
    document.getElementById('grabpic-drawer')?.classList.remove('active');
    document.getElementById('grabpic-overlay')?.classList.remove('active');
  }

  function setupObserver() {
    observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        // Ignore changes inside GrabPic itself
        if (mutation.target && (mutation.target.id === 'grabpic-root' || mutation.target.closest?.('#grabpic-root'))) {
          continue;
        }
        if (mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }

      if (shouldScan) {
        if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
        scanDebounceTimer = setTimeout(() => scanImages(), 600);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
  }

  function startContinuousScanner() {
    // Periodic light scan for streaming / dynamic canvas / lazy load
    setInterval(() => {
      scanImages();
    }, 3000);
  }

  /**
   * Scan and filter actual chat images (exclude avatars, UI icons, svgs, small logos)
   */
  function scanImages(forceUpdate = false) {
    const rawImages = Array.from(document.querySelectorAll('img'));
    const validSrcSet = new Set();
    const newDetected = [];

    rawImages.forEach((img) => {
      // Ignore GrabPic own images if any
      if (img.closest('#grabpic-root')) return;

      const src = img.currentSrc || img.src;
      if (!src || src.startsWith('data:image/svg')) return;

      // Exclude common UI / Avatar / small icon patterns
      if (
        src.includes('avatar') ||
        src.includes('profile') ||
        src.includes('favicon') ||
        src.includes('icon-') ||
        src.includes('/assets/avatars/') ||
        src.includes('googleusercontent.com/a/') // Google profile avatar
      ) {
        return;
      }

      // Check dimensions (real or rendered)
      const rect = img.getBoundingClientRect();
      const naturalWidth = img.naturalWidth || rect.width;
      const naturalHeight = img.naturalHeight || rect.height;

      // Minimum size threshold to filter icons/avatars (usually <= 64px)
      if (naturalWidth < 100 || naturalHeight < 100) return;

      // Must not be an inline SVG or button child
      if (img.closest('button') || img.closest('nav') || img.closest('header')) {
        // Double check if in chat container or generated preview
        const isPreviewOrChat = img.closest('[data-message-author-role], .conversation-container, main, article, [role="presentation"]');
        if (!isPreviewOrChat) return;
      }

      // Calculate orientation
      let orientation = 'square';
      const ratio = naturalWidth / naturalHeight;
      if (ratio > 1.2) {
        orientation = 'landscape';
      } else if (ratio < 0.85) {
        orientation = 'portrait';
      }

      if (!validSrcSet.has(src)) {
        validSrcSet.add(src);
        newDetected.push({
          src,
          width: naturalWidth,
          height: naturalHeight,
          orientation
        });
      }
    });

    // Also look for background images or canvas if any
    const backgrounds = document.querySelectorAll('[style*="background-image"]');
    backgrounds.forEach((el) => {
      if (el.closest('#grabpic-root')) return;
      const bg = el.style.backgroundImage;
      const match = bg.match(/url\(["']?([^"']+)["']?\)/);
      if (match && match[1]) {
        const src = match[1];
        if (
          !validSrcSet.has(src) &&
          !src.includes('avatar') &&
          !src.includes('profile') &&
          !src.startsWith('data:image/svg')
        ) {
          const rect = el.getBoundingClientRect();
          if (rect.width >= 100 && rect.height >= 100) {
            const ratio = rect.width / rect.height;
            let orientation = 'square';
            if (ratio > 1.2) orientation = 'landscape';
            else if (ratio < 0.85) orientation = 'portrait';

            validSrcSet.add(src);
            newDetected.push({
              src,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              orientation
            });
          }
        }
      }
    });

    // Check if list changed
    const currentSrcs = detectedImages.map((i) => i.src).sort().join('|');
    const newSrcs = newDetected.map((i) => i.src).sort().join('|');

    if (currentSrcs !== newSrcs || forceUpdate) {
      // Merge while preserving selection state
      detectedImages = newDetected.map((item, index) => {
        const existing = detectedImages.find((img) => img.src === item.src);
        return {
          id: `gp-img-${index + 1}`,
          index: index + 1,
          src: item.src,
          width: item.width,
          height: item.height,
          orientation: item.orientation || 'square',
          isSelected: existing ? existing.isSelected : true,
          shadowColor: COLOR_SHADOWS[index % COLOR_SHADOWS.length]
        };
      });

      updateGalleryUI();
    }
  }

  function updateGalleryUI() {
    const fab = document.getElementById('grabpic-fab');
    const badge = document.getElementById('grabpic-badge');
    const gallery = document.getElementById('grabpic-gallery');
    const totalCountEl = document.getElementById('grabpic-total-count');
    const selectedCountEl = document.getElementById('grabpic-selected-count');
    const selectAllCb = document.getElementById('grabpic-select-all-cb');
    const selectAllText = document.getElementById('grabpic-select-all-text');
    const downloadAllBtn = document.getElementById('grabpic-btn-download-all');
    const downloadSelectedBtn = document.getElementById('grabpic-btn-download-selected');

    const totalCount = detectedImages.length;
    const selectedCount = detectedImages.filter((i) => i.isSelected).length;

    // Show/Hide FAB based on detection
    if (totalCount > 0) {
      fab.style.display = 'flex';
      badge.textContent = totalCount;
    } else {
      fab.style.display = 'none';
    }

    totalCountEl.textContent = totalCount;
    selectedCountEl.textContent = selectedCount;

    // Update Select All Checkbox
    if (selectAllCb) {
      selectAllCb.checked = totalCount > 0 && selectedCount === totalCount;
      selectAllCb.indeterminate = selectedCount > 0 && selectedCount < totalCount;
      selectAllText.textContent = selectAllCb.checked ? 'BATAL PILIH' : 'PILIH SEMUA';
    }

    downloadAllBtn.disabled = totalCount === 0;
    downloadSelectedBtn.disabled = selectedCount === 0;

    // Render cards
    if (totalCount === 0) {
      gallery.innerHTML = `
        <div class="grabpic-empty-state">
          <div class="grabpic-empty-title">Belum Ada Gambar</div>
          <div class="grabpic-empty-desc">
            Generate atau upload gambar di ${platformName.toUpperCase()} untuk melihatnya di sini secara otomatis.
          </div>
        </div>
      `;
      return;
    }

    gallery.innerHTML = '';

    detectedImages.forEach((item) => {
      const card = document.createElement('div');
      card.className = `grabpic-card ${item.isSelected ? 'selected' : ''}`;
      card.setAttribute('data-shadow', item.shadowColor);
      card.setAttribute('data-id', item.id);

      card.innerHTML = `
        <div class="grabpic-card-thumb-wrap orientation-${item.orientation}">
          <input type="checkbox" class="grabpic-checkbox grabpic-card-check" data-id="${item.id}" ${item.isSelected ? 'checked' : ''} />
          <img class="grabpic-card-img" src="${item.src}" alt="Chat Pic #${item.index}" loading="lazy" />
          <button class="grabpic-card-single-dl" data-id="${item.id}" title="Download gambar ini saja">⬇</button>
        </div>
        <div class="grabpic-card-meta">
          <span class="grabpic-card-idx">#${String(item.index).padStart(2, '0')} [${item.orientation.toUpperCase()}]</span>
          <span class="grabpic-card-res">${item.width}×${item.height}</span>
        </div>
      `;

      // Klik langsung pada seluruh card untuk toggle selection
      card.addEventListener('click', (e) => {
        // Jangan toggle jika user klik tombol download single
        if (e.target.closest('.grabpic-card-single-dl')) {
          return;
        }

        item.isSelected = !item.isSelected;
        const cb = card.querySelector('.grabpic-card-check');
        if (cb) cb.checked = item.isSelected;

        if (item.isSelected) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }

        updateCountsAndButtonsOnly();
      });

      // Single download handler
      const singleDlBtn = card.querySelector('.grabpic-card-single-dl');
      singleDlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadSingleImage(item);
      });

      gallery.appendChild(card);
    });
  }

  function updateCountsAndButtonsOnly() {
    const totalCount = detectedImages.length;
    const selectedCount = detectedImages.filter((i) => i.isSelected).length;

    const totalCountEl = document.getElementById('grabpic-total-count');
    const selectedCountEl = document.getElementById('grabpic-selected-count');
    const selectAllCb = document.getElementById('grabpic-select-all-cb');
    const selectAllText = document.getElementById('grabpic-select-all-text');
    const downloadSelectedBtn = document.getElementById('grabpic-btn-download-selected');

    if (totalCountEl) totalCountEl.textContent = totalCount;
    if (selectedCountEl) selectedCountEl.textContent = selectedCount;

    if (selectAllCb) {
      selectAllCb.checked = totalCount > 0 && selectedCount === totalCount;
      selectAllCb.indeterminate = selectedCount > 0 && selectedCount < totalCount;
      selectAllText.textContent = selectAllCb.checked ? 'BATAL PILIH' : 'PILIH SEMUA';
    }

    if (downloadSelectedBtn) downloadSelectedBtn.disabled = selectedCount === 0;
  }

  /**
   * Helper to fetch image as Blob or base64 (handling CORS via fetch or Canvas fallback)
   */
  async function fetchImageBlob(url) {
    if (url.startsWith('data:')) {
      const res = await fetch(url);
      return await res.blob();
    }

    try {
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        return await response.blob();
      }
    } catch (err) {
      console.warn('[GrabPic] Direct fetch failed, trying canvas fallback:', err);
    }

    // Canvas fallback
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Image failed to load on canvas'));
      img.src = url;
    });
  }

  function getTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }

  /**
   * Download single image
   */
  async function downloadSingleImage(item) {
    showToast(`Mengunduh gambar #${item.index}...`, 'success');
    const timestamp = getTimestamp();
    const filename = `grabpic-${platformName}-${timestamp}-${String(item.index).padStart(2, '0')}.png`;

    try {
      const blob = await fetchImageBlob(item.src);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result;
        chrome.runtime.sendMessage(
          {
            action: 'DOWNLOAD_FILE',
            payload: {
              base64: base64Data,
              filename: filename,
              mimeType: blob.type || 'image/png'
            }
          },
          (response) => {
            if (response && response.success) {
              showToast(`Tersimpan: ${filename}`, 'success');
            } else {
              showToast(`Gagal: ${response?.error || 'Unknown error'}`, 'error');
            }
          }
        );
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('[GrabPic] Download single failed:', err);
      // Direct URL fallback to background
      chrome.runtime.sendMessage(
        {
          action: 'DOWNLOAD_FILE',
          payload: {
            url: item.src,
            filename: filename
          }
        },
        (response) => {
          if (response && response.success) {
            showToast(`Tersimpan: ${filename}`, 'success');
          } else {
            showToast(`Gagal mengunduh: ${err.message}`, 'error');
          }
        }
      );
    }
  }

  /**
   * Download list of images (Zip if > 1, otherwise single)
   */
  async function downloadImages(items) {
    if (!items || items.length === 0) return;

    const timestamp = getTimestamp();

    if (items.length === 1) {
      await downloadSingleImage(items[0]);
      return;
    }

    if (typeof JSZip === 'undefined') {
      showToast('Error: Library JSZip tidak ditemukan.', 'error');
      return;
    }

    showToast(`Memproses ${items.length} gambar ke ZIP...`, 'success');

    try {
      const zip = new JSZip();
      const folder = zip.folder(`grabpic-${platformName}-${timestamp}`);

      let completed = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const fileIndex = String(item.index).padStart(2, '0');
        const imgFilename = `grabpic-${platformName}-${timestamp}-${fileIndex}.png`;

        try {
          const blob = await fetchImageBlob(item.src);
          folder.file(imgFilename, blob);
          completed++;
          showToast(`Mengambil gambar (${completed}/${items.length})...`, 'success');
        } catch (error) {
          console.error(`[GrabPic] Failed to add item #${item.index} to zip:`, error);
        }
      }

      if (completed === 0) {
        showToast('Gagal memuat gambar untuk di-zip.', 'error');
        return;
      }

      showToast('Mengompresi ZIP...', 'success');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFilename = `grabpic-${platformName}-${timestamp}.zip`;

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result;
        chrome.runtime.sendMessage(
          {
            action: 'DOWNLOAD_FILE',
            payload: {
              base64: base64Data,
              filename: zipFilename,
              mimeType: 'application/zip'
            }
          },
          (response) => {
            if (response && response.success) {
              showToast(`ZIP Berhasil diunduh: ${zipFilename}`, 'success');
            } else {
              showToast(`Gagal download ZIP: ${response?.error}`, 'error');
            }
          }
        );
      };
      reader.readAsDataURL(zipBlob);
    } catch (err) {
      console.error('[GrabPic] ZIP generation error:', err);
      showToast(`Terjadi kesalahan: ${err.message}`, 'error');
    }
  }

  function showToast(message, type = 'normal') {
    const toast = document.getElementById('grabpic-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `grabpic-toast show ${type}`;

    clearTimeout(toast.__timer);
    toast.__timer = setTimeout(() => {
      toast.className = 'grabpic-toast';
    }, 3200);
  }
})();

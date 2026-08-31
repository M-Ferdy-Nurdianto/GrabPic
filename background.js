/**
 * GrabPic Background Service Worker (Manifest V3)
 * Handles downloading single images and ZIP archive packages.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'DOWNLOAD_FILE') {
    handleDownload(message.payload)
      .then((downloadId) => {
        sendResponse({ success: true, downloadId });
      })
      .catch((error) => {
        console.error('[GrabPic] Download error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

// Trigger GrabPic drawer when extension icon is clicked in toolbar/extensions menu
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_DRAWER' }).catch((err) => {
      console.warn('[GrabPic] Tab message failed:', err);
    });
  }
});

async function handleDownload({ url, filename, base64, mimeType }) {
  let downloadUrl = url;

  // If base64 data is provided directly
  if (base64) {
    downloadUrl = base64.startsWith('data:')
      ? base64
      : `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
  }

  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: downloadUrl,
        filename: filename,
        saveAs: false,
        conflictAction: 'uniquify'
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (downloadId === undefined) {
          reject(new Error('Download failed to start.'));
        } else {
          resolve(downloadId);
        }
      }
    );
  });
}

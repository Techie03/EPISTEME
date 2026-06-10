// Episteme Extension Service Worker (background.js)

logger("Episteme background service worker initialized.");

function logger(msg) {
  console.log(`[Episteme Background] ${msg}`);
}

// Default to local backend – the HF Space may be running an older version
// that is missing newer routes (/api/explain, /api/compare, etc.)
const DEFAULT_BACKEND = "http://127.0.0.1:8000";

// 1. Listen for clicks on the extension toolbar icon
chrome.action.onClicked.addListener((tab) => {
  logger(`Extension icon clicked on tab: ${tab.id}. Toggling sidebar...`);
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" }, (response) => {
      // If content script is not yet injected/active, log it
      if (chrome.runtime.lastError) {
        logger("Sidebar content script not active on this tab: " + chrome.runtime.lastError.message);
      }
    });
  }
});

// 2. Listen for messages from content scripts or sidebar iframe
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger(`Received message of type: ${request.type}`);

  if (request.type === "analyze_paper_req") {
    chrome.storage.local.get("backendUrl", (stored) => {
      const baseUrl = stored.backendUrl || DEFAULT_BACKEND;
      const backendUrl = `${baseUrl.replace(/\/$/, "")}/api/analyze`;
      
      logger(`Relaying analysis request to backend: ${backendUrl}`);
      
      fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request.payload)
      })
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`API error (${response.status}): ${text}`);
            });
          }
          return response.json();
        })
        .then(data => {
          logger("Analysis successful. Sending response back.");
          sendResponse({ success: true, data: data });
        })
        .catch(err => {
          logger(`Error during analysis: ${err.message}`);
          sendResponse({ success: false, error: err.message });
        });
    });
    return true; // Keep message channel open for async response
  }

  if (request.type === "chat_req") {
    chrome.storage.local.get("backendUrl", (stored) => {
      const baseUrl = stored.backendUrl || DEFAULT_BACKEND;
      const backendUrl = `${baseUrl.replace(/\/$/, "")}/api/chat`;
      
      fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request.payload)
      })
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`API error (${response.status}): ${text}`);
            });
          }
          return response.json();
        })
        .then(data => sendResponse({ success: true, data: data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }

  if (request.type === "explain_req") {
    chrome.storage.local.get("backendUrl", (stored) => {
      const baseUrl = stored.backendUrl || DEFAULT_BACKEND;
      const backendUrl = `${baseUrl.replace(/\/$/, "")}/api/explain`;
      
      fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request.payload)
      })
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`API error (${response.status}): ${text}`);
            });
          }
          return response.json();
        })
        .then(data => sendResponse({ success: true, data: data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }

  if (request.type === "get_history_req") {
    chrome.storage.local.get("backendUrl", (stored) => {
      const baseUrl = stored.backendUrl || DEFAULT_BACKEND;
      const backendUrl = `${baseUrl.replace(/\/$/, "")}/api/history`;
      
      fetch(backendUrl)
        .then(response => response.json())
        .then(data => sendResponse({ success: true, data: data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }

  if (request.type === "compare_req") {
    chrome.storage.local.get("backendUrl", (stored) => {
      const baseUrl = stored.backendUrl || DEFAULT_BACKEND;
      const backendUrl = `${baseUrl.replace(/\/$/, "")}/api/compare`;
      
      fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request.payload)
      })
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`API error (${response.status}): ${text}`);
            });
          }
          return response.json();
        })
        .then(data => sendResponse({ success: true, data: data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }
});

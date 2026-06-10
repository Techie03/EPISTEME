// Episteme Extension Service Worker (background.js)

logger("Episteme background service worker initialized.");

function logger(msg) {
  console.log(`[Episteme Background] ${msg}`);
}

// Default cloud backend (Base64 encoded to deter simple scraper scripts and exploiters)
const DEFAULT_BACKEND = atob("aHR0cHM6Ly9uaXNoaXRoMzc0LWVwaXN0ZW1lLWJhY2tlbmQuaGYuc3BhY2U=");

// dynamic token generator using Web Crypto API
async function generateAuthToken() {
  const SECRET_SALT = "EpistemeSecureSalt2026";
  const now = Math.floor(Date.now() / 60000); // changes every minute
  const message = `${now}:${SECRET_SALT}`;
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// generic backend request relay
async function callBackend(apiPath, method, payload, sendResponse) {
  try {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get("backendUrl", resolve);
    });
    
    const baseUrl = stored.backendUrl || DEFAULT_BACKEND;
    const backendUrl = `${baseUrl.replace(/\/$/, "")}${apiPath}`;
    
    const headers = {};
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
    }
    
    // Inject secure auth token if calling the pre-configured default backend
    if (baseUrl === DEFAULT_BACKEND) {
      const token = await generateAuthToken().catch(() => null);
      if (token) {
        headers["X-Episteme-Auth-Token"] = token;
      }
    }
    
    const fetchOptions = {
      method: method,
      headers: headers
    };
    if (payload) {
      fetchOptions.body = JSON.stringify(payload);
    }
    
    logger(`Relaying ${method} request to backend: ${backendUrl}`);
    const response = await fetch(backendUrl, fetchOptions);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error (${response.status}): ${text}`);
    }
    const data = await response.json();
    sendResponse({ success: true, data: data });
  } catch (err) {
    logger(`Error calling backend ${apiPath}: ${err.message}`);
    sendResponse({ success: false, error: err.message });
  }
}

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
    callBackend("/api/analyze", "POST", request.payload, sendResponse);
    return true; // Keep message channel open for async response
  }

  if (request.type === "chat_req") {
    callBackend("/api/chat", "POST", request.payload, sendResponse);
    return true;
  }

  if (request.type === "explain_req") {
    callBackend("/api/explain", "POST", request.payload, sendResponse);
    return true;
  }

  if (request.type === "get_history_req") {
    callBackend("/api/history", "GET", null, sendResponse);
    return true;
  }

  if (request.type === "compare_req") {
    callBackend("/api/compare", "POST", request.payload, sendResponse);
    return true;
  }

  if (request.type === "clear_history_req") {
    callBackend("/api/history", "DELETE", null, sendResponse);
    return true;
  }

  if (request.type === "get_paper_req") {
    callBackend(`/api/paper/${request.payload.paperId}`, "GET", null, sendResponse);
    return true;
  }

  if (request.type === "design_protocol_req") {
    callBackend("/api/experiment/plan", "POST", request.payload, sendResponse);
    return true;
  }
});

// Episteme Content Script (content.js)

console.log("[Episteme] Content script injected.");

let sidebarIframe = null;
let launchButton = null;

// 1. Detect if this page is a scientific research paper
function detectPaperMetadata() {
  const metadata = {
    title: "",
    doi: "",
    arxiv_id: "",
    authors: [],
    journal: "",
    raw_text: ""
  };

  // Detect via standard academic meta tags
  const titleTag = document.querySelector('meta[name="citation_title"]') || document.querySelector('meta[property="og:title"]');
  metadata.title = titleTag ? titleTag.getAttribute("content") : document.title;

  const doiTag = document.querySelector('meta[name="citation_doi"]') || document.querySelector('meta[name="dc.identifier"]');
  if (doiTag) {
    metadata.doi = doiTag.getAttribute("content");
  }

  const arxivTag = document.querySelector('meta[name="citation_arxiv_id"]');
  if (arxivTag) {
    metadata.arxiv_id = arxivTag.getAttribute("content");
  } else {
    // Check URL pattern for arXiv
    const match = window.location.href.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
    if (match) {
      metadata.arxiv_id = match[1];
    }
  }

  // Fallback DOI detection in DOM text
  if (!metadata.doi) {
    const doiRegex = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i;
    const match = document.body.innerText.match(doiRegex);
    if (match) {
      metadata.doi = match[0];
    }
  }

  // Authors extraction
  const authorTags = document.querySelectorAll('meta[name="citation_author"]');
  authorTags.forEach(tag => {
    metadata.authors.push(tag.getAttribute("content"));
  });

  // Extract body text content (cleaned of scripts and navigation)
  // Clone body to manipulate without altering live UI
  const bodyClone = document.body.cloneNode(true);
  const elementsToRemove = bodyClone.querySelectorAll("script, style, nav, footer, header, noscript, iframe");
  elementsToRemove.forEach(el => el.remove());
  
  // Extract up to 60,000 characters of clean text
  metadata.raw_text = bodyClone.innerText
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60000);

  return metadata;
}

// 2. Inject the Launcher Button in the bottom-right corner
function injectLaunchButton() {
  if (document.getElementById("episteme-launcher")) return;

  launchButton = document.createElement("button");
  launchButton.id = "episteme-launcher";
  launchButton.innerHTML = `
    <span class="episteme-logo">🔬</span>
    <span class="episteme-text">Verify with Episteme</span>
  `;
  
  document.body.appendChild(launchButton);
  
  launchButton.addEventListener("click", () => {
    toggleSidebar();
  });
}

// 3. Create and inject the Sidebar Iframe
function injectSidebar() {
  if (document.getElementById("episteme-sidebar-container")) return;

  const container = document.createElement("div");
  container.id = "episteme-sidebar-container";
  container.className = "episteme-closed";
  
  sidebarIframe = document.createElement("iframe");
  sidebarIframe.id = "episteme-sidebar-iframe";
  sidebarIframe.src = chrome.runtime.getURL("index.html");
  sidebarIframe.setAttribute("frameborder", "0");
  
  container.appendChild(sidebarIframe);
  document.body.appendChild(container);
}

function toggleSidebar() {
  const container = document.getElementById("episteme-sidebar-container");
  if (!container) {
    injectSidebar();
    setTimeout(toggleSidebar, 100);
    return;
  }

  if (container.classList.contains("episteme-closed")) {
    container.classList.remove("episteme-closed");
    container.classList.add("episteme-open");
    if (launchButton) {
      launchButton.classList.add("launcher-hidden");
    }
  } else {
    container.classList.remove("episteme-open");
    container.classList.add("episteme-closed");
    if (launchButton) {
      launchButton.classList.remove("launcher-hidden");
    }
  }
}

function fallbackCopy(text) {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      console.log("[Episteme] Fallback copy successful from content script.");
    } else {
      console.error("[Episteme] Fallback copy command unsuccessful.");
    }
  } catch (err) {
    console.error("[Episteme] Fallback copy failed in content script: ", err);
  }
}

// 4. Handle incoming window messages from the iframe (React sidebar)
window.addEventListener("message", (event) => {
  // Ensure the message is from our extension iframe
  if (event.data && event.data.source === "episteme-sidebar") {
    if (event.data.action === "get_paper_data") {
      // Send parsed paper data back to iframe
      const paperData = detectPaperMetadata();
      if (sidebarIframe && sidebarIframe.contentWindow) {
        sidebarIframe.contentWindow.postMessage({
          source: "episteme-content",
          action: "paper_data_response",
          data: paperData
        }, "*");
      }
    } else if (event.data.action === "close_sidebar") {
      toggleSidebar();
    } else if (event.data.action === "copy_to_clipboard") {
      const textToCopy = event.data.text;
      try {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(textToCopy)
            .then(() => {
              console.log("[Episteme] Copied via navigator.clipboard from content script.");
            })
            .catch(err => {
              console.warn("[Episteme] navigator.clipboard failed in content script, trying fallback: ", err);
              fallbackCopy(textToCopy);
            });
        } else {
          fallbackCopy(textToCopy);
        }
      } catch (err) {
        console.warn("[Episteme] Direct copy failed, trying fallback: ", err);
        fallbackCopy(textToCopy);
      }
    }
  }
});

// 5. Listen for background script toggle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggle_sidebar") {
    toggleSidebar();
    sendResponse({ success: true });
  }
});

// Initialize on load
function init() {
  // Check if we are on a potential paper page or if user runs extension
  const meta = detectPaperMetadata();
  const isPaper = meta.doi || meta.arxiv_id || 
                  document.querySelector('meta[name="citation_pdf_url"]') || 
                  window.location.href.includes("arxiv.org") || 
                  window.location.href.includes("pubmed") || 
                  window.location.href.includes("nature.com");

  if (isPaper) {
    console.log("[Episteme] Academic paper detected. Injecting launcher.");
    injectLaunchButton();
    injectSidebar();
  }
}

// Run init
if (document.readyState === "complete" || document.readyState === "interactive") {
  init();
} else {
  window.addEventListener("DOMContentLoaded", init);
}

// 6. Listen for text selections to support the jargon explainer widget
document.addEventListener("mouseup", () => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 0 && selectedText.length < 500) {
    if (sidebarIframe && sidebarIframe.contentWindow) {
      sidebarIframe.contentWindow.postMessage({
        source: "episteme-content",
        action: "text_selected",
        text: selectedText
      }, "*");
    }
  }
});

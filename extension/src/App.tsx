import { useState, useEffect, useRef } from 'react';
import './App.css';

declare const chrome: any;

interface Claim {
  claim: string;
  context: string;
  category: string;
  stats_referenced?: string;
  status: string;
  explanation?: string;
  evidence_sources: any[];
}

interface BiasMeter {
  sponsor_category: string;
  bias_rating: string;
  explanation: string;
  corporate_influence_ratio: number;
}

interface IntegrityReport {
  retracted: boolean;
  retraction_details?: string;
  retracted_citations_count: number;
  retracted_citations_list: any[];
  coi_disclosure?: string;
  coi_bias_detected: boolean;
  data_availability: string;
  chart_flags: any[];
  bias_meter?: BiasMeter;
  methodology_flags?: any[];
}

interface SimilarPaper {
  title: string;
  authors: string[];
  year?: number;
  doi?: string;
  citation_count: number;
  url?: string;
  score?: number;
  abstract?: string;
}

interface Node {
  id: string;
  label: string;
  type: string;
  details: string;
  status?: string;
  x: number;
  y: number;
  size: number;
}

interface Link {
  source: string;
  target: string;
  label: string;
}

interface PeerReviewReport {
  strengths: string[];
  weaknesses: string[];
  questions_for_authors: string[];
  recommendation: string;
}

interface TimelineEvent {
  year: number;
  title: string;
  authors: string[];
  relationship: string;
  claim_mutation: string;
}

interface AuthorProfile {
  name: string;
  affiliation: string;
  h_index: number;
  co_authors: string[];
  top_papers: { title: string; year: number; citations: number }[];
}

interface NoteHighlight {
  id: string;
  text: string;
  note: string;
  savedAt: string;
  paperTitle?: string;
}

interface AnalysisResult {
  doi?: string;
  arxiv_id?: string;
  title: string;
  claims: Claim[];
  integrity_report?: IntegrityReport;
  research_gaps: string[];
  hypotheses: any[];
  benchmarks: any[];
  similar_papers: SimilarPaper[];
  stats_anomalies: any[];
  concept_map_nodes: Node[];
  concept_map_links: Link[];
  peer_review?: PeerReviewReport;
  evolution_timeline?: TimelineEvent[];
  replication_repos?: any[];
  complexity?: any;
  related_videos?: any[];
  author_network?: AuthorProfile[];
}

const DEFAULT_BACKEND = 'https://nishith374-episteme-backend.hf.space';

async function generateAuthToken(): Promise<string> {
  const SECRET_SALT = "EpistemeSecureSalt2026";
  const now = Math.floor(Date.now() / 60000); // changes every minute
  const message = `${now}:${SECRET_SALT}`;
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

const fetchWithAuth = async (url: string, options: any = {}): Promise<Response> => {
  const cleanUrl = url.trim();
  const isDefaultBackend = cleanUrl.includes(DEFAULT_BACKEND) || cleanUrl.includes('nishith374-episteme-backend.hf.space');
  
  const headers = options.headers || {};
  if (isDefaultBackend) {
    try {
      const token = await generateAuthToken();
      headers['X-Episteme-Auth-Token'] = token;
    } catch (e) {
      console.error("Failed to generate auth token:", e);
    }
  }
  options.headers = headers;
  return fetch(url, options);
};

const renderFormattedMessage = (content: string) => {
  if (!content) return null;
  
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let keyCounter = 0;

  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    const boldParts = text.split(/\*\*([^*]+)\*\*/g);
    return boldParts.map((part, bIdx) => {
      if (bIdx % 2 !== 0) {
        return <strong key={`b-${bIdx}`}>{parseItalics(part)}</strong>;
      }
      return parseItalics(part);
    });
  };

  const parseItalics = (text: string): React.ReactNode => {
    const italicParts = text.split(/\*([^*]+)\*/g);
    if (italicParts.length === 1) return text;
    return (
      <>
        {italicParts.map((part, iIdx) => {
          if (iIdx % 2 !== 0) {
            return <em key={`i-${iIdx}`}>{part}</em>;
          }
          return part;
        })}
      </>
    );
  };

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${keyCounter++}`} style={{ margin: '8px 0', paddingLeft: '20px', listStyleType: 'disc' }}>
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushList();
      continue;
    }
    const isBullet = line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ');
    if (isBullet) {
      const cleanLine = line.substring(2);
      currentList.push(
        <li key={`li-${keyCounter++}`} style={{ marginBottom: '4px', lineHeight: '1.4' }}>
          {parseInlineMarkdown(cleanLine)}
        </li>
      );
    } else {
      flushList();
      elements.push(
        <p key={`p-${keyCounter++}`} style={{ margin: '0 0 10px 0', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
          {parseInlineMarkdown(lines[i])}
        </p>
      );
    }
  }
  flushList();
  return <div style={{ display: 'flex', flexDirection: 'column' }}>{elements}</div>;
};

export default function App() {
  const [paperData, setPaperData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('claims');
  const [expandedClaim, setExpandedClaim] = useState<number | null>(null);
  
  // History tab states
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Interactive Map Canvas states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  // Settings & Configuration states
  const [backendUrl, setBackendUrl] = useState<string>('https://nishith374-episteme-backend.hf.space');
  const [settingsUrlInput, setSettingsUrlInput] = useState<string>('Default (Cloud)');
  const [backendStatus, setBackendStatus] = useState<'Checking...' | 'Online' | 'Offline'>('Checking...');

  // Chatbot states
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Hello! I am Episteme, your research intelligence assistant. Ask me anything about this paper!' }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Audio briefing states
  const [audioState, setAudioState] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Jargon explainer states
  const [selectedText, setSelectedText] = useState<string>('');
  const [jargonExplanation, setJargonExplanation] = useState<string>('');
  const [explainingLoading, setExplainingLoading] = useState<boolean>(false);

  // Citation exporter states
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Like and theme states
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likedPapersList, setLikedPapersList] = useState<string[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Carousel slide deck states
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  // Statistical calculator states
  const [powerN, setPowerN] = useState<number>(50);
  const [powerD, setPowerD] = useState<number>(0.5);
  const [powerAlpha, setPowerAlpha] = useState<number>(0.05);

  // Evolution timeline toggles
  const [mapViewMode, setMapViewMode] = useState<'graph' | 'timeline' | 'authors'>('graph');

  // History comparison states
  const [selectedHistoryPapers, setSelectedHistoryPapers] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState<boolean>(false);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);

  // Experiment Copilot states
  const [protocolLoading, setProtocolLoading] = useState<boolean>(false);
  const [protocolContent, setProtocolContent] = useState<string>('');
  const [showProtocolModal, setShowProtocolModal] = useState<boolean>(false);
  const [activeHypothesisName, setActiveHypothesisName] = useState<string>('');

  // Research Notebook & Highlighter states
  const [highlights, setHighlights] = useState<NoteHighlight[]>([]);
  const [noteInput, setNoteInput] = useState<string>('');
  const [notebookPaperFilter, setNotebookPaperFilter] = useState<string>('');

  // Copy to clipboard helper that uses fallback for extensions
  const copyToClipboard = async (text: string): Promise<boolean> => {
    // 1. Post a message to parent window (content.js running in host page context)
    try {
      window.parent.postMessage({
        source: 'episteme-sidebar',
        action: 'copy_to_clipboard',
        text: text
      }, '*');
    } catch (err) {
      console.warn("Failed to post message to parent window for clipboard copy", err);
    }

    // 2. Also try standard navigator.clipboard locally just in case it works
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed locally, relying on parent postMessage fallback", err);
    }

    // 3. Local DOM fallback
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
      if (successful) return true;
    } catch (err) {
      console.error("Local fallback copy failed", err);
    }
    return true; // Return true as parent postMessage acts as primary copy handler
  };

  // Load theme and liked papers on mount
  useEffect(() => {
    const loadPreferences = async () => {
      let savedTheme = 'dark';
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['theme', 'likedPapers'], (result: any) => {
          savedTheme = result.theme || 'dark';
          setTheme(savedTheme as 'dark' | 'light');
          if (savedTheme === 'light') {
            document.body.classList.add('theme-light');
          } else {
            document.body.classList.remove('theme-light');
          }
          setLikedPapersList(result.likedPapers || []);
        });
      } else {
        savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme as 'dark' | 'light');
        if (savedTheme === 'light') {
          document.body.classList.add('theme-light');
        } else {
          document.body.classList.remove('theme-light');
        }
        const liked = JSON.parse(localStorage.getItem('likedPapers') || '[]');
        setLikedPapersList(liked);
      }
    };
    loadPreferences();

    // Load saved highlights/notes from localStorage
    try {
      const savedHighlights = JSON.parse(localStorage.getItem('episteme_highlights') || '[]');
      setHighlights(savedHighlights);
    } catch {
      setHighlights([]);
    }
  }, []);

  // Helper: persist highlights to localStorage
  const saveHighlightsToStorage = (newHighlights: NoteHighlight[]) => {
    localStorage.setItem('episteme_highlights', JSON.stringify(newHighlights));
    setHighlights(newHighlights);
  };

  // Save a jargon selection + optional note to the notebook
  const saveToNotes = (text: string, note: string = '') => {
    const entry: NoteHighlight = {
      id: Date.now().toString(),
      text,
      note,
      savedAt: new Date().toLocaleString(),
      paperTitle: paperData?.title || analysisResult?.title || ''
    };
    const updated = [entry, ...highlights];
    saveHighlightsToStorage(updated);
  };

  // Export highlights as Obsidian-compatible Markdown file
  const exportNotebookMarkdown = () => {
    if (highlights.length === 0) return;
    const sections = highlights.map(h => {
      const lines = [
        `## 📌 Highlight`,
        h.paperTitle ? `**Paper:** ${h.paperTitle}` : '',
        `**Saved:** ${h.savedAt}`,
        ``,
        h.text !== '[Manual Note]' ? `> ${h.text}` : '',
        h.note ? `**Note:** ${h.note}` : '',
        ``,
        `---`
      ].filter(Boolean);
      return lines.join('\n');
    });
    const md = [`# Episteme Research Notebook`, `> Exported: ${new Date().toLocaleString()}`, ``, ...sections].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `episteme-notebook-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sync like state when paperData or analysisResult changes
  useEffect(() => {
    if (!paperData) {
      setIsLiked(false);
      return;
    }
    const paperId = analysisResult?.doi 
      ? `doi_${analysisResult.doi.trim().replace(/\//g, '_').replace(/\\/g, '_')}` 
      : paperData.title;

    const checkLiked = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('likedPapers', (result: any) => {
          const liked = result.likedPapers || [];
          setIsLiked(liked.includes(paperId));
        });
      } else {
        const liked = JSON.parse(localStorage.getItem('likedPapers') || '[]');
        setIsLiked(liked.includes(paperId));
      }
    };
    checkLiked();
  }, [paperData, analysisResult]);

  // Sync liked papers list whenever isLiked state changes or activeTab becomes memory
  const fetchLikedPapers = () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('likedPapers', (result: any) => {
        setLikedPapersList(result.likedPapers || []);
      });
    } else {
      const liked = JSON.parse(localStorage.getItem('likedPapers') || '[]');
      setLikedPapersList(liked);
    }
  };

  useEffect(() => {
    if (activeTab === 'memory' || activeTab === 'notebook' || activeTab === 'claims' || activeTab === 'integrity') {
      fetchLikedPapers();
    }
  }, [activeTab, isLiked]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ theme: nextTheme });
    } else {
      localStorage.setItem('theme', nextTheme);
    }
  };

  const toggleLike = () => {
    if (!paperData) return;
    const paperId = analysisResult?.doi 
      ? `doi_${analysisResult.doi.trim().replace(/\//g, '_').replace(/\\/g, '_')}` 
      : paperData.title;
      
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('likedPapers', (result: any) => {
        const liked = result.likedPapers || [];
        let updated = [];
        if (nextLiked) {
          updated = [...liked, paperId];
        } else {
          updated = liked.filter((id: string) => id !== paperId);
        }
        chrome.storage.local.set({ likedPapers: updated }, () => {
          setLikedPapersList(updated);
        });
      });
    } else {
      const liked = JSON.parse(localStorage.getItem('likedPapers') || '[]');
      let updated = [];
      if (nextLiked) {
        updated = [...liked, paperId];
      } else {
        updated = liked.filter((id: string) => id !== paperId);
      }
      localStorage.setItem('likedPapers', JSON.stringify(updated));
      setLikedPapersList(updated);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  const handleSendMessage = () => {
    if (!chatInput.trim() || chatLoading || !paperData) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    const msgLower = userMsg.toLowerCase();
    if (msgLower.includes('who is developer') || msgLower.includes('who is nishith') || msgLower.includes('who created episteme') || msgLower.includes('who made episteme') || msgLower.includes('who is the developer') || msgLower.includes('who developed this')) {
      setTimeout(() => {
        setChatLoading(false);
        setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Nishith is the developer of Episteme.' }]);
      }, 500);
      return;
    }

    const payload = {
      title: paperData.title,
      raw_text: paperData.raw_text,
      message: userMsg,
      history: chatMessages.filter(m => m.content !== 'Hello! I am Episteme, your research intelligence assistant. Ask me anything about this paper!')
    };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'chat_req',
        payload: payload
      }, (response: any) => {
        setChatLoading(false);
        if (response && response.success) {
          setChatMessages((prev) => [...prev, { role: 'assistant', content: response.data.response }]);
        } else {
          setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${response ? response.error : 'Connection failed. Please check backend settings.'}` }]);
        }
      });
    } else {
      // Direct local fetch fallback
      const cleanUrl = backendUrl.trim().replace(/\/$/, "");
      fetchWithAuth(`${cleanUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => {
          if (!res.ok) throw new Error('API server error');
          return res.json();
        })
        .then(data => {
          setChatLoading(false);
          setChatMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
        })
        .catch(err => {
          setChatLoading(false);
          setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
        });
    }
  };

  // Ping backend health
  const checkHealth = async (url: string) => {
    setBackendStatus('Checking...');
    let checkUrl = url;
    if (!url || url.toLowerCase() === 'default (cloud)' || url.toLowerCase() === 'default') {
      checkUrl = 'https://nishith374-episteme-backend.hf.space';
    }
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const cleanUrl = checkUrl.trim().replace(/\/$/, "");
      const res = await fetchWithAuth(`${cleanUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(id);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'healthy') {
          setBackendStatus('Online');
          return;
        }
      }
      setBackendStatus('Offline');
    } catch (e) {
      setBackendStatus('Offline');
    }
  };

  // Check health on settings load
  useEffect(() => {
    if (activeTab === 'settings') {
      checkHealth(backendUrl);
    }
  }, [activeTab, backendUrl]);

  // 1. Initial Handshake with content script
  useEffect(() => {
    // Load config on mount
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('backendUrl', (stored: any) => {
        const url = stored.backendUrl || 'https://nishith374-episteme-backend.hf.space';
        setBackendUrl(url);
        if (url === 'https://nishith374-episteme-backend.hf.space') {
          setSettingsUrlInput('Default (Cloud)');
        } else {
          setSettingsUrlInput(url);
        }
      });
    } else {
      const url = localStorage.getItem('backendUrl') || 'https://nishith374-episteme-backend.hf.space';
      setBackendUrl(url);
      if (url === 'https://nishith374-episteme-backend.hf.space') {
        setSettingsUrlInput('Default (Cloud)');
      } else {
        setSettingsUrlInput(url);
      }
    }

    const handleWindowMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (msg && msg.source === 'episteme-content') {
        if (msg.action === 'paper_data_response') {
          console.log('[Episteme Sidebar] Received paper data:', msg.data);
          setPaperData(msg.data);
          
            // Check local browser cache first
            checkLocalCache(msg.data.title, msg.data.doi);
          } else if (msg.action === 'text_selected') {
            console.log('[Episteme Sidebar] Text selected:', msg.text);
            setSelectedText(msg.text);
            setJargonExplanation('');
          }
        }
      };

      window.addEventListener('message', handleWindowMessage);
      
      // Request paper data
      window.parent.postMessage({
        source: 'episteme-sidebar',
        action: 'get_paper_data'
      }, '*');

      return () => {
        window.removeEventListener('message', handleWindowMessage);
      };
    }, [backendUrl]);

    const hashString = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    };

    const checkLocalCache = (title: string, doi?: string) => {
      const paperId = doi 
        ? `doi_${doi.trim().replace(/\//g, '_').replace(/\\/g, '_')}` 
        : `title_${Math.abs(hashString(title)).toString(16)}`;

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('episteme_paper_' + paperId, (stored: any) => {
          const result = stored['episteme_paper_' + paperId];
          if (result) {
            console.log('[Episteme] Found cached verification locally:', result);
            setAnalysisResult(result);
          } else {
            checkCache(backendUrl, title, doi);
          }
        });
      } else {
        const stored = localStorage.getItem('episteme_paper_' + paperId);
        if (stored) {
          console.log('[Episteme] Found cached verification locally:', stored);
          setAnalysisResult(JSON.parse(stored));
        } else {
          checkCache(backendUrl, title, doi);
        }
      }
    };

    // Check backend cache first (fallback)
    const checkCache = async (baseUrl: string, title: string, doi?: string) => {
      let paperId = doi 
        ? `doi_${doi.trim().replace(/\//g, '_').replace(/\\/g, '_')}` 
        : `title_${Math.abs(hashString(title)).toString(16)}`;

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'get_paper_req',
          payload: { paperId: paperId }
        }, (response: any) => {
          if (response && response.success) {
            setAnalysisResult(response.data);
            savePaperToLocalHistory(response.data);
          }
        });
      } else {
        try {
          const cleanUrl = baseUrl.trim().replace(/\/$/, "");
          const response = await fetchWithAuth(`${cleanUrl}/api/paper/${paperId}`);
          if (response.ok) {
            const data = await response.json();
            setAnalysisResult(data);
            savePaperToLocalHistory(data);
          }
        } catch (e) {
          console.log('Cache miss or backend offline. User needs to trigger analysis.');
        }
      }
    };

    const savePaperToLocalHistory = async (result: AnalysisResult) => {
      if (!result) return;
      const paperId = result.doi 
        ? `doi_${result.doi.trim().replace(/\//g, '_').replace(/\\/g, '_')}` 
        : `title_${Math.abs(hashString(result.title)).toString(16)}`;

      const newHistoryItem = {
        id: paperId,
        title: result.title,
        doi: result.doi,
        arxiv_id: result.arxiv_id,
        savedAt: new Date().toLocaleString()
      };

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('episteme_history', (stored: any) => {
          const history = stored.episteme_history || [];
          const filtered = history.filter((item: any) => item.id !== paperId);
          const updatedHistory = [newHistoryItem, ...filtered];
          
          chrome.storage.local.set({
            ['episteme_paper_' + paperId]: result,
            'episteme_history': updatedHistory
          }, () => {
            setHistoryList(updatedHistory);
          });
        });
      } else {
        const history = JSON.parse(localStorage.getItem('episteme_history') || '[]');
        const filtered = history.filter((item: any) => item.id !== paperId);
        const updatedHistory = [newHistoryItem, ...filtered];
        
        localStorage.setItem('episteme_history', JSON.stringify(updatedHistory));
        localStorage.setItem('episteme_paper_' + paperId, JSON.stringify(result));
        setHistoryList(updatedHistory);
      }
    };

  // Fetch analysis from FastAPI via Chrome runtime message relay (bypassing CSP)
  const handleAnalyze = (forceRefresh: boolean = false) => {
    if (!paperData) return;
    
    setLoading(true);
    setLoadingStep('Extracting research claims...');
    
    const steps = [
      'Extracting research claims...',
      'Searching Semantic Scholar & OpenAlex APIs...',
      'Running CrossRef & Retraction Watch scans...',
      'Synthesizing SOTA benchmarks & metrics...',
      'Compiling research connection map...'
    ];
    
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setLoadingStep(steps[stepIdx]);
      }
    }, 2500);

    // Call background service worker to fetch analysis (handles CORS and CSP)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'analyze_paper_req',
        payload: {
          title: paperData.title,
          raw_text: paperData.raw_text,
          doi: paperData.doi,
          arxiv_id: paperData.arxiv_id,
          force_refresh: forceRefresh
        }
      }, (response: any) => {
        clearInterval(interval);
        setLoading(false);
        if (response && response.success) {
          setAnalysisResult(response.data);
          savePaperToLocalHistory(response.data);
          setActiveTab('claims');
        } else {
          alert(`Analysis Failed: ${response ? response.error : 'Service Offline'}`);
        }
      });
    } else {
      // Direct local fetch fallback for direct browser debugging
      const cleanUrl = backendUrl.trim().replace(/\/$/, "");
      fetchWithAuth(`${cleanUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: paperData.title,
          raw_text: paperData.raw_text,
          doi: paperData.doi,
          arxiv_id: paperData.arxiv_id,
          force_refresh: forceRefresh
        })
      })
        .then(res => {
          if (!res.ok) throw new Error('Backend server returned an error.');
          return res.json();
        })
        .then(data => {
          clearInterval(interval);
          setLoading(false);
          setAnalysisResult(data);
          savePaperToLocalHistory(data);
          setActiveTab('claims');
        })
        .catch(err => {
          clearInterval(interval);
          setLoading(false);
          alert(`Analysis Failed (Direct fetch fallback): ${err.message}`);
        });
    }
  };

  const handleDeleteHistory = async () => {
    if (!window.confirm("Are you sure you want to clear all history and verification cache? This action cannot be undone.")) {
      return;
    }
    
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('episteme_history', (stored: any) => {
          const history = stored.episteme_history || [];
          const keysToRemove = history.map((item: any) => 'episteme_paper_' + item.id);
          keysToRemove.push('episteme_history');
          keysToRemove.push('likedPapers');
          chrome.storage.local.remove(keysToRemove, () => {
            setHistoryList([]);
            setAnalysisResult(null);
            setLikedPapersList([]);
            setSelectedHistoryPapers([]);
            alert("History cleared successfully from browser local storage!");
          });
        });
      } else {
        const history = JSON.parse(localStorage.getItem('episteme_history') || '[]');
        history.forEach((item: any) => {
          localStorage.removeItem('episteme_paper_' + item.id);
        });
        localStorage.removeItem('episteme_history');
        localStorage.removeItem('likedPapers');
        setHistoryList([]);
        setAnalysisResult(null);
        setLikedPapersList([]);
        setSelectedHistoryPapers([]);
        alert("History cleared successfully from browser local storage!");
      }
      
      // Inform backend to clean any transient caches if offline/online
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'clear_history_req' }, (response: any) => {
          if (response && response.success) {
            console.log("Backend history cleared successfully via service worker.");
          } else {
            console.warn("Failed to clear backend history via service worker:", response?.error);
          }
        });
      } else {
        const cleanUrl = backendUrl.trim().replace(/\/$/, "");
        fetchWithAuth(`${cleanUrl}/api/history`, { method: 'DELETE' }).catch(() => {});
      }
    } catch (e: any) {
      alert(`Error clearing history: ${e.message}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedHistoryPapers.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedHistoryPapers.length} selected paper(s) from history and cache?`)) {
      return;
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('episteme_history', (stored: any) => {
          const history = stored.episteme_history || [];
          const updatedHistory = history.filter((item: any) => !selectedHistoryPapers.includes(item.id));
          const keysToRemove = selectedHistoryPapers.map((id) => 'episteme_paper_' + id);
          
          chrome.storage.local.remove(keysToRemove, () => {
            chrome.storage.local.set({ episteme_history: updatedHistory }, () => {
              setHistoryList(updatedHistory);
              setSelectedHistoryPapers([]);
              
              // If current verified paper was deleted, clear its analysisResult
              const currentPaperId = analysisResult?.doi 
                ? `doi_${analysisResult.doi.trim().replace(/\//g, '_').replace(/\\/g, '_')}` 
                : (paperData ? `title_${Math.abs(hashString(paperData.title)).toString(16)}` : '');
              if (selectedHistoryPapers.includes(currentPaperId)) {
                setAnalysisResult(null);
              }
              alert("Selected paper(s) deleted successfully!");
            });
          });
        });
      } else {
        const history = JSON.parse(localStorage.getItem('episteme_history') || '[]');
        const updatedHistory = history.filter((item: any) => !selectedHistoryPapers.includes(item.id));
        selectedHistoryPapers.forEach((id) => {
          localStorage.removeItem('episteme_paper_' + id);
        });
        localStorage.setItem('episteme_history', JSON.stringify(updatedHistory));
        setHistoryList(updatedHistory);
        setSelectedHistoryPapers([]);
        
        const currentPaperId = analysisResult?.doi 
          ? `doi_${analysisResult.doi.trim().replace(/\//g, '_').replace(/\\/g, '_')}` 
          : (paperData ? `title_${Math.abs(hashString(paperData.title)).toString(16)}` : '');
        if (selectedHistoryPapers.includes(currentPaperId)) {
          setAnalysisResult(null);
        }
        alert("Selected paper(s) deleted successfully!");
      }
    } catch (e: any) {
      alert(`Error deleting selected papers: ${e.message}`);
    }
  };

  const handleReloadExtension = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.reload) {
      if (window.confirm("This will reload the extension and refresh the current page to start a fresh verification session. Continue?")) {
        window.parent.postMessage({
          source: 'episteme-sidebar',
          action: 'reload_page'
        }, '*');
        
        setTimeout(() => {
          chrome.runtime.reload();
        }, 150);
      }
    } else {
      if (window.confirm("Reload this page for a fresh verification session?")) {
        window.location.reload();
      }
    }
  };

  // Fetch History List from local storage
  const fetchHistory = async (query?: string) => {
    const filterHistory = (items: any[]) => {
      if (!query) return items;
      const q = query.toLowerCase();
      return items.filter((item: any) => 
        item.title.toLowerCase().includes(q) || 
        (item.doi && item.doi.toLowerCase().includes(q)) || 
        (item.arxiv_id && item.arxiv_id.toLowerCase().includes(q))
      );
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('episteme_history', (stored: any) => {
        const history = stored.episteme_history || [];
        setHistoryList(filterHistory(history));
      });
    } else {
      const history = JSON.parse(localStorage.getItem('episteme_history') || '[]');
      setHistoryList(filterHistory(history));
    }
  };

  useEffect(() => {
    if (activeTab === 'memory') {
      fetchHistory(searchQuery);
    }
  }, [activeTab, searchQuery]);

  const loadHistoricalPaper = async (paperId: string) => {
    setLoading(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('episteme_paper_' + paperId, (stored: any) => {
          const result = stored['episteme_paper_' + paperId];
          if (result) {
            setAnalysisResult(result);
            setActiveTab('claims');
          } else {
            alert("Error: Paper analysis not found in local storage.");
          }
          setLoading(false);
        });
      } else {
        const stored = localStorage.getItem('episteme_paper_' + paperId);
        if (stored) {
          setAnalysisResult(JSON.parse(stored));
          setActiveTab('claims');
        } else {
          alert("Error: Paper analysis not found in local storage.");
        }
        setLoading(false);
      }
    } catch (e: any) {
      console.error(e);
      alert("Failed to load historical paper: " + e.message);
      setLoading(false);
    }
  };


  // Speech synthesis podcast briefing methods
  const generateBriefingScript = () => {
    if (!analysisResult) return "";
    const title = analysisResult.title || paperData?.title || "this research paper";
    const claims = analysisResult.claims || [];
    const anomalies = analysisResult.stats_anomalies || [];
    const gaps = analysisResult.research_gaps || [];
    const hypotheses = analysisResult.hypotheses || [];
    
    let script = `Episteme briefing for the research paper: ${title}. `;
    if (claims.length > 0) {
      script += `The core claims extracted are: `;
      claims.forEach((c, idx) => {
        script += `Claim ${idx + 1}: ${c.claim} (Verification status: ${c.status}). `;
      });
    }
    if (anomalies.length > 0) {
      script += `Regarding research integrity and statistical anomalies: `;
      anomalies.forEach((a) => {
        script += `A statistical indicator of type ${a.type} with ${a.severity} severity was flagged: ${a.message}. `;
      });
    } else {
      script += `No major statistical anomalies were flagged during the integrity scan. `;
    }
    if (gaps.length > 0) {
      script += `The following research gaps were identified: ${gaps.join('. ')}. `;
    }
    if (hypotheses.length > 0) {
      script += `To address these gaps, the system generated these hypotheses: `;
      hypotheses.forEach((h, idx) => {
        script += `Hypothesis ${idx + 1}: ${h.name}. Description: ${h.description}. `;
      });
    }
    script += "This concludes the briefing.";
    return script;
  };

  const handlePlayAudio = () => {
    if (audioState === 'paused') {
      window.speechSynthesis.resume();
      setAudioState('playing');
      return;
    }
    window.speechSynthesis.cancel();
    
    const script = generateBriefingScript();
    if (!script) return;
    
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.onend = () => {
      setAudioState('stopped');
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setAudioState('stopped');
      utteranceRef.current = null;
    };
    utteranceRef.current = utterance;
    setAudioState('playing');
    window.speechSynthesis.speak(utterance);
  };

  const handlePauseAudio = () => {
    if (audioState === 'playing') {
      window.speechSynthesis.pause();
      setAudioState('paused');
    }
  };

  const handleStopAudio = () => {
    window.speechSynthesis.cancel();
    setAudioState('stopped');
    utteranceRef.current = null;
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Jargon explainer methods
  const handleExplainJargon = async () => {
    if (!selectedText) return;
    setExplainingLoading(true);
    setJargonExplanation('');

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      // Route through service worker to bypass parent page CORS / CSP restrictions
      chrome.runtime.sendMessage({
        type: 'explain_req',
        payload: { phrase: selectedText }
      }, (response: any) => {
        setExplainingLoading(false);
        if (response && response.success) {
          setJargonExplanation(response.data.explanation);
        } else {
          setJargonExplanation(`Error: ${response ? response.error : 'Failed to explain term'}`);
        }
      });
    } else {
      // Fallback for direct browser debugging (non-extension environment)
      const cleanUrl = backendUrl.trim().replace(/\/$/, '');
      try {
        const res = await fetchWithAuth(`${cleanUrl}/api/explain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phrase: selectedText })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`API error (${res.status}): ${errText}`);
        }
        const data = await res.json();
        setJargonExplanation(data.explanation);
      } catch (err: any) {
        setJargonExplanation(`Error: ${err.message}`);
      } finally {
        setExplainingLoading(false);
      }
    }
  };

  // Citation exporter formatting methods
  const getAuthorsText = (format: 'apa' | 'ieee' | 'mla' | 'chicago' | 'bibtex') => {
    const authors = (paperData?.authors as string[]) || [];
    if (authors.length === 0) return "Unknown Author";
    if (format === 'apa') {
      return authors.map((author: string) => {
        const parts = author.trim().split(/\s+/);
        if (parts.length > 1) {
          const lastName = parts[parts.length - 1];
          const initials = parts.slice(0, -1).map((p: string) => p[0] + ".").join(" ");
          return `${lastName}, ${initials}`;
        }
        return author;
      }).join(", & ");
    }
    if (format === 'ieee') {
      return authors.map((author: string) => {
        const parts = author.trim().split(/\s+/);
        if (parts.length > 1) {
          const initials = parts.slice(0, -1).map((p: string) => p[0] + ".").join(" ");
          const lastName = parts[parts.length - 1];
          return `${initials} ${lastName}`;
        }
        return author;
      }).join(" and ");
    }
    if (format === 'mla' || format === 'chicago') {
      if (authors.length === 1) return authors[0];
      return authors.slice(0, -1).join(", ") + ", and " + authors[authors.length - 1];
    }
    return authors.join(" and ");
  };

  const getCitation = (format: string) => {
    const title = paperData?.title || "Title of Paper";
    const authors = paperData?.authors || [];
    const doi = paperData?.doi || "";
    const arxivId = paperData?.arxiv_id || "";
    const year = new Date().getFullYear();
    const journal = paperData?.journal || "Episteme Repository";

    if (format === 'apa') {
      const authStr = getAuthorsText('apa');
      const doiStr = doi ? ` https://doi.org/${doi}` : arxivId ? ` arXiv:${arxivId}` : "";
      return `${authStr} (${year}). ${title}. ${journal}.${doiStr}`;
    }
    if (format === 'ieee') {
      const authStr = getAuthorsText('ieee');
      const doiStr = doi ? `, doi: ${doi}` : arxivId ? `, arXiv: ${arxivId}` : "";
      return `${authStr}, "${title}," ${journal}, ${year}${doiStr}.`;
    }
    if (format === 'mla') {
      const authStr = getAuthorsText('mla');
      const doiStr = doi ? `, https://doi.org/${doi}` : arxivId ? `, arXiv:${arxivId}` : "";
      return `${authStr}. "${title}." ${journal}, ${year}${doiStr}.`;
    }
    if (format === 'chicago') {
      const authStr = getAuthorsText('chicago');
      const doiStr = doi ? `. https://doi.org/${doi}` : arxivId ? `. arXiv:${arxivId}` : "";
      return `${authStr}. "${title}." ${journal} (${year})${doiStr}.`;
    }
    if (format === 'bibtex') {
      const authorKey = authors.length > 0 ? authors[0].split(" ").pop()?.toLowerCase() : "author";
      const cleanTitle = title.replace(/[{}]/g, "");
      const bibtexKey = `${authorKey}${year}${title.split(" ")[0].toLowerCase()}`;
      return `@article{${bibtexKey},\n  author = {${getAuthorsText('bibtex')}},\n  title = {${cleanTitle}},\n  journal = {${journal}},\n  year = {${year}},\n  url = {${doi ? `https://doi.org/${doi}` : arxivId ? `https://arxiv.org/abs/${arxivId}` : ""}}\n}`;
    }
    return "";
  };

  const handleCopyCitation = (format: string) => {
    const text = getCitation(format);
    copyToClipboard(text).then((success) => {
      if (success) {
        setCopiedFormat(format);
        setTimeout(() => setCopiedFormat(null), 2000);
      } else {
        alert("Failed to copy citation to clipboard.");
      }
    });
  };

  // Statistical calculator helper math functions
  const getStandardNormalCDF = (x: number): number => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x >= 0 ? 1 - prob : prob;
  };

  const getCritVal = (alpha: number): number => {
    if (alpha === 0.05) return 1.96;
    if (alpha === 0.01) return 2.58;
    if (alpha === 0.10) return 1.645;
    // Linear approximation fallback
    return 1.96 + (0.05 - alpha) * 12.0;
  };

  const calculatePowerValue = (n: number, d: number, alpha: number): number => {
    const zCrit = getCritVal(alpha);
    const zBeta = d * Math.sqrt(n) - zCrit;
    return parseFloat((getStandardNormalCDF(zBeta) * 100).toFixed(1));
  };

  // Comparative contrast helper methods
  const handleCompareSelected = () => {
    if (selectedHistoryPapers.length !== 2) return;
    setCompareLoading(true);
    setCompareResult(null);
    setShowCompareModal(true);

    const getPaperInfo = (paperId: string): Promise<any> => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get('episteme_paper_' + paperId, (stored: any) => {
            resolve(stored['episteme_paper_' + paperId]);
          });
        } else {
          const stored = localStorage.getItem('episteme_paper_' + paperId);
          resolve(stored ? JSON.parse(stored) : null);
        }
      });
    };

    Promise.all([
      getPaperInfo(selectedHistoryPapers[0]),
      getPaperInfo(selectedHistoryPapers[1])
    ]).then(([paperA, paperB]) => {
      if (!paperA || !paperB) {
        setCompareLoading(false);
        setCompareResult({ error: "One or both selected papers could not be found in local history." });
        return;
      }

      const payload = {
        title_a: paperA.title,
        claims_a: paperA.claims || [],
        title_b: paperB.title,
        claims_b: paperB.claims || []
      };

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'compare_req',
          payload: payload
        }, (response: any) => {
          setCompareLoading(false);
          if (response && response.success) {
            setCompareResult(response.data);
          } else {
            setCompareResult({
              error: response ? response.error : 'Connection to compare service failed.'
            });
          }
        });
      } else {
        const cleanUrl = backendUrl.trim().replace(/\/$/, "");
        fetchWithAuth(`${cleanUrl}/api/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(res => {
            if (!res.ok) throw new Error('API server returned error');
            return res.json();
          })
          .then(data => {
            setCompareLoading(false);
            setCompareResult(data);
          })
          .catch(err => {
            setCompareLoading(false);
            setCompareResult({ error: err.message });
          });
      }
    });
  };

  const handleDesignProtocol = async (hypName: string, hypDesc: string) => {
    setActiveHypothesisName(hypName);
    setProtocolLoading(true);
    setProtocolContent('');
    setShowProtocolModal(true);

    const payload = {
      hypothesis_name: hypName,
      hypothesis_desc: hypDesc,
      paper_title: analysisResult?.title || paperData?.title || "Unknown Paper"
    };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'design_protocol_req',
        payload: payload
      }, (response: any) => {
        setProtocolLoading(false);
        if (response && response.success) {
          setProtocolContent(response.data.protocol_markdown);
        } else {
          setProtocolContent("Failed to generate protocol. Server returned an error.");
        }
      });
    } else {
      try {
        const cleanUrl = backendUrl.trim().replace(/\/$/, "");
        const res = await fetchWithAuth(`${cleanUrl}/api/experiment/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          setProtocolContent(data.protocol_markdown);
        } else {
          setProtocolContent("Failed to generate protocol. Server returned an error.");
        }
      } catch (e: any) {
        setProtocolContent(`Error generating protocol: ${e.message}`);
      } finally {
        setProtocolLoading(false);
      }
    }
  };

  const handleSelectPaperForComparison = (paperId: string) => {
    setSelectedHistoryPapers(prev => {
      if (prev.includes(paperId)) {
        return prev.filter(id => id !== paperId);
      }
      return [...prev, paperId];
    });
  };

  const handleClose = () => {
    window.parent.postMessage({
      source: 'episteme-sidebar',
      action: 'close_sidebar'
    }, '*');
  };

  // 2. Interactive Concept Graph Map Rendering inside HTML5 Canvas
  useEffect(() => {
    if (activeTab !== 'map' || !analysisResult || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const nodes = analysisResult.concept_map_nodes || [];
    const links = analysisResult.concept_map_links || [];

    // Scale canvas resolution to support high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const center_x = width / 2;
    const center_y = height / 2;

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const canvasRect = canvas.getBoundingClientRect();
      mouseX = e.clientX - canvasRect.left;
      mouseY = e.clientY - canvasRect.top;

      // Detect hover
      let foundNode: Node | null = null;
      for (const node of nodes) {
        const nx = center_x + node.x * 0.8;
        const ny = center_y + node.y * 0.8;
        const dist = Math.hypot(mouseX - nx, mouseY - ny);
        if (dist <= node.size + 4) {
          foundNode = node;
          break;
        }
      }
      setHoveredNode(foundNode);
    };

    const handleMouseClick = (_e: MouseEvent) => {
      if (hoveredNode && hoveredNode.type === 'similar_paper') {
        // Find corresponding similar paper details if present
        const papers = analysisResult.similar_papers || [];
        const paper = papers.find(p => p.title.toLowerCase().includes(hoveredNode.label.replace('...', '').toLowerCase()));
        if (paper && paper.url) {
          window.open(paper.url, '_blank');
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleMouseClick);

    // Dynamic Render Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw grid backdrop
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 1. Draw link connections
      links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);

        if (sourceNode && targetNode) {
          const sx = center_x + sourceNode.x * 0.8;
          const sy = center_y + sourceNode.y * 0.8;
          const tx = center_x + targetNode.x * 0.8;
          const ty = center_y + targetNode.y * 0.8;

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
          
          // Style links dynamically based on target node type
          if (targetNode.type === 'claim') {
            ctx.strokeStyle = targetNode.status === 'Verified' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)';
          } else if (targetNode.type === 'similar_paper') {
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
          } else {
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
          }
          
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // 2. Draw nodes
      nodes.forEach(node => {
        const nx = center_x + node.x * 0.8;
        const ny = center_y + node.y * 0.8;
        const isHovered = hoveredNode?.id === node.id;

        // Draw outer glow ring for selected/hovered nodes
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(nx, ny, node.size + 6, 0, 2 * Math.PI);
          ctx.fillStyle = node.type === 'center' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.08)';
          ctx.fill();
        }

        // Draw node body
        ctx.beginPath();
        ctx.arc(nx, ny, node.size, 0, 2 * Math.PI);
        
        // Dynamic node color selection
        if (node.type === 'center') {
          ctx.fillStyle = '#6366F1'; // Glowing Indigo
        } else if (node.type === 'claim') {
          ctx.fillStyle = node.status === 'Verified' ? '#10B981' : node.status === 'Contradicted' ? '#EF4444' : '#F59E0B';
        } else if (node.type === 'similar_paper') {
          ctx.fillStyle = '#06B6D4'; // Cyan
        } else {
          ctx.fillStyle = '#EC4899'; // Pink (Hypothesis)
        }
        
        ctx.fill();

        // Node label
        ctx.fillStyle = isHovered ? '#FFFFFF' : '#9CA3AF';
        ctx.font = isHovered ? 'bold 10px Inter' : '9px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.label, nx, ny + node.size + 4);
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleMouseClick);
    };
  }, [activeTab, analysisResult, hoveredNode]);

  return (
    <div className="sidebar-container glass-panel">
      {/* Header */}
      <div className="sidebar-header">
        <div className="brand-section">
          <span className="brand-icon">🔬</span>
          <span className="brand-name">Episteme</span>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Like/Favorite Button */}
          {paperData && (
            <button 
              className={`header-action-btn like-btn ${isLiked ? 'liked' : ''}`}
              onClick={toggleLike}
              title={isLiked ? "Unlike Paper" : "Like Paper"}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
            >
              {isLiked ? '❤️' : '🤍'}
            </button>
          )}
          {/* Dark / Light Toggle */}
          <button 
            className="header-action-btn theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          {/* Reload Extension Button */}
          <button 
            className="header-action-btn reload-btn"
            onClick={handleReloadExtension}
            title="Reload Extension & Tab"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'inherit'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2) rotate(45deg)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
          >
            🔄
          </button>
          {/* GitHub Codebase Button */}
          <a 
            href="https://github.com/Techie03/episteme" 
            target="_blank" 
            rel="noopener noreferrer"
            title="View Codebase on GitHub"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'inherit',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.85 }}>
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <button className="close-btn" onClick={handleClose}>&times;</button>
        </div>
      </div>

      {/* Meta detail box of detected paper */}
      {paperData && (
        <div className="paper-meta-box">
          <div className="paper-title">{paperData.title}</div>
          <div className="paper-authors">
            {paperData.authors && paperData.authors.length > 0 
              ? paperData.authors.join(', ') 
              : 'Unknown Authors'}
          </div>
          {analysisResult && (
            <div className="audio-briefing-bar">
              <span className="audio-label">
                Briefing Podcast
                {audioState === 'playing' && (
                  <span className="audio-wave">
                    <span className="audio-wave-bar"></span>
                    <span className="audio-wave-bar"></span>
                    <span className="audio-wave-bar"></span>
                  </span>
                )}
              </span>
              <div className="audio-controls">
                {audioState === 'playing' ? (
                  <button className="audio-btn active animate-pulse-soft" onClick={handlePauseAudio} title="Pause Briefing">
                    ⏸ Pause
                  </button>
                ) : (
                  <button className="audio-btn" onClick={handlePlayAudio} title="Play Briefing">
                    {audioState === 'paused' ? '▶ Resume' : '▶ Play Podcast'}
                  </button>
                )}
                {audioState !== 'stopped' && (
                  <button className="audio-btn stop" onClick={handleStopAudio} title="Stop Briefing">
                    ⏹ Stop
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Selection (Always Visible) */}
      <div className="tabs-navigation">
        <button 
          className={`tab-button ${(activeTab === 'claims' || activeTab === 'integrity' || activeTab === 'review') ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
          title="Paper Claims, Integrity Scanner, and Peer Review"
        >
          🔍 Verify
        </button>
        <button 
          className={`tab-button ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
          title="Interactive Concept Maps & Evolution Lineage Timeline"
        >
          🗺️ Map
        </button>
        <button 
          className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
          title="Episteme Research Chatbot Assistant"
        >
          💬 Chat
        </button>
        <button 
          className={`tab-button ${activeTab === 'slides' ? 'active' : ''}`}
          onClick={() => setActiveTab('slides')}
          title="Interactive Research Summary Slides"
        >
          🎦 Slides
        </button>
        <button 
          className={`tab-button ${(activeTab === 'memory' || activeTab === 'notebook' || activeTab === 'replication' || activeTab === 'cite' || activeTab === 'settings' || activeTab === 'videos') ? 'active' : ''}`}
          onClick={() => setActiveTab('memory')}
          title="Personal Research History, Notebook, Citation Exporter, and API Settings"
        >
          💾 Memory
        </button>
      </div>

      {/* Main Content Area */}
      <div className="tabs-content">
        {loading ? (
          <div className="loader-container">
            <div className="spinner-ring"></div>
            <div>
              <div className="loading-text">{loadingStep}</div>
              <div className="loading-subtext" style={{ marginTop: '8px', textAlign: 'center' }}>
                NVIDIA NIM computing verify profiles...
              </div>
            </div>
          </div>
        ) : activeTab === 'cite' ? (
          <div className="citations-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sub-pills-navigation" style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('memory')}>History</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('replication')}>Replications</button>
              <button className="toggle-sub-btn active" onClick={() => setActiveTab('cite')}>Cite Exporter</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('videos')}>Videos</button>
              <button className="toggle-sub-btn" style={{ paddingLeft: '8px', paddingRight: '8px' }} onClick={() => setActiveTab('settings')}>API Settings</button>
            </div>
            {!paperData ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                Please open a research paper to generate citations.
              </div>
            ) : (
              <div className="citations-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {['apa', 'ieee', 'mla', 'chicago', 'bibtex'].map((format) => (
                  <div key={format} className="glass-card citation-card">
                    <div className="citation-format-label">{format.toUpperCase()}</div>
                    <pre className="citation-text">{getCitation(format)}</pre>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        className={`citation-copy-btn ${copiedFormat === format ? 'copied' : ''}`}
                        onClick={() => handleCopyCitation(format)}
                        style={{ flex: 1 }}
                      >
                        {copiedFormat === format ? '✓ Copied' : '📄 Copy Citation'}
                      </button>
                      {format === 'bibtex' && (
                        <button
                          className="citation-copy-btn"
                          onClick={async () => {
                            const authors = (paperData?.authors as string[]) || [];
                            const authorKey = authors.length > 0 ? authors[0].split(" ").pop()?.toLowerCase() : "author";
                            const year = new Date().getFullYear();
                            const title = paperData?.title || "title";
                            const firstWord = title.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
                            const bibtexKey = `${authorKey}${year}${firstWord}`;
                            const success = await copyToClipboard(`\\cite{${bibtexKey}}`);
                            if (success) {
                              alert(`Copied LaTeX cite tag: \\cite{${bibtexKey}}`);
                            } else {
                              alert("Failed to copy citation tag.");
                            }
                          }}
                          style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc', fontSize: '11px', padding: '6px 12px' }}
                        >
                          🔗 Copy \cite
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'review' ? (
          !analysisResult ? (
            <div className="welcome-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="sub-pills-navigation" style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <button className="toggle-sub-btn" onClick={() => setActiveTab('claims')}>Claims List</button>
                <button className="toggle-sub-btn" onClick={() => setActiveTab('integrity')}>Integrity Audit</button>
                <button className="toggle-sub-btn active" onClick={() => setActiveTab('review')}>Peer Review</button>
              </div>
              <div className="welcome-logo">📝</div>
              <div>
                <h2 className="welcome-title">Peer-Review Mock Draft</h2>
                <p className="welcome-desc">
                  Run paper verification to simulate a strict journal peer-review report mapping strengths, weaknesses, and revision suggestions.
                </p>
              </div>
              <button className="action-btn" onClick={() => handleAnalyze()}>
                Begin Paper Verification
              </button>
            </div>
          ) : (
            <div className="review-tab-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: '4px' }}>
              <div className="sub-pills-navigation" style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <button className="toggle-sub-btn" onClick={() => setActiveTab('claims')}>Claims List</button>
                <button className="toggle-sub-btn" onClick={() => setActiveTab('integrity')}>Integrity Audit</button>
                <button className="toggle-sub-btn active" onClick={() => setActiveTab('review')}>Peer Review</button>
              </div>
              <div className="glass-card review-header-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--color-primary)' }}>
                <span className="slide-title" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 700 }}>Simulated Referee Recommendation</span>
                <h4 style={{ color: 'white', fontSize: '16px', margin: 0 }}>
                  {analysisResult.peer_review?.recommendation || "Accept with minor revisions"}
                </h4>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Generated by Episteme Peer-Review Agent utilizing Llama 3.1 70B
                </div>
              </div>

              {/* Strengths */}
              <div>
                <h3 className="integrity-block-title" style={{ color: 'var(--color-success)', borderBottomColor: 'rgba(16, 185, 129, 0.2)' }}>Strengths</h3>
                <div className="glass-card review-list-card" style={{ padding: '12px' }}>
                  <ul className="slide-bullet-list">
                    {analysisResult.peer_review?.strengths && analysisResult.peer_review.strengths.length > 0 ? (
                      analysisResult.peer_review.strengths.map((s: string, idx: number) => (
                        <li key={idx} style={{ color: 'var(--text-primary)' }}>{s}</li>
                      ))
                    ) : (
                      <li>Strong methodology formulation and experimental setups.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Weaknesses */}
              <div>
                <h3 className="integrity-block-title" style={{ color: 'var(--color-danger)', borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>Weaknesses & Limitations</h3>
                <div className="glass-card review-list-card" style={{ padding: '12px' }}>
                  <ul className="slide-bullet-list">
                    {analysisResult.peer_review?.weaknesses && analysisResult.peer_review.weaknesses.length > 0 ? (
                      analysisResult.peer_review.weaknesses.map((w: string, idx: number) => (
                        <li key={idx} style={{ color: 'var(--text-primary)' }}>{w}</li>
                      ))
                    ) : (
                      <li>Evaluation dataset variety is relatively constrained.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Questions for Authors */}
              <div>
                <h3 className="integrity-block-title" style={{ color: 'var(--color-warning)', borderBottomColor: 'rgba(245, 158, 11, 0.2)' }}>Questions For Authors</h3>
                <div className="glass-card review-list-card" style={{ padding: '12px' }}>
                  <ol style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0, fontSize: '12px' }}>
                    {analysisResult.peer_review?.questions_for_authors && analysisResult.peer_review.questions_for_authors.length > 0 ? (
                      analysisResult.peer_review.questions_for_authors.map((q: string, idx: number) => (
                        <li key={idx} style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{q}</li>
                      ))
                    ) : (
                      <li style={{ color: 'var(--text-primary)' }}>Can the authors elaborate on compiler efficiency trends?</li>
                    )}
                  </ol>
                </div>
              </div>
            </div>
          )
        ) : activeTab === 'slides' ? (
          !analysisResult ? (
            <div className="welcome-panel animate-fade-in">
              <div className="welcome-logo">🎦</div>
              <div>
                <h2 className="welcome-title">Generate Summary Slides</h2>
                <p className="welcome-desc">
                  Verify this paper to generate an interactive 5-slide visual carousel of core insights.
                </p>
              </div>
              <button className="action-btn" onClick={() => handleAnalyze()}>
                Begin Paper Verification
              </button>
            </div>
          ) : (
            <div className="slides-container animate-fade-in">
              <div className="carousel-viewport">
                {/* Slide 1: Title & Overview */}
                <div className={`carousel-slide ${currentSlide === 0 ? 'active' : ''}`}>
                  <div className="slide-header">
                    <span className="slide-title">Paper Overview</span>
                    <span className="slide-number">1 / 5</span>
                  </div>
                  <div className="slide-body">
                    <h4 style={{ color: 'white', marginBottom: '8px', fontSize: '14px' }}>{analysisResult.title}</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      <strong>Authors:</strong> {paperData?.authors?.join(', ') || 'Unknown'}<br />
                      {paperData?.doi && <><strong>DOI:</strong> {paperData.doi}<br /></>}
                      {paperData?.arxiv_id && <><strong>arXiv ID:</strong> {paperData.arxiv_id}<br /></>}
                    </p>
                    <div className="glass-card" style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.15)', padding: '10px' }}>
                      <span style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-primary)' }}>Integrity Verification Scan</span>
                      <div style={{ marginTop: '4px', fontSize: '12px' }}>
                        {analysisResult.integrity_report?.retracted ? (
                          <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>🚨 FLAG: This publication has retraction warnings.</span>
                        ) : (
                          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Safe: No retraction records found in indexes.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 2: Core Claims */}
                <div className={`carousel-slide ${currentSlide === 1 ? 'active' : ''}`}>
                  <div className="slide-header">
                    <span className="slide-title">Core Claims</span>
                    <span className="slide-number">2 / 5</span>
                  </div>
                  <div className="slide-body">
                    <ul className="slide-bullet-list">
                      {analysisResult.claims && analysisResult.claims.length > 0 ? (
                        analysisResult.claims.slice(0, 3).map((c, idx) => (
                          <li key={idx}>
                            <span style={{ fontWeight: 600, color: c.status === 'Verified' ? 'var(--color-success)' : c.status === 'Contradicted' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                              [{c.status}]
                            </span>{' '}
                            {c.claim}
                          </li>
                        ))
                      ) : (
                        <li>No claims extracted.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Slide 3: Trust Scan */}
                <div className={`carousel-slide ${currentSlide === 2 ? 'active' : ''}`}>
                  <div className="slide-header">
                    <span className="slide-title">Integrity & Anomalies</span>
                    <span className="slide-number">3 / 5</span>
                  </div>
                  <div className="slide-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <strong>Statistical Health:</strong>
                        {analysisResult.stats_anomalies && analysisResult.stats_anomalies.length > 0 ? (
                          <div style={{ color: 'var(--color-warning)', marginTop: '4px' }}>
                            ⚠️ Flagged {analysisResult.stats_anomalies.length} potential sample or reporting anomaly(s).
                          </div>
                        ) : (
                          <div style={{ color: 'var(--color-success)', marginTop: '4px' }}>
                            ✓ Passed p-hacking and sample distribution checks.
                          </div>
                        )}
                      </div>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                        <strong>Reproducibility Details:</strong>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>
                          {analysisResult.integrity_report?.data_availability || 'No code availability statement found.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 4: Research Gaps */}
                <div className={`carousel-slide ${currentSlide === 3 ? 'active' : ''}`}>
                  <div className="slide-header">
                    <span className="slide-title">Research Gaps</span>
                    <span className="slide-number">4 / 5</span>
                  </div>
                  <div className="slide-body">
                    <ul className="slide-bullet-list">
                      {analysisResult.research_gaps && analysisResult.research_gaps.length > 0 ? (
                        analysisResult.research_gaps.slice(0, 3).map((gap, idx) => (
                          <li key={idx}>{gap}</li>
                        ))
                      ) : (
                        <li>No research gaps extracted.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Slide 5: Generated Hypotheses */}
                <div className={`carousel-slide ${currentSlide === 4 ? 'active' : ''}`}>
                  <div className="slide-header">
                    <span className="slide-title">Next Steps & Hypotheses</span>
                    <span className="slide-number">5 / 5</span>
                  </div>
                  <div className="slide-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {analysisResult.hypotheses && analysisResult.hypotheses.length > 0 ? (
                        analysisResult.hypotheses.slice(0, 2).map((hyp, idx) => (
                          <div key={idx} style={{ background: 'rgba(236,72,153,0.04)', border: '1px solid rgba(236,72,153,0.15)', borderRadius: '6px', padding: '8px' }}>
                            <div style={{ fontWeight: 600, color: '#EC4899', fontSize: '11px' }}>{hyp.name}</div>
                            <div style={{ fontSize: '11px', marginTop: '2px' }}>{hyp.description}</div>
                          </div>
                        ))
                      ) : (
                        <div>No new hypotheses generated for this topic.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Carousel Controls */}
              <div className="carousel-controls">
                <button
                  className="carousel-nav-btn"
                  onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                  disabled={currentSlide === 0}
                >
                  ◀
                </button>
                <div className="carousel-indicators">
                  {[0, 1, 2, 3, 4].map(idx => (
                    <span
                      key={idx}
                      className={`carousel-dot ${currentSlide === idx ? 'active' : ''}`}
                      onClick={() => setCurrentSlide(idx)}
                    />
                  ))}
                </div>
                <button
                  className="carousel-nav-btn"
                  onClick={() => setCurrentSlide(prev => Math.min(4, prev + 1))}
                  disabled={currentSlide === 4}
                >
                  ▶
                </button>
              </div>
            </div>
          )
        ) : activeTab === 'chat' ? (
          /* Chat Tab Content */
          <div className="chat-tab-container animate-fade-in">
            {!paperData ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                Please open a research paper to start a conversation.
              </div>
            ) : (
              <div className="chat-window">
                <div className="chat-messages-log">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chat-message-bubble ${msg.role}`}>
                      <div className="message-content">{renderFormattedMessage(msg.content)}</div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="chat-message-bubble assistant loading">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="chat-input-bar">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask a question about this paper..."
                    className="chat-input-field"
                    disabled={chatLoading}
                  />
                  <button 
                    onClick={handleSendMessage} 
                    className="chat-send-btn"
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          /* Settings Tab Content */
          <div className="settings-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="sub-pills-navigation" style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('memory')}>History</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('replication')}>Replications</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('cite')}>Cite Exporter</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('videos')}>Videos</button>
              <button className="toggle-sub-btn active" style={{ paddingLeft: '8px', paddingRight: '8px' }} onClick={() => setActiveTab('settings')}>API Settings</button>
            </div>
            <h3 className="integrity-block-title" style={{ marginTop: 0 }}>API Server Connection</h3>
            <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>BACKEND API BASE URL</label>
                <input 
                  type="text" 
                  value={settingsUrlInput} 
                  onChange={(e) => setSettingsUrlInput(e.target.value)} 
                  placeholder="e.g. http://127.0.0.1:8000"
                  className="history-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <span>Server Status: <strong style={{ color: backendStatus === 'Online' ? '#10B981' : backendStatus === 'Checking...' ? '#F59E0B' : '#EF4444' }}>{backendStatus}</strong></span>
                <button 
                  className="claim-expand-trigger" 
                  onClick={() => checkHealth(settingsUrlInput)}
                  style={{ textDecoration: 'underline' }}
                >
                  Test Connection
                </button>
              </div>

              <button 
                className="action-btn" 
                onClick={() => {
                  const rawInput = settingsUrlInput.trim();
                  let targetUrl = rawInput;
                  if (!rawInput || rawInput.toLowerCase() === 'default (cloud)' || rawInput.toLowerCase() === 'default') {
                    targetUrl = 'https://nishith374-episteme-backend.hf.space';
                    setSettingsUrlInput('Default (Cloud)');
                  } else {
                    targetUrl = rawInput.replace(/\/$/, "");
                    setSettingsUrlInput(targetUrl);
                  }
                  setBackendUrl(targetUrl);
                  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ backendUrl: targetUrl }, () => {
                      console.log('Saved custom backend url:', targetUrl);
                    });
                  } else {
                    localStorage.setItem('backendUrl', targetUrl);
                  }
                  alert('Settings saved successfully!');
                }}
                style={{ marginTop: '8px' }}
              >
                Save Configuration
              </button>
            </div>

            <h3 className="integrity-block-title" style={{ marginTop: '16px' }}>Developer Controls</h3>
            <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                If you made edits to the extension or want to reload the extension state completely:
              </div>
              <button 
                className="action-btn"
                onClick={handleReloadExtension}
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                  color: '#f59e0b',
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
              >
                🔄 Reload Extension & Page
              </button>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '4px 0' }}></div>

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Bypass caches and run a fresh verification on the current paper:
              </div>
              <button 
                className="action-btn"
                disabled={!paperData}
                onClick={() => handleAnalyze(true)}
                style={{
                  background: 'rgba(99, 102, 241, 0.12)',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  color: '#a5b4fc',
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
              >
                ⚡ Run Fresh Verification
              </button>
            </div>
            
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '0 8px', lineHeight: 1.4 }}>
              Tip: When deployed to Hugging Face Spaces or Render, paste your Space/App HTTPS URL here (e.g. <code>https://user-space.hf.space</code>).
            </div>

            <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '3px solid var(--color-primary)', background: 'rgba(99, 102, 241, 0.02)' }}>
              <h4 style={{ margin: 0, fontSize: '12px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔒 Privacy & Memory
              </h4>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                The Memory and History features are personal to your extension instance and are not intended to be shared publicly.
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                If you are using the default pre-configured backend, your saved papers, notes, and memory items should be treated as your own workspace. Other users should not rely on the History tab as a public repository or expect to see everyone else's activity.
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                For complete privacy and control, users are encouraged to deploy their own backend and configure their own API credentials. However, for convenience, a pre-configured backend is provided for users who do not wish to perform any setup.
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, fontStyle: 'italic' }}>
                Please do not store sensitive, confidential, or personally identifiable information unless you are using a backend that you control and trust.
              </p>
            </div>
          </div>
        ) : activeTab === 'replication' ? (
          <div className="replications-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sub-pills-navigation" style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('memory')}>History</button>
              <button className="toggle-sub-btn active" onClick={() => setActiveTab('replication')}>Replications</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('cite')}>Cite Exporter</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('videos')}>Videos</button>
              <button className="toggle-sub-btn" style={{ paddingLeft: '8px', paddingRight: '8px' }} onClick={() => setActiveTab('settings')}>API Settings</button>
            </div>
            {!analysisResult || !analysisResult.replication_repos || analysisResult.replication_repos.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                No replication repositories found. Please run paper verification or check connection.
              </div>
            ) : (
              <div className="replications-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 className="integrity-block-title" style={{ marginTop: 0 }}>GitHub Replication Finder</h3>
                {analysisResult.replication_repos.map((repo: any, idx: number) => (
                  <div key={idx} className="glass-card replication-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <a href={repo.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '13px', textDecoration: 'none' }}>
                        {repo.name} ↗
                      </a>
                      {repo.has_docker && (
                        <span className="docker-badge" title="Docker Containerization Available">🐋 Docker</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>⭐ {repo.stars} stars</span>
                      <span>🍴 {repo.forks} forks</span>
                      <span>💻 {repo.primary_language}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'videos' ? (
          <div className="videos-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sub-pills-navigation" style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('memory')}>History</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('replication')}>Replications</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('cite')}>Cite Exporter</button>
              <button className="toggle-sub-btn active" onClick={() => setActiveTab('videos')}>Videos</button>
              <button className="toggle-sub-btn" style={{ paddingLeft: '8px', paddingRight: '8px' }} onClick={() => setActiveTab('settings')}>API Settings</button>
            </div>
            {!analysisResult || !analysisResult.related_videos || analysisResult.related_videos.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                No related video resources found. Please run paper verification or check connection.
              </div>
            ) : (
              <div className="videos-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: '4px' }}>
                <h3 className="integrity-block-title" style={{ marginTop: 0 }}>Related Educational Videos</h3>
                {analysisResult.related_videos.map((video: any, idx: number) => (
                  <div key={idx} className="glass-card video-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', overflow: 'hidden' }}>
                    <div className="video-thumbnail-container" style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', aspectRatio: '16/9' }}>
                      <img 
                        src={video.thumbnail || `https://img.youtube.com/vi/${video.url.split('v=')[1]}/0.jpg`} 
                        alt={video.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span className="video-duration" style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0, 0, 0, 0.8)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                        {video.duration}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <a href={video.url} target="_blank" rel="noreferrer" className="video-title-link" style={{ fontWeight: 600, color: 'white', fontSize: '13px', textDecoration: 'none', lineHeight: 1.4 }}>
                        {video.title} ↗
                      </a>
                      <span className="video-creator" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        👤 {video.creator}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'notebook' ? (
          /* Research Notebook Tab */
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sub-pills-navigation" style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('memory')}>History</button>
              <button className="toggle-sub-btn active" onClick={() => setActiveTab('notebook')}>📓 Notebook</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('replication')}>Replications</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('cite')}>Cite Exporter</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('videos')}>Videos</button>
              <button className="toggle-sub-btn" style={{ paddingLeft: '8px', paddingRight: '8px' }} onClick={() => setActiveTab('settings')}>API Settings</button>
            </div>

            {/* Notebook header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>📓 Research Highlights & Notes</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {highlights.length > 0 && (
                  <button className="toggle-sub-btn" onClick={exportNotebookMarkdown} style={{ fontSize: '11px', padding: '4px 10px' }} title="Export as Obsidian Markdown">
                    ⬇ Export .md
                  </button>
                )}
                {highlights.length > 0 && (
                  <button
                    className="toggle-sub-btn"
                    style={{ fontSize: '11px', padding: '4px 10px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                    onClick={() => { if (window.confirm('Clear all saved highlights?')) saveHighlightsToStorage([]); }}
                  >
                    🗑 Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Filter input */}
            <input
              type="text"
              className="history-input"
              placeholder="Filter highlights by keyword or paper title…"
              value={notebookPaperFilter}
              onChange={e => setNotebookPaperFilter(e.target.value)}
            />

            {/* Manual note adder */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderColor: 'rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>+ Add Manual Note</div>
              <textarea
                className="history-input"
                placeholder="Type your research note, idea, or observation here…"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', fontFamily: 'var(--font-sans)', borderRadius: '8px' }}
              />
              <button
                className="action-btn"
                style={{ padding: '7px 16px', fontSize: '12px', alignSelf: 'flex-end' }}
                onClick={() => {
                  if (!noteInput.trim()) return;
                  saveToNotes('[Manual Note]', noteInput.trim());
                  setNoteInput('');
                }}
              >
                + Save Note
              </button>
            </div>

            {/* Highlights list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(() => {
                const filtered = highlights.filter(h =>
                  !notebookPaperFilter ||
                  h.text.toLowerCase().includes(notebookPaperFilter.toLowerCase()) ||
                  (h.paperTitle || '').toLowerCase().includes(notebookPaperFilter.toLowerCase()) ||
                  (h.note || '').toLowerCase().includes(notebookPaperFilter.toLowerCase())
                );
                if (filtered.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 16px' }}>
                      {highlights.length === 0
                        ? <><div style={{ fontSize: '32px', marginBottom: '12px' }}>📌</div><div>No highlights saved yet.</div><div style={{ fontSize: '12px', marginTop: '6px' }}>Select text on a paper page and tap <strong>Save to Notes</strong> in the Jargon Explainer card!</div></>
                        : 'No highlights match your filter.'}
                    </div>
                  );
                }
                return filtered.map(h => (
                  <div key={h.id} className="notebook-highlight-card glass-card">
                    <div className="notebook-highlight-header">
                      <span style={{ fontSize: '16px' }}>📌</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {h.paperTitle && h.paperTitle !== '[Manual Note]' && (
                          <div className="notebook-paper-tag">{h.paperTitle.slice(0, 55)}{h.paperTitle.length > 55 ? '…' : ''}</div>
                        )}
                        <div className="notebook-saved-at">{h.savedAt}</div>
                      </div>
                      <button
                        className="jargon-close"
                        onClick={() => saveHighlightsToStorage(highlights.filter(x => x.id !== h.id))}
                        title="Delete"
                      >&times;</button>
                    </div>
                    {h.text !== '[Manual Note]' && (
                      <div className="notebook-highlight-text">"{h.text}"</div>
                    )}
                    {h.note && (
                      <div className="notebook-note-text">📝 {h.note}</div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        ) : activeTab === 'memory' ? (
          /* History Tab Content */
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sub-pills-navigation" style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <button className="toggle-sub-btn active" onClick={() => setActiveTab('memory')}>History</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('notebook')}>📓 Notebook</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('replication')}>Replications</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('cite')}>Cite Exporter</button>
              <button className="toggle-sub-btn" onClick={() => setActiveTab('videos')}>Videos</button>
              <button className="toggle-sub-btn" style={{ paddingLeft: '8px', paddingRight: '8px' }} onClick={() => setActiveTab('settings')}>API Settings</button>
            </div>
            <div className="history-search-bar" style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Search personal memory (e.g. immunology)..." 
                className="history-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                className="toggle-sub-btn"
                style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)', padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}
                onClick={handleDeleteHistory}
                title="Clear all history and caches"
              >
                🗑️ Clear History
              </button>
            </div>

            {historyList.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={historyList.length > 0 && historyList.every(item => selectedHistoryPapers.includes(item.id))}
                    ref={input => {
                      if (input) {
                        const allSelected = historyList.every(item => selectedHistoryPapers.includes(item.id));
                        const someSelected = historyList.some(item => selectedHistoryPapers.includes(item.id));
                        input.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    onChange={() => {
                      const allSelected = historyList.every(item => selectedHistoryPapers.includes(item.id));
                      if (allSelected) {
                        // Remove currently visible historyList items from selection
                        const visibleIds = historyList.map(item => item.id);
                        setSelectedHistoryPapers(prev => prev.filter(id => !visibleIds.includes(id)));
                      } else {
                        // Add visible historyList items to selection
                        const visibleIds = historyList.map(item => item.id);
                        setSelectedHistoryPapers(prev => {
                          const union = new Set([...prev, ...visibleIds]);
                          return Array.from(union);
                        });
                      }
                    }}
                  />
                  <span>Select All visible ({historyList.length})</span>
                </label>
              </div>
            )}

            {selectedHistoryPapers.length > 0 && (
              <div className="glass-card compare-action-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                <span style={{ fontSize: '12px' }}>Selected: <strong>{selectedHistoryPapers.length}</strong> {selectedHistoryPapers.length === 1 ? 'paper' : 'papers'}</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button 
                    className="action-btn"
                    disabled={selectedHistoryPapers.length !== 2}
                    onClick={handleCompareSelected}
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                    title={selectedHistoryPapers.length === 2 ? "Compare selected papers" : "Compare requires exactly 2 papers"}
                  >
                    Compare Selected
                  </button>
                  <button 
                    className="action-btn"
                    onClick={handleDeleteSelected}
                    style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}
                    title="Delete selected papers from history"
                  >
                    🗑️ Delete Selected
                  </button>
                  <button 
                    className="claim-expand-trigger"
                    onClick={() => setSelectedHistoryPapers([])}
                    style={{ fontSize: '11px', textDecoration: 'underline', border: 'none', background: 'transparent' }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
            
            <div className="history-list">
              {historyList.length > 0 ? (
                historyList.map((item, idx) => {
                  const isSelected = selectedHistoryPapers.includes(item.id);
                  const isItemLiked = likedPapersList.includes(item.id) || likedPapersList.includes(item.title);
                  return (
                    <div 
                      key={idx} 
                      className={`glass-card history-item-card ${isSelected ? 'selected' : ''}`}
                      style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', borderColor: isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)' }}
                      onClick={() => loadHistoricalPaper(item.id)}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectPaperForComparison(item.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div className="history-item-title" style={{ flex: 1 }}>{item.title}</div>
                          {isItemLiked && <span style={{ fontSize: '12px' }} title="Liked Paper">❤️</span>}
                        </div>
                        <div className="history-item-meta">
                          {item.doi ? `DOI: ${item.doi}` : item.arxiv_id ? `arXiv: ${item.arxiv_id}` : 'Local File'}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                  No papers matched in memory history.
                </div>
              )}
            </div>

            {/* Contrastor Modal overlay */}
            {showCompareModal && (
              <div className="compare-modal-overlay animate-fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
                <div className="compare-modal-content glass-panel" style={{ width: '100%', height: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', background: 'rgba(10, 12, 22, 0.98)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div className="sidebar-header" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="brand-name" style={{ fontSize: '15px', color: 'white', fontWeight: 700 }}>Side-by-Side Contrastor</span>
                    <button className="close-btn" onClick={() => setShowCompareModal(false)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: '18px', cursor: 'pointer' }}>&times;</button>
                  </div>
                  <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {compareLoading ? (
                      <div className="loader-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px' }}>
                        <div className="spinner-ring"></div>
                        <div className="loading-text" style={{ fontSize: '13px', color: '#9CA3AF' }}>Analyzing claims contrast...</div>
                      </div>
                    ) : compareResult && compareResult.error ? (
                      <div style={{ color: 'var(--color-danger)', textAlign: 'center', padding: '16px', fontSize: '12px' }}>
                        Error compiling contrast: {compareResult.error}
                      </div>
                    ) : compareResult ? (
                      <>
                        {/* Agreements */}
                        <div>
                          <h4 style={{ color: 'var(--color-success)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: '4px', fontWeight: 700 }}>Agreements</h4>
                          <ul className="slide-bullet-list" style={{ paddingLeft: '16px' }}>
                            {compareResult.agreements && compareResult.agreements.map((agr: string, idx: number) => (
                              <li key={idx} style={{ fontSize: '11px', color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.4 }}>{agr}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Disagreements */}
                        <div>
                          <h4 style={{ color: 'var(--color-danger)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '4px', fontWeight: 700 }}>Direct Conflicts</h4>
                          <ul className="slide-bullet-list" style={{ paddingLeft: '16px' }}>
                            {compareResult.disagreements && compareResult.disagreements.map((dis: string, idx: number) => (
                              <li key={idx} style={{ fontSize: '11px', color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.4 }}>{dis}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Methodology Differences */}
                        <div>
                          <h4 style={{ color: '#6366F1', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid rgba(99, 102, 241, 0.2)', paddingBottom: '4px', fontWeight: 700 }}>Methodology Contrast</h4>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                            {compareResult.methodology_differences}
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : !analysisResult ? (
          /* Welcome Panel (for claims/map/integrity tabs when no paper is loaded) */
          <div className="welcome-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {(activeTab === 'claims' || activeTab === 'integrity') && (
              <div className="sub-pills-navigation" style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <button className={`toggle-sub-btn ${activeTab === 'claims' ? 'active' : ''}`} onClick={() => setActiveTab('claims')}>Claims List</button>
                <button className={`toggle-sub-btn ${activeTab === 'integrity' ? 'active' : ''}`} onClick={() => setActiveTab('integrity')}>Integrity Audit</button>
                <button className="toggle-sub-btn" onClick={() => setActiveTab('review')}>Peer Review</button>
              </div>
            )}
            <div className="welcome-logo">🔬</div>
            <div>
              <h2 className="welcome-title">Research Verification</h2>
              <p className="welcome-desc">
                Run LangGraph agent analysis to verify claims, check retractions, and build semantic hypothesis paths.
              </p>
            </div>
            <button className="action-btn" onClick={() => handleAnalyze()}>
              Begin Paper Verification
            </button>
          </div>
        ) : (
          /* Render Active Analytics Tab */
          <>
            {/* Tab 1: Claims list */}
            {activeTab === 'claims' && (
              <div className="claims-list animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="sub-pills-navigation" style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <button className="toggle-sub-btn active" onClick={() => setActiveTab('claims')}>Claims List</button>
                  <button className="toggle-sub-btn" onClick={() => setActiveTab('integrity')}>Integrity Audit</button>
                  <button className="toggle-sub-btn" onClick={() => setActiveTab('review')}>Peer Review</button>
                </div>
                {analysisResult.complexity && (
                  <div className="glass-card complexity-gauge-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="slide-title" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 700 }}>Reading Complexity Gauge</span>
                      <span className="complexity-reading-time">⏱️ {analysisResult.complexity.estimated_reading_time} min read</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className="complexity-gauge-container">
                        <svg className="complexity-gauge-svg" viewBox="0 0 36 36" style={{ width: '48px', height: '48px' }}>
                          <path
                            className="complexity-gauge-bg"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            style={{ fill: 'none', stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 3 }}
                          />
                          <path
                            className="complexity-gauge-fill"
                            strokeDasharray={`${analysisResult.complexity.difficulty_score}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            style={{ fill: 'none', stroke: 'var(--color-primary)', strokeWidth: 3, strokeLinecap: 'round', transition: 'stroke-dasharray 0.5s ease' }}
                          />
                          <text x="18" y="21.5" className="complexity-gauge-text" style={{ fill: 'white', fontSize: '9px', fontWeight: 'bold', textAnchor: 'middle' }}>{analysisResult.complexity.difficulty_score}</text>
                        </svg>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '12px', color: 'white' }}>
                          Difficulty Level: <strong style={{ color: 'var(--color-primary)' }}>
                            {analysisResult.complexity.difficulty_score > 75 ? 'Advanced' : analysisResult.complexity.difficulty_score > 45 ? 'Intermediate' : 'Basic'}
                          </strong>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Math Density: <strong>{analysisResult.complexity.math_density}</strong>
                        </div>
                      </div>
                    </div>
                    {analysisResult.complexity.prerequisites && analysisResult.complexity.prerequisites.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '100%', marginBottom: '2px' }}>Prerequisites:</span>
                        {analysisResult.complexity.prerequisites.map((prereq: string, pIdx: number) => (
                          <span key={pIdx} className="prereq-tag" style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', color: 'white' }}>{prereq}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {analysisResult.claims && analysisResult.claims.length > 0 ? (
                  analysisResult.claims.map((c, idx) => (
                    <div key={idx} className="glass-card claim-card">
                      <div className="claim-header-row">
                        <span className="category-tag">{c.category}</span>
                        <span className={`status-badge ${c.status.toLowerCase()}`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="claim-text-content">"{c.claim}"</div>
                      {c.context && <div className="claim-context">Context: "{c.context}"</div>}
                      {c.stats_referenced && (
                        <div className="claim-stats-ref">
                          📊 Stats: {c.stats_referenced}
                        </div>
                      )}
                      
                      <button 
                        className="claim-expand-trigger"
                        onClick={() => setExpandedClaim(expandedClaim === idx ? null : idx)}
                      >
                        {expandedClaim === idx ? 'Collapse Details ▲' : 'View Verification Evidence ▼'}
                      </button>

                      {expandedClaim === idx && (
                        <div className="claim-expansion animate-fade-in">
                          <div className="claim-explanation-box">
                            {c.explanation || 'No verification reasoning text returned.'}
                          </div>
                          
                          {c.evidence_sources && c.evidence_sources.length > 0 && (
                            <div>
                              <div className="evidence-header">Corroborating Academic Sources</div>
                              <div className="evidence-list">
                                {c.evidence_sources.map((src, sIdx) => (
                                  <div key={sIdx} className="evidence-item">
                                    <a href={src.url || '#'} target="_blank" rel="noreferrer" className="evidence-title">
                                      {src.title}
                                    </a>
                                    <div className="evidence-meta">
                                      By {src.authors && src.authors.length > 0 ? src.authors[0] : 'Unknown'} ({src.year}) | Citations: {src.citation_count}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p>No claims extracted from this document.</p>
                )}
              </div>
            )}

            {/* Tab 2: Concept map rendering */}
            {activeTab === 'map' && (
              <div className="map-tab-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="view-toggle-bar" style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <button 
                    className={`toggle-sub-btn ${mapViewMode === 'graph' ? 'active' : ''}`}
                    onClick={() => setMapViewMode('graph')}
                  >
                    Graph View
                  </button>
                  <button 
                    className={`toggle-sub-btn ${mapViewMode === 'timeline' ? 'active' : ''}`}
                    onClick={() => setMapViewMode('timeline')}
                  >
                    Timeline View
                  </button>
                  <button 
                    className={`toggle-sub-btn ${mapViewMode === 'authors' ? 'active' : ''}`}
                    onClick={() => setMapViewMode('authors')}
                  >
                    👤 Authors
                  </button>
                </div>

                {mapViewMode === 'graph' ? (
                  <>
                    <div className="canvas-wrapper">
                      <canvas ref={canvasRef} className="map-canvas" />
                    </div>
                    
                    {/* Dynamic details card for hovered node */}
                    <div className="map-node-card" style={{ minHeight: '100px' }}>
                      {hoveredNode ? (
                        <>
                          <span className={`node-card-type ${hoveredNode.type}`}>
                            {hoveredNode.type === 'similar_paper' ? 'Related Paper' : hoveredNode.type}
                          </span>
                          <div className="node-card-label">{hoveredNode.label}</div>
                          <div className="node-card-details">
                            {hoveredNode.details}
                            {hoveredNode.type === 'similar_paper' && (
                              <div style={{ marginTop: '8px', color: '#6366F1', fontWeight: 600 }}>
                                Click node to open publication ↗
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '20px' }}>
                          Hover over any graph node to inspect relationships
                        </div>
                      )}
                    </div>
                  </>
                ) : mapViewMode === 'authors' ? (
                  /* Author Impact Network View */
                  <div className="author-network-container animate-fade-in" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                    <h3 className="integrity-block-title" style={{ marginTop: 0 }}>👤 Author Impact Network</h3>
                    {analysisResult.author_network && analysisResult.author_network.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {analysisResult.author_network.map((author: AuthorProfile, idx: number) => {
                          const maxH = 60;
                          const pct = Math.min(100, Math.round((author.h_index / maxH) * 100));
                          const circumference = 2 * Math.PI * 20;
                          const dashOffset = circumference - (pct / 100) * circumference;
                          const hColor = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#6366f1';
                          return (
                            <div key={idx} className="author-card glass-card">
                              <div className="author-card-header">
                                <div className="author-gauge-wrapper">
                                  <svg className="author-gauge-svg" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" cx="24" cy="24" r="20" />
                                    <circle
                                      fill="none"
                                      stroke={hColor}
                                      strokeWidth="3.5"
                                      strokeLinecap="round"
                                      cx="24" cy="24" r="20"
                                      strokeDasharray={`${circumference}`}
                                      strokeDashoffset={`${dashOffset}`}
                                      style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1)' }}
                                    />
                                    <text x="24" y="29" fill={hColor} fontSize="10" fontWeight="800" textAnchor="middle" style={{ transform: 'rotate(90deg)', transformOrigin: '50%', fontFamily: 'var(--font-display)' }}>h{author.h_index}</text>
                                  </svg>
                                </div>
                                <div className="author-card-info">
                                  <div className="author-name">{author.name}</div>
                                  <div className="author-affiliation">🏛 {author.affiliation}</div>
                                  {author.co_authors.length > 0 && (
                                    <div className="author-coauthors">
                                      <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Co-Authors: </span>
                                      {author.co_authors.map((ca: string, i: number) => (
                                        <span key={i} className="author-coauthor-tag">{ca}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {author.top_papers.length > 0 && (
                                <div className="author-top-papers">
                                  <div className="author-section-label">🏆 Top Cited Publications</div>
                                  {author.top_papers.map((paper: { title: string; year: number; citations: number }, pi: number) => (
                                    <div key={pi} className="author-paper-row">
                                      <div className="author-paper-title">{paper.title}</div>
                                      <div className="author-paper-meta">
                                        <span>{paper.year}</span>
                                        <span className="author-citation-badge">📖 {paper.citations.toLocaleString()} citations</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', padding: '24px', textAlign: 'center' }}>
                        No author profiles compiled for this paper yet.
                      </div>
                    )}
                  </div>
                ) : (
                  /* Timeline View */
                  <div className="timeline-view-container glass-card" style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 300px)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <h3 className="integrity-block-title" style={{ marginTop: 0 }}>Evolution Timeline</h3>
                    <div className="timeline-track">
                      {analysisResult.evolution_timeline && analysisResult.evolution_timeline.length > 0 ? (
                        analysisResult.evolution_timeline.map((evt: any, idx: number) => (
                          <div key={idx} className={`timeline-node-card ${evt.relationship.toLowerCase().replace(/\s+/g, "-")}`}>
                            <div className="timeline-node-dot" />
                            <div className="timeline-node-header">
                              <span className="timeline-node-year">{evt.year}</span>
                              <span className="timeline-node-rel">{evt.relationship}</span>
                            </div>
                            <div className="timeline-node-title">{evt.title}</div>
                            {evt.authors && evt.authors.length > 0 && (
                              <div className="timeline-node-authors">By {evt.authors.join(', ')}</div>
                            )}
                            <div className="timeline-node-mutation">
                              <strong>Scientific evolution:</strong> {evt.claim_mutation}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--text-secondary)', padding: '16px', textAlign: 'center' }}>
                          No chronological citation lineage compiled.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Integrity hub */}
            {activeTab === 'integrity' && analysisResult.integrity_report && (
              <div className="integrity-section animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="sub-pills-navigation" style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <button className="toggle-sub-btn" onClick={() => setActiveTab('claims')}>Claims List</button>
                  <button className="toggle-sub-btn active" onClick={() => setActiveTab('integrity')}>Integrity Audit</button>
                  <button className="toggle-sub-btn" onClick={() => setActiveTab('review')}>Peer Review</button>
                </div>
                {/* Pulsing red banner for retraction warnings */}
                {analysisResult.integrity_report.retracted && (
                  <div className="retraction-banner">
                    <span className="retraction-icon">🚨</span>
                    <div>
                      <div className="retraction-title">RETRACTED PAPER WARNING</div>
                      <div className="retraction-text">
                        {analysisResult.integrity_report.retraction_details || 'This publication has been flagged as retracted in academic directories.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Retracted Citations List */}
                {analysisResult.integrity_report.retracted_citations_count > 0 && (
                  <div className="glass-card" style={{ borderColor: 'var(--color-danger)' }}>
                    <div className="anomaly-type" style={{ color: 'var(--color-danger)', marginBottom: '8px' }}>
                      🚨 Retracted Citation Detected
                    </div>
                    <div className="anomaly-message" style={{ marginBottom: '10px' }}>
                      This paper references {analysisResult.integrity_report.retracted_citations_count} paper(s) that have since been retracted:
                    </div>
                    {analysisResult.integrity_report.retracted_citations_list.map((r, rIdx) => (
                      <div key={rIdx} style={{ fontSize: '11px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px' }}>
                        <strong>{r.title}</strong><br/>
                        Reason: {r.retraction_reason}
                      </div>
                    ))}
                  </div>
                )}

                {/* Statistical anomalies */}
                <div>
                  <h3 className="integrity-block-title">Statistical Anomalies</h3>
                  {analysisResult.stats_anomalies && analysisResult.stats_anomalies.length > 0 ? (
                    analysisResult.stats_anomalies.map((anom, idx) => (
                      <div key={idx} className="glass-card stats-anomaly-item">
                        <div className="anomaly-title-row">
                          <span className="anomaly-type">{anom.type}</span>
                          <span className={`anomaly-severity ${anom.severity.toLowerCase()}`}>
                            {anom.severity} Severity
                          </span>
                        </div>
                        <div className="anomaly-message">{anom.message}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--color-success)', fontSize: '13px' }}>
                      ✓ No severe statistical red flags detected (p-hacking, sample issues).
                    </div>
                  )}
                </div>

                {/* Methodology Red Flags */}
                <div>
                  <h3 className="integrity-block-title">Methodology Red Flags</h3>
                  {analysisResult.integrity_report.methodology_flags && analysisResult.integrity_report.methodology_flags.length > 0 ? (
                    analysisResult.integrity_report.methodology_flags.map((flag: any, idx: number) => (
                      <div key={idx} className="glass-card methodology-flag-card" style={{ marginBottom: '8px', padding: '12px' }}>
                        <div className="claim-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, color: 'white', fontSize: '12px' }}>⚠️ {flag.issue}</span>
                          <span className={`status-badge risk-${flag.risk_level.toLowerCase()}`} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: flag.risk_level === 'High' ? 'rgba(239, 68, 68, 0.15)' : flag.risk_level === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)', color: flag.risk_level === 'High' ? '#ef4444' : flag.risk_level === 'Medium' ? '#f59e0b' : '#06b6d4' }}>
                            {flag.risk_level} Risk
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                          {flag.explanation}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '6px', lineHeight: 1.4, background: 'rgba(99, 102, 241, 0.05)', padding: '6px', borderRadius: '4px' }}>
                          <strong>Replication Remedy:</strong> {flag.remedy}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--color-success)', fontSize: '13px' }}>
                      ✓ No critical methodology red flags detected.
                    </div>
                  )}
                </div>

                {/* Chart Flags */}
                {analysisResult.integrity_report.chart_flags && analysisResult.integrity_report.chart_flags.length > 0 && (
                  <div>
                    <h3 className="integrity-block-title">Visual Layout & Data Flags</h3>
                    {analysisResult.integrity_report.chart_flags.map((flag, idx) => (
                      <div key={idx} className="glass-card" style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-warning)', fontSize: '12px' }}>
                          ⚠️ {flag.figure}: {flag.issue}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Severity: {flag.severity}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Conflict of interest */}
                <div>
                  <h3 className="integrity-block-title">Disclosures & COI</h3>
                  <div className="glass-card">
                    <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
                      {analysisResult.integrity_report.coi_disclosure}
                    </div>
                    {analysisResult.integrity_report.coi_bias_detected && (
                      <div style={{ marginTop: '8px', color: 'var(--color-warning)', fontWeight: 600, fontSize: '11px' }}>
                        ⚠️ Potential funding or institutional bias detected in text parameters.
                      </div>
                    )}
                  </div>
                </div>

                {/* Bias Meter */}
                {analysisResult.integrity_report.bias_meter && (
                  <div>
                    <h3 className="integrity-block-title">COI Funding Bias Meter</h3>
                    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Sponsor Type: <strong style={{ color: 'var(--color-primary)' }}>{analysisResult.integrity_report.bias_meter.sponsor_category}</strong></span>
                        <span className={`anomaly-severity ${analysisResult.integrity_report.bias_meter.bias_rating.toLowerCase()}`}>
                          {analysisResult.integrity_report.bias_meter.bias_rating} Bias Risk
                        </span>
                      </div>
                      <div className="bias-meter-bar-container">
                        <div 
                          className="bias-meter-bar-fill"
                          style={{ 
                            width: `${analysisResult.integrity_report.bias_meter.corporate_influence_ratio * 100}%`,
                            background: analysisResult.integrity_report.bias_meter.bias_rating === 'High' ? 'var(--color-danger)' : analysisResult.integrity_report.bias_meter.bias_rating === 'Medium' ? 'var(--color-warning)' : 'var(--color-success)'
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Academic Independence: {((1 - analysisResult.integrity_report.bias_meter.corporate_influence_ratio) * 100).toFixed(0)}%</span>
                        <span>Corporate Influence: {(analysisResult.integrity_report.bias_meter.corporate_influence_ratio * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ fontSize: '12px', lineHeight: 1.4, marginTop: '4px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        "{analysisResult.integrity_report.bias_meter.explanation}"
                      </div>
                    </div>
                  </div>
                )}

                {/* Code availability */}
                <div>
                  <h3 className="integrity-block-title">Reproducibility Statements</h3>
                  <div className="glass-card">
                    <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
                      {analysisResult.integrity_report.data_availability}
                    </div>
                  </div>
                </div>

                {/* Statistical Power Calculator */}
                <div>
                  <h3 className="integrity-block-title">Interactive Statistical Power Calculator</h3>
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Validate the statistical viability of study assertions. Slide sample size and expected effect sizes to calculate statistical power (1 - &beta;).
                    </div>
                    
                    <div className="slider-control">
                      <div className="slider-header">
                        <span>Sample Size (N)</span>
                        <strong>{powerN}</strong>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="500" 
                        value={powerN} 
                        onChange={(e) => setPowerN(parseInt(e.target.value))} 
                        className="power-slider"
                      />
                    </div>

                    <div className="slider-control">
                      <div className="slider-header">
                        <span>Effect Size (Cohen's d)</span>
                        <strong>{powerD}</strong>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1.5" 
                        step="0.05"
                        value={powerD} 
                        onChange={(e) => setPowerD(parseFloat(e.target.value))} 
                        className="power-slider"
                      />
                    </div>

                    <div className="slider-control">
                      <div className="slider-header">
                        <span>Significance Level (&alpha;)</span>
                        <strong>{powerAlpha}</strong>
                      </div>
                      <input 
                        type="range" 
                        min="0.01" 
                        max="0.10" 
                        step="0.01"
                        value={powerAlpha} 
                        onChange={(e) => setPowerAlpha(parseFloat(e.target.value))} 
                        className="power-slider"
                      />
                    </div>

                    <div className="power-result-box" style={{ 
                      background: calculatePowerValue(powerN, powerD, powerAlpha) >= 80 ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                      borderColor: calculatePowerValue(powerN, powerD, powerAlpha) >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                    }}>
                      <div style={{ fontSize: '28px', fontWeight: 800, textAlign: 'center', color: calculatePowerValue(powerN, powerD, powerAlpha) >= 80 ? '#10B981' : '#EF4444' }}>
                        {calculatePowerValue(powerN, powerD, powerAlpha)}%
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center', marginTop: '4px', color: 'var(--text-secondary)' }}>
                        Calculated Statistical Power (1 - &beta;)
                      </div>
                      <div style={{ fontSize: '11px', textAlign: 'center', marginTop: '6px', color: 'var(--text-muted)' }}>
                        {calculatePowerValue(powerN, powerD, powerAlpha) >= 80 
                          ? "✓ Viable: Power exceeds the standard academic threshold of 80%." 
                          : "⚠️ Underpowered: High probability of Type II error (false negatives)."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Research Gaps & Novel Hypotheses */}
                <div>
                  <h3 className="integrity-block-title">Research Gap Radar</h3>
                  <ul className="research-gap-list">
                    {analysisResult.research_gaps && analysisResult.research_gaps.map((gap, idx) => (
                      <li key={idx} style={{ fontSize: '12px' }}>{gap}</li>
                    ))}
                  </ul>
                </div>

                {/* Hypothesis Engine */}
                <div>
                  <h3 className="integrity-block-title">Generated Research Hypotheses</h3>
                  {analysisResult.hypotheses && analysisResult.hypotheses.map((hyp, idx) => (
                    <div key={idx} className="hypothesis-item" style={{ marginBottom: '12px' }}>
                      <div className="hypothesis-name">{hyp.name}</div>
                      <div className="hypothesis-desc">{hyp.description}</div>
                      <div className="hypothesis-method">
                        <strong>Proposed Method:</strong> {hyp.method}
                      </div>
                      <button
                        className="action-btn"
                        style={{ marginTop: '8px', padding: '6px 10px', fontSize: '11px', background: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.3)', color: '#EC4899', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        onClick={() => handleDesignProtocol(hyp.name, hyp.description)}
                      >
                        🧪 Design Protocol
                      </button>
                    </div>
                  ))}
                </div>

                {/* Leaderboards */}
                {analysisResult.benchmarks && analysisResult.benchmarks.length > 0 && (
                  <div>
                    <h3 className="integrity-block-title">SOTA Benchmark Tracking</h3>
                    {analysisResult.benchmarks.map((b, idx) => (
                      <div key={idx} className="glass-card" style={{ fontSize: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{b.task}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                          <span>Paper Metric: <strong style={{ color: 'var(--color-primary)' }}>{b.paper_value}</strong></span>
                          <span>SOTA Metric: <strong>{b.sota_value}</strong></span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                          Source: {b.source}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Jargon Explainer Floating Card */}
      {selectedText && (
        <div className="jargon-explainer-card animate-fade-in">
          <div className="jargon-header">
            <span className="jargon-title">💡 Jargon Explainer</span>
            <button className="jargon-close" onClick={() => setSelectedText('')}>&times;</button>
          </div>
          <div className="jargon-phrase">"{selectedText}"</div>
          
          {explainingLoading ? (
            <div className="typing-indicator" style={{ padding: '8px 0' }}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : jargonExplanation ? (
            <>
              <div className="jargon-explanation">{jargonExplanation}</div>
              <button
                onClick={() => {
                  saveToNotes(selectedText, jargonExplanation);
                }}
                style={{
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '6px',
                  color: '#a5b4fc',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  alignSelf: 'flex-start',
                  transition: 'all 0.2s'
                }}
              >
                📌 Save to Notes
              </button>
            </>
          ) : (
            <button className="action-btn" onClick={handleExplainJargon} style={{ padding: '6px 12px', fontSize: '12px', alignSelf: 'flex-start', marginTop: '4px' }}>
              Explain Term
            </button>
          )}
        </div>
      )}

      {/* Experiment Copilot Modal Drawer */}
      {showProtocolModal && (
        <div className="compare-modal-overlay animate-fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10001, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div className="compare-modal-content glass-panel" style={{ width: '100%', height: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', background: 'rgba(10, 12, 22, 0.98)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div className="sidebar-header" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="brand-name" style={{ fontSize: '13px', color: 'white', fontWeight: 700 }}>🧪 Experiment Protocol</span>
              <button className="close-btn" onClick={() => setShowProtocolModal(false)} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', fontSize: '18px', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{activeHypothesisName}</div>
              {protocolLoading ? (
                <div className="loader-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px' }}>
                  <div className="spinner-ring"></div>
                  <div className="loading-text" style={{ fontSize: '13px', color: '#9CA3AF' }}>Generating protocol...</div>
                </div>
              ) : (
                <div className="markdown-protocol-content" style={{ fontSize: '11px', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {protocolContent}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

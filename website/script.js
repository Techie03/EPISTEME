/**
 * EPISTEME — Cyberpunk Marketing Page Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle Logic
  const body = document.getElementById('body');
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  
  // Check localStorage for preferred theme
  const savedTheme = localStorage.getItem('episteme-theme') || 'dark';
  if (savedTheme === 'light') {
    body.classList.remove('dark');
    body.classList.add('light');
    themeIcon.textContent = '🌙';
  } else {
    body.classList.remove('light');
    body.classList.add('dark');
    themeIcon.textContent = '☀';
  }

  themeToggle.addEventListener('click', () => {
    if (body.classList.contains('dark')) {
      body.classList.remove('dark');
      body.classList.add('light');
      themeIcon.textContent = '🌙';
      localStorage.setItem('episteme-theme', 'light');
    } else {
      body.classList.remove('light');
      body.classList.add('dark');
      themeIcon.textContent = '☀';
      localStorage.setItem('episteme-theme', 'dark');
    }
  });

  // Cyberpunk Particles System
  const particlesContainer = document.getElementById('particles');
  const particleCount = 40;

  for (let i = 0; i < particleCount; i++) {
    createParticle();
  }

  function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random styling
    const size = Math.random() * 3 + 1; // 1px to 4px
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}vw`;
    
    // Animation configurations
    const duration = Math.random() * 15 + 8; // 8s to 23s
    const delay = Math.random() * -20; // Start off-screen immediately
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${delay}s`;
    
    particlesContainer.appendChild(particle);

    // Re-create particle once animation cycle finishes
    particle.addEventListener('animationend', () => {
      particle.style.left = `${Math.random() * 100}vw`;
      // Reset animations
      particle.style.animation = 'none';
      void particle.offsetWidth; // trigger reflow
      particle.style.animation = `float-particle ${Math.random() * 15 + 8}s linear infinite`;
    });
  }

  // Interactive Glitch Terminal Typist
  const terminalBody = document.getElementById('terminalBody');
  const cursorLine = terminalBody.querySelector('.t-line:last-child');
  
  const mockLogs = [
    { type: 'cmd', text: 'cross-checking database: Semantic Scholar & OpenAlex...' },
    { type: 'ok', tag: '✓ VERIFY', text: 'Reference validity index: 98.4% — No retraction flags found' },
    { type: 'ok', tag: '✓ METHOD', text: 'Reproducibility factor scored: High (Docker & Data links verified)' },
    { type: 'warn', tag: '⚠ BIAS', text: 'COI: Partial corporate backing detected (Section 6.2)' },
    { type: 'cmd', text: 'building author network profiles...' },
    { type: 'ok', tag: '✓ NETWORK', text: 'Mapped co-author linkages: 8 collaborators found' },
    { type: 'info', tag: 'ℹ MODEL', text: 'Experiment Copilot: Generated 1 replication protocol (Markdown format)' },
    { type: 'ok', tag: '✓ DONE', text: 'Episteme analysis complete. View ready in Sidebar UI.' }
  ];

  let logIndex = 0;
  
  function typeLogLine() {
    if (logIndex >= mockLogs.length) {
      return;
    }

    const log = mockLogs[logIndex];
    const line = document.createElement('div');
    line.className = 't-line t-output';
    
    if (log.type === 'cmd') {
      line.innerHTML = `<span class="t-prompt">❯</span> <span class="t-cmd">${log.text}</span>`;
    } else {
      const tagClass = log.type === 'ok' ? 'tag-ok' : (log.type === 'warn' ? 'tag-warn' : 'tag-info');
      line.innerHTML = `<span class="t-tag ${tagClass}">${log.tag}</span> ${log.text}`;
    }

    // Insert before the cursor line
    terminalBody.insertBefore(line, cursorLine);
    
    // Auto-scroll terminal if it overflows
    terminalBody.scrollTop = terminalBody.scrollHeight;
    
    logIndex++;
    setTimeout(typeLogLine, Math.random() * 2000 + 1000);
  }

  // Start typewriter effect after 2s
  setTimeout(typeLogLine, 2000);
});

// Code Copier Function
window.copyCode = function(button, elementId) {
  const codeElement = document.getElementById(elementId);
  if (!codeElement) return;

  const originalText = button.textContent;
  const codeText = codeElement.textContent;

  navigator.clipboard.writeText(codeText).then(() => {
    button.textContent = 'Copied!';
    button.style.background = 'rgba(0, 255, 136, 0.15)';
    button.style.color = '#00ff88';
    button.style.borderColor = 'rgba(0, 255, 136, 0.4)';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
      button.style.color = '';
      button.style.borderColor = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
};

/**
 * Kadence Voice Assistant - Embed Button
 * Copy and paste this entire script into your Learnworlds HTML/JavaScript injection
 */
(function() {
  // Add button styles
  const style = document.createElement('style');
  style.textContent = `
    .kadence-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #4285f4;
      color: white;
      border: none;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }
    .kadence-btn:hover {
      transform: scale(1.05);
      background-color: #1a73e8;
    }
    .kadence-icon {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }
    .kadence-iframe {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 350px;
      height: 500px;
      border: none;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 9998;
      display: none;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
    }
    .kadence-iframe.open {
      display: block;
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  // Get user info from Learnworlds
  const username = "{{USER.NAME}}" || "Student";
  const userId = "{{USER.ID}}" || "anonymous";
  const currentUrl = window.location.href;
  const currentPath = window.location.pathname;

  // Create button
  const btn = document.createElement('button');
  btn.className = 'kadence-btn';
  btn.setAttribute('aria-label', 'Open Kadence Voice Assistant');
  btn.innerHTML = `<svg class="kadence-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6z"/>
    <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/>
  </svg>`;
  document.body.appendChild(btn);

  // Create iframe (hidden initially)
  const iframe = document.createElement('iframe');
  iframe.className = 'kadence-iframe';
  iframe.src = `https://kadence-multimodal.vercel.app/embed?username=${encodeURIComponent(username)}&userId=${encodeURIComponent(userId)}&currentUrl=${encodeURIComponent(currentUrl)}&currentPath=${encodeURIComponent(currentPath)}`;
  iframe.setAttribute('allow', 'microphone');
  document.body.appendChild(iframe);

  // Toggle iframe visibility on button click
  let isOpen = false;
  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.classList.add('open');
      // Notify the iframe that it's been opened
      setTimeout(() => {
        iframe.contentWindow.postMessage({action: 'open', fromParent: true}, '*');
      }, 300);
    } else {
      iframe.classList.remove('open');
      // Notify the iframe that it's been closed
      iframe.contentWindow.postMessage({action: 'close', fromParent: true}, '*');
    }
  });

  // Listen for messages from the iframe
  window.addEventListener('message', (event) => {
    // Only accept messages from our iframe
    if (event.source !== iframe.contentWindow) return;
    
    // Handle close request from iframe
    if (event.data.action === 'closeFrame') {
      isOpen = false;
      iframe.classList.remove('open');
    }
  });
})(); 
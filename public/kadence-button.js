/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function() {
  // Kadence API URL - this should be the URL to your deployed Kadence API
  const KADENCE_API_URL = 'https://your-kadence-app-url.com';
  
  // Get user config from window if available
  const userConfig = window.chatbotConfig || {
    username: 'Student',
    userId: 'anonymous',
    currentUrl: window.location.href,
    currentPath: window.location.pathname
  };

  // Create CSS styles
  const styles = `
    .kadence-wrapper {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
    }

    .kadence-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #4285f4;
      color: white;
      border: none;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .kadence-button:hover {
      background-color: #1a73e8;
      transform: scale(1.05);
    }

    .kadence-button .icon {
      width: 28px;
      height: 28px;
    }

    .kadence-popup {
      display: none;
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 320px;
      height: 400px;
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      flex-direction: column;
      z-index: 9999;
    }

    .kadence-popup.open {
      display: flex;
    }

    .kadence-header {
      padding: 16px;
      background-color: #4285f4;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 500;
    }

    .kadence-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .kadence-close:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .kadence-iframe {
      flex: 1;
      border: none;
      width: 100%;
      height: 100%;
    }
  `;

  // Add Google Material Icons
  function loadMaterialIcons() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0';
    document.head.appendChild(link);
  }

  // Create button and popup
  function createKadenceButton() {
    // Create style element
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'kadence-wrapper';
    
    // Create button
    const button = document.createElement('button');
    button.className = 'kadence-button';
    button.innerHTML = '<span class="material-symbols-outlined">record_voice_over</span>';
    button.setAttribute('aria-label', 'Open Kadence AI Assistant');
    wrapper.appendChild(button);
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'kadence-popup';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'kadence-header';
    header.innerHTML = '<span>Kadence AI Assistant</span>';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'kadence-close';
    closeButton.innerHTML = '<span class="material-symbols-outlined">close</span>';
    closeButton.setAttribute('aria-label', 'Close Kadence AI Assistant');
    header.appendChild(closeButton);
    popup.appendChild(header);
    
    // Create iframe with user parameters
    const iframe = document.createElement('iframe');
    iframe.className = 'kadence-iframe';
    
    // Build URL with user parameters
    const url = new URL(KADENCE_API_URL);
    url.searchParams.append('username', userConfig.username);
    url.searchParams.append('userId', userConfig.userId);
    url.searchParams.append('embedded', 'true');
    
    iframe.src = url.toString();
    popup.appendChild(iframe);
    
    wrapper.appendChild(popup);
    
    // Add to document
    document.body.appendChild(wrapper);
    
    // Add event listeners
    button.addEventListener('click', () => {
      popup.classList.add('open');
      // Send message to iframe to start connection
      setTimeout(() => {
        iframe.contentWindow.postMessage({ action: 'connect', userConfig }, '*');
      }, 500);
    });
    
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.classList.remove('open');
      // Send message to iframe to disconnect
      iframe.contentWindow.postMessage({ action: 'disconnect' }, '*');
    });
    
    return wrapper;
  }

  // Initialize when DOM is ready
  function init() {
    loadMaterialIcons();
    createKadenceButton();
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 
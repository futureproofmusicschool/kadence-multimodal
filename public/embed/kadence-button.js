/**
 * Kadence Button - LearnWorlds embeddable button for Kadence Voice
 * This creates a nice button that can be embedded directly in LearnWorlds content
 */

(function() {
  // Configuration
  const KADENCE_VOICE_SCRIPT = 'https://kadence-multimodal.vercel.app/embed/kadence-voice.js';
  
  // Create and add CSS for the button
  function addStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .kadence-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: #1a73e8;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 10px 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 10px 0;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      
      .kadence-button:hover {
        background-color: #0d62d0;
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
      }
      
      .kadence-button svg {
        margin-right: 8px;
      }
      
      .kadence-button-icon {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }
    `;
    document.head.appendChild(styleEl);
  }
  
  // Create a Kadence button
  function createButton(options = {}) {
    const { 
      text = 'Talk to Kadence',
      target = document.body,
      position = 'beforeend' 
    } = options;
    
    const button = document.createElement('button');
    button.className = 'kadence-button';
    button.innerHTML = `
      <svg class="kadence-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
        <path d="M480-423q-43 0-72-30.917-29-30.916-29-73.083v-240q0-41.667 29.441-71.333Q437.882-868 479.941-868t71.559 29.667Q581-808.667 581-767v240q0 42.167-29 73.083Q523-423 480-423Zm0-228Zm-30 498v-120q-106-11-178-89t-72-184h60q0 91 64.5 152.5T480-333q95 0 159.5-61.5T704-547h60q0 106-72 184t-178 89v120h-60Zm30-330q18 0 29.5-13.5T521-527v-240q0-17-11.5-28.5T480-807q-17 0-28.5 11.5T440-767v240q0 18 11.5 31.5T480-483Z"/>
      </svg>
      ${text}
    `;
    
    button.addEventListener('click', loadKadenceVoice);
    
    if (typeof target === 'string') {
      document.querySelector(target).insertAdjacentElement(position, button);
    } else {
      target.insertAdjacentElement(position, button);
    }
    
    return button;
  }
  
  // Load the Kadence voice script
  function loadKadenceVoice() {
    if (window.kadenceVoiceLoaded) return;
    
    const script = document.createElement('script');
    script.src = KADENCE_VOICE_SCRIPT;
    script.onload = () => {
      window.kadenceVoiceLoaded = true;
    };
    document.head.appendChild(script);
  }
  
  // Initialize when DOM is ready
  function init() {
    addStyles();
    
    // Look for any .kadence-button-container elements
    const containers = document.querySelectorAll('.kadence-button-container');
    containers.forEach(container => {
      createButton({
        text: container.getAttribute('data-text') || 'Talk to Kadence',
        target: container,
        position: 'afterbegin'
      });
    });
    
    // Make API available
    window.KadenceButton = {
      create: createButton,
      loadVoice: loadKadenceVoice
    };
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 
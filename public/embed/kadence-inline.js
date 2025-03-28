/**
 * Kadence Inline - Attach voice assistant to any existing element
 * This script allows attaching voice functionality to an existing element (like an image)
 */

(function() {
  // Configuration
  const KADENCE_API_ENDPOINT = '/api/gemini-proxy';
  const DEFAULT_WELCOME_MESSAGE = 'Hi there! I\'m Kadence, your AI music tutor. How can I help you today?';
  const AUDIO_PROCESSOR_SCRIPT = 'https://kadence-multimodal.vercel.app/embed/kadence-audio.js';
  
  // Widget state
  let isListening = false;
  let isInitialized = false;
  let audioProcessor = null;
  let username = '';
  let wsConnection = null;
  let triggerElement = null;
  let statusElement = null;
  let audioElement = null;
  
  // Initialize Kadence on the specified element
  window.initKadenceOnElement = function(selector, options = {}) {
    options = {
      statusPosition: 'overlay', // 'overlay', 'after', 'before'
      statusStyle: 'pulse',      // 'pulse', 'dot', 'indicator'
      autoStart: false,          // Whether to initialize immediately
      ...options
    };
    
    // Find the trigger element
    triggerElement = typeof selector === 'string' 
      ? document.querySelector(selector) 
      : selector;
    
    if (!triggerElement) {
      console.error('Kadence: Element not found:', selector);
      return;
    }
    
    // Create status indicator
    createStatusIndicator(options.statusPosition, options.statusStyle);
    
    // Create audio element
    audioElement = document.createElement('audio');
    audioElement.style.display = 'none';
    document.body.appendChild(audioElement);
    
    // Add click event to trigger element
    triggerElement.style.cursor = 'pointer';
    triggerElement.addEventListener('click', toggleVoiceAssistant);
    
    // Mark element as Kadence-enabled
    triggerElement.setAttribute('data-kadence-enabled', 'true');
    
    // Load audio processor script
    loadScript(AUDIO_PROCESSOR_SCRIPT);
    
    if (options.autoStart) {
      initializeVoiceAssistant();
    }
    
    return {
      start: startListening,
      stop: stopListening,
      toggle: toggleVoiceAssistant
    };
  };
  
  // Create status indicator based on position and style
  function createStatusIndicator(position, style) {
    // Create the status element
    statusElement = document.createElement('div');
    statusElement.className = 'kadence-status';
    
    // Add styles based on the requested style
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      .kadence-status {
        display: none;
        transition: all 0.3s ease;
      }
      
      .kadence-status.active {
        display: block;
      }
      
      /* Pulse style */
      .kadence-status.pulse {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: rgba(234, 67, 53, 0.6);
        position: absolute;
        z-index: 10000;
      }
      
      .kadence-status.pulse.active {
        animation: kadence-pulse 1.5s infinite;
      }
      
      @keyframes kadence-pulse {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.7);
        }
        
        70% {
          transform: scale(1);
          box-shadow: 0 0 0 10px rgba(234, 67, 53, 0);
        }
        
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(234, 67, 53, 0);
        }
      }
      
      /* Dot style */
      .kadence-status.dot {
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background-color: #888;
      }
      
      .kadence-status.dot.active {
        background-color: #ea4335;
      }
      
      /* Indicator style */
      .kadence-status.indicator {
        padding: 5px 10px;
        border-radius: 15px;
        background-color: #f2f2f2;
        color: #333;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        text-align: center;
      }
      
      .kadence-status.indicator.active {
        background-color: #ea4335;
        color: white;
      }
      
      /* Status text for indicator */
      .kadence-status.indicator:after {
        content: "Click to talk";
      }
      
      .kadence-status.indicator.active:after {
        content: "Listening...";
      }
    `;
    document.head.appendChild(styleSheet);
    
    // Add the class for the selected style
    statusElement.classList.add(style);
    
    // Position the status indicator
    if (position === 'overlay') {
      const rect = triggerElement.getBoundingClientRect();
      statusElement.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
      `;
      triggerElement.style.position = 'relative';
      triggerElement.appendChild(statusElement);
    } else if (position === 'after') {
      triggerElement.insertAdjacentElement('afterend', statusElement);
    } else if (position === 'before') {
      triggerElement.insertAdjacentElement('beforebegin', statusElement);
    }
    
    // Set initial content for indicator style
    if (style === 'indicator') {
      statusElement.textContent = 'Click to talk';
    }
  }
  
  // Load a script dynamically
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  // Toggle voice assistant state
  function toggleVoiceAssistant() {
    if (!isInitialized) {
      initializeVoiceAssistant();
      return;
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }
  
  // Initialize the voice assistant
  async function initializeVoiceAssistant() {
    try {
      // Get username from the page or URL
      username = getUsernameFromPage() || 'student';
      
      // Wait for audio processor to be available
      if (!window.KadenceAudioProcessor) {
        console.log('Waiting for audio processor to load...');
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (window.KadenceAudioProcessor) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }
      
      // Initialize audio processor
      audioProcessor = new window.KadenceAudioProcessor({
        onAudioData: (audioData) => {
          if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.send(JSON.stringify({ inputs: [audioData] }));
          }
        },
        onVolumeChange: (volume) => {
          // Update UI based on volume
          if (statusElement && statusElement.classList.contains('pulse')) {
            statusElement.style.transform = `translate(-50%, -50%) scale(${1 + volume * 0.5})`;
          }
        },
        onError: (error) => {
          console.error('Audio processor error:', error);
          stopListening();
        }
      });
      
      // Set up WebSocket connection
      await setupWebSocket();
      
      // Update UI
      isInitialized = true;
      
      // Start listening immediately after initialization
      startListening();
      
    } catch (error) {
      console.error('Failed to initialize voice assistant:', error);
      alert('Could not initialize voice assistant. Please make sure microphone access is allowed.');
    }
  }
  
  // Get username from page or URL
  function getUsernameFromPage() {
    // Try to get from LearnWorlds-specific elements or globals
    // Option 1: Check for a global variable that LearnWorlds might set
    if (window.LW && window.LW.user && window.LW.user.name) {
      return window.LW.user.name;
    }
    
    // Option 2: Look for user name in DOM
    const userElements = document.querySelectorAll('.user-name, .username, .user-profile-name');
    if (userElements.length > 0) {
      return userElements[0].textContent.trim();
    }
    
    // Option 3: Get from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('username');
  }
  
  // Set up WebSocket connection to Kadence backend
  async function setupWebSocket() {
    try {
      // Get secure WebSocket URL from proxy
      const response = await fetch(KADENCE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          wsUrl: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get secure WebSocket URL');
      }
      
      const data = await response.json();
      const secureWsUrl = data.secureWsUrl;
      
      // Close existing connection if any
      if (wsConnection) {
        wsConnection.close();
      }
      
      // Initialize WebSocket
      wsConnection = new WebSocket(secureWsUrl);
      
      // Set up event handlers
      wsConnection.onopen = handleConnectionOpen;
      wsConnection.onmessage = handleMessage;
      wsConnection.onerror = handleConnectionError;
      wsConnection.onclose = handleConnectionClose;
      
      // Wait for connection to open
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
        wsConnection.addEventListener('open', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
      });
      
    } catch (error) {
      console.error('WebSocket setup failed:', error);
      throw error;
    }
  }
  
  // WebSocket event handlers
  function handleConnectionOpen() {
    console.log('Connected to Kadence');
    
    // Send initial configuration
    const config = {
      model: "models/gemini-2.0-flash",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: `You are Kadence, an AI tutor at Futureproof Music School, specializing in electronic music production and creative direction. 
            Your core mission is to provide expert guidance to aspiring musicians in any language, helping them develop their production skills while finding their unique artistic voice.
            You respond to user voice inputs. Your main purpose is to provide helpful and informative responses to all user queries. Be concise, clear, and engaging in your responses.
            
            The current user's name is ${username}. Always address them by name occasionally to make the conversation more personal. Be friendly and supportive of their musical journey.`
          },
        ],
      },
    };
    
    wsConnection.send(JSON.stringify({ config }));
    
    // Send welcome message after a short delay
    setTimeout(() => {
      // Use native browser speech synthesis for the initial greeting
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(DEFAULT_WELCOME_MESSAGE);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    }, 1000);
  }
  
  function handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Handle audio data
      if (message.audio) {
        const audioData = atob(message.audio.data);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        
        for (let i = 0; i < audioData.length; i++) {
          uint8Array[i] = audioData.charCodeAt(i);
        }
        
        playAudio(arrayBuffer);
      }
      
      // Log text responses for debugging
      if (message.text) {
        console.log('Kadence:', message.text);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }
  
  function handleConnectionError(error) {
    console.error('WebSocket error:', error);
    updateListeningState(false);
    isInitialized = false;
  }
  
  function handleConnectionClose() {
    console.log('WebSocket connection closed');
    updateListeningState(false);
  }
  
  // Start listening for user voice input
  async function startListening() {
    if (!isInitialized || !audioProcessor) return;
    
    try {
      // Reconnect WebSocket if needed
      if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
        await setupWebSocket();
      }
      
      // Start audio processor
      await audioProcessor.startRecording();
      
      isListening = true;
      updateListeningState(true);
    } catch (error) {
      console.error('Failed to start listening:', error);
      updateListeningState(false);
    }
  }
  
  // Stop listening for user voice input
  function stopListening() {
    if (!isInitialized || !audioProcessor) return;
    
    audioProcessor.stopRecording();
    isListening = false;
    updateListeningState(false);
  }
  
  // Update UI to reflect listening state
  function updateListeningState(active) {
    if (statusElement) {
      if (active) {
        statusElement.classList.add('active');
      } else {
        statusElement.classList.remove('active');
      }
    }
    
    // Change cursor style
    if (triggerElement) {
      triggerElement.style.cursor = active ? 'default' : 'pointer';
    }
  }
  
  // Play audio from arraybuffer
  function playAudio(arrayBuffer) {
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    
    audioElement.src = url;
    audioElement.onended = () => {
      URL.revokeObjectURL(url);
      // Automatically start listening when AI finishes speaking
      if (isInitialized && !isListening) {
        startListening();
      }
    };
    audioElement.play();
  }
})(); 
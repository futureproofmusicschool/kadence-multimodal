/**
 * Kadence Voice Widget - Embeddable voice assistant for LearnWorlds
 * This script creates a minimalistic voice interface that can be embedded directly in LearnWorlds pages
 */

(function() {
  // Configuration
  const KADENCE_API_ENDPOINT = '/api/gemini-proxy';
  const DEFAULT_WELCOME_MESSAGE = 'Hi there! I\'m Kadence, your AI music tutor. How can I help you today?';
  
  // Audio processor script URL
  const AUDIO_PROCESSOR_SCRIPT = 'https://kadence-multimodal.vercel.app/embed/kadence-audio.js';
  
  // Widget state
  let isListening = false;
  let isInitialized = false;
  let audioProcessor = null;
  let username = '';
  let wsConnection = null;
  
  // DOM elements
  let widgetContainer = null;
  let actionButton = null;
  let statusIndicator = null;
  let audioElement = null;
  
  // Create the widget UI
  function createWidgetUI() {
    // Create widget container
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'kadence-voice-widget';
    widgetContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    
    // Create action button
    actionButton = document.createElement('button');
    actionButton.id = 'kadence-voice-button';
    actionButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-423q-43 0-72-30.917-29-30.916-29-73.083v-240q0-41.667 29.441-71.333Q437.882-868 479.941-868t71.559 29.667Q581-808.667 581-767v240q0 42.167-29 73.083Q523-423 480-423Zm0-228Zm-30 498v-120q-106-11-178-89t-72-184h60q0 91 64.5 152.5T480-333q95 0 159.5-61.5T704-547h60q0 106-72 184t-178 89v120h-60Zm30-330q18 0 29.5-13.5T521-527v-240q0-17-11.5-28.5T480-807q-17 0-28.5 11.5T440-767v240q0 18 11.5 31.5T480-483Z"/></svg>';
    actionButton.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #1a73e8;
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
    `;
    
    // Create status indicator
    statusIndicator = document.createElement('div');
    statusIndicator.id = 'kadence-status';
    statusIndicator.style.cssText = `
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: #888;
      margin-top: 5px;
      transition: all 0.3s ease;
    `;
    
    // Create audio element for playback
    audioElement = document.createElement('audio');
    audioElement.id = 'kadence-audio';
    audioElement.style.display = 'none';
    
    // Add elements to the widget container
    widgetContainer.appendChild(actionButton);
    widgetContainer.appendChild(statusIndicator);
    widgetContainer.appendChild(audioElement);
    
    // Add the widget to the document
    document.body.appendChild(widgetContainer);
    
    // Add event listeners
    actionButton.addEventListener('click', toggleVoiceAssistant);
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
  
  // Load the audio processor script
  function loadAudioProcessor() {
    return new Promise((resolve, reject) => {
      if (window.KadenceAudioProcessor) {
        resolve(window.KadenceAudioProcessor);
        return;
      }
      
      const script = document.createElement('script');
      script.src = AUDIO_PROCESSOR_SCRIPT;
      script.onload = () => resolve(window.KadenceAudioProcessor);
      script.onerror = () => reject(new Error('Failed to load audio processor'));
      document.head.appendChild(script);
    });
  }
  
  // Initialize the voice assistant
  async function initializeVoiceAssistant() {
    try {
      // Get username from the page (LearnWorlds specific)
      username = getUsernameFromPage() || 'student';
      
      // Load audio processor
      const AudioProcessor = await loadAudioProcessor();
      
      // Initialize audio processor
      audioProcessor = new AudioProcessor({
        onAudioData: (audioData) => {
          if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.send(JSON.stringify({ inputs: [audioData] }));
          }
        },
        onVolumeChange: (volume) => {
          // Update UI based on volume (e.g., animate button)
          statusIndicator.style.transform = `scale(${1 + volume})`;
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
  
  // Attempt to get username from LearnWorlds page
  function getUsernameFromPage() {
    // Try to get from LearnWorlds-specific elements or globals
    // This is a placeholder and should be customized for your LearnWorlds setup
    
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
      contents: [],
      model: "models/gemini-2.0-flash-exp",
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
    updateButtonState(false);
    isInitialized = false;
  }
  
  function handleConnectionClose() {
    console.log('WebSocket connection closed');
    updateButtonState(false);
    // Don't set isInitialized to false here, so we can reconnect
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
      updateButtonState(true);
    } catch (error) {
      console.error('Failed to start listening:', error);
      updateButtonState(false);
    }
  }
  
  // Stop listening for user voice input
  function stopListening() {
    if (!isInitialized || !audioProcessor) return;
    
    audioProcessor.stopRecording();
    isListening = false;
    updateButtonState(false);
  }
  
  // Update button appearance based on state
  function updateButtonState(active) {
    if (active) {
      actionButton.style.backgroundColor = '#ea4335'; // Red when active
      statusIndicator.style.backgroundColor = '#ea4335';
      actionButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>';
    } else {
      actionButton.style.backgroundColor = '#1a73e8'; // Blue when inactive
      statusIndicator.style.backgroundColor = '#888';
      actionButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-423q-43 0-72-30.917-29-30.916-29-73.083v-240q0-41.667 29.441-71.333Q437.882-868 479.941-868t71.559 29.667Q581-808.667 581-767v240q0 42.167-29 73.083Q523-423 480-423Zm0-228Zm-30 498v-120q-106-11-178-89t-72-184h60q0 91 64.5 152.5T480-333q95 0 159.5-61.5T704-547h60q0 106-72 184t-178 89v120h-60Zm30-330q18 0 29.5-13.5T521-527v-240q0-17-11.5-28.5T480-807q-17 0-28.5 11.5T440-767v240q0 18 11.5 31.5T480-483Z"/></svg>';
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
  
  // Initialize widget when the script is loaded
  function init() {
    createWidgetUI();
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 
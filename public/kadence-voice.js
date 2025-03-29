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
  // Configuration
  const DEFAULT_CONFIG = {
    apiEndpoint: "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent",
    proxyEndpoint: "https://kadence-multimodal.vercel.app/api/gemini-proxy",
    model: "models/gemini-2.0-flash",
    username: "Student"
  };
  
  // Get user config
  const userConfig = window.chatbotConfig || {};
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // UI Elements
  let audioContext = null;
  let audioStream = null;
  let audioRecorder = null;
  let websocket = null;
  let connected = false;
  let wrapper = null;
  let popup = null;
  let statusText = null;
  let toggleButton = null;
  
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
    
    .kadence-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .kadence-status {
      margin-bottom: 20px;
      color: #5f6368;
      text-align: center;
    }

    .kadence-toggle-button {
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 24px;
      padding: 8px 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .kadence-toggle-button:hover {
      background-color: #1a73e8;
    }

    .kadence-toggle-button.connected {
      background-color: #fbbc05;
    }

    .kadence-toggle-button.connected:hover {
      background-color: #f29900;
    }
    
    .kadence-volume-meter {
      width: 200px;
      height: 4px;
      background-color: #e0e0e0;
      border-radius: 2px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    
    .kadence-volume-level {
      height: 100%;
      width: 0%;
      background-color: #4285f4;
      transition: width 0.1s ease;
    }
  `;

  // Audio recorder class
  class AudioRecorder {
    constructor() {
      this.audioContext = null;
      this.stream = null;
      this.mediaRecorder = null;
      this.audioProcessor = null;
      this.volume = 0;
      this.callbacks = {
        data: [],
        volume: []
      };
    }
    
    async init() {
      if (this.audioContext) return;
      
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Set up volume analyzer
        const audioSource = this.audioContext.createMediaStreamSource(this.stream);
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4;
        audioSource.connect(analyser);
        
        // Set up recorder
        this.mediaRecorder = new MediaRecorder(this.stream);
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result.split(',')[1];
              this.callbacks.data.forEach(callback => callback(base64data));
            };
            reader.readAsDataURL(event.data);
          }
        };
        
        // Set up volume monitoring
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const checkVolume = () => {
          if (!this.mediaRecorder) return;
          
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          this.volume = sum / bufferLength / 255;
          this.callbacks.volume.forEach(callback => callback(this.volume));
          
          requestAnimationFrame(checkVolume);
        };
        checkVolume();
        
      } catch (error) {
        console.error('Error initializing audio recorder:', error);
        throw error;
      }
    }
    
    start() {
      if (!this.mediaRecorder) return;
      this.mediaRecorder.start(100);
    }
    
    stop() {
      if (!this.mediaRecorder) return;
      this.mediaRecorder.stop();
    }
    
    on(event, callback) {
      if (this.callbacks[event]) {
        this.callbacks[event].push(callback);
      }
      return this;
    }
    
    off(event, callback) {
      if (this.callbacks[event]) {
        this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
      }
      return this;
    }
  }
  
  // Set up WebSocket connection
  async function setupWebSocket() {
    if (websocket) {
      websocket.close();
    }
    
    try {
      // Get secure WebSocket URL through our proxy
      const response = await fetch(config.proxyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wsUrl: config.apiEndpoint }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get secure WebSocket URL');
      }
      
      const data = await response.json();
      const secureWsUrl = data.secureWsUrl;
      
      if (!secureWsUrl || !secureWsUrl.startsWith('wss://')) {
        throw new Error('Invalid WebSocket URL received');
      }
      
      // Create WebSocket connection
      websocket = new WebSocket(secureWsUrl);
      
      websocket.onopen = () => {
        console.log('WebSocket connection established');
        
        // Send initial configuration
        const initialMessage = {
          model: config.model,
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
                You respond to user voice inputs. You cannot view the user's screen or hear their music. Your main purpose is to provide helpful and informative responses to all user queries. Be concise, clear, and engaging in your responses.
                
                The current user's name is ${config.username}. Be friendly and supportive of their musical journey.
                
                Start the conversation by greeting ${config.username} and asking how their music is going today. 
                Do not mention their name again in the conversation.
                
                Notes on Pronounciation:
                
                Words should always be pronounced according to their common usage in a musical context.
                The word bass is always pronounced like base.`,
              },
            ],
          },
          tools: [
            { googleSearch: {} },
          ],
        };
        
        websocket.send(JSON.stringify(initialMessage));
        
        // Start sending an initial greeting
        setTimeout(() => {
          websocket.send(JSON.stringify({
            parts: [{ 
              text: `Hi ${config.username}, how's it going with your music today? I'm Kadence, your AI music tutor. I can help you with production techniques, creative direction, or any other music-related questions.` 
            }]
          }));
        }, 500);
        
        updateStatus(true);
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);
          
          // Handle audio responses
          if (data.modality === 'audio' && data.mimeType === 'audio/pcm;rate=16000') {
            playAudio(data.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onerror = handleConnectionError;
      websocket.onclose = () => {
        console.log('WebSocket connection closed');
        updateStatus(false);
      };
      
    } catch (error) {
      handleConnectionError(error);
    }
  }
  
  function handleConnectionError(error) {
    console.error('WebSocket error:', error);
    updateStatus(false);
    
    // Display error message to user
    if (statusText) {
      statusText.textContent = 'Connection error. Please try again.';
    }
  }
  
  // Play audio from base64 PCM data
  function playAudio(base64Data) {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }
    
    const audioBuffer = audioContext.createBuffer(1, floatData.length, 16000);
    audioBuffer.getChannelData(0).set(floatData);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  }
  
  // Update connection status UI
  function updateStatus(isConnected) {
    connected = isConnected;
    
    if (statusText) {
      statusText.textContent = connected ? 'Speaking with Kadence...' : 'Click Start to speak with Kadence';
    }
    
    if (toggleButton) {
      toggleButton.textContent = connected ? 'Pause' : 'Start';
      toggleButton.className = connected ? 'kadence-toggle-button connected' : 'kadence-toggle-button';
    }
  }
  
  // Toggle connection
  async function toggleConnection() {
    if (connected) {
      if (websocket) {
        websocket.close();
      }
      if (audioRecorder) {
        audioRecorder.stop();
      }
      updateStatus(false);
    } else {
      try {
        if (!audioRecorder) {
          audioRecorder = new AudioRecorder();
        }
        
        await audioRecorder.init();
        await setupWebSocket();
        
        audioRecorder.on('data', (base64data) => {
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
              realtimeInput: [{
                mimeType: "audio/pcm;rate=16000",
                data: base64data
              }]
            }));
          }
        });
        
        const volumeMeter = document.querySelector('.kadence-volume-level');
        if (volumeMeter) {
          audioRecorder.on('volume', (volume) => {
            volumeMeter.style.width = `${Math.min(volume * 100 * 3, 100)}%`;
          });
        }
        
        audioRecorder.start();
      } catch (error) {
        console.error('Error starting connection:', error);
        updateStatus(false);
      }
    }
  }
  
  // Create the Kadence UI
  function createKadenceUI() {
    // Add Google Material Icons
    const iconLink = document.createElement('link');
    iconLink.rel = 'stylesheet';
    iconLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0';
    document.head.appendChild(iconLink);
    
    // Add styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    
    // Create wrapper
    wrapper = document.createElement('div');
    wrapper.className = 'kadence-wrapper';
    
    // Create button
    const button = document.createElement('button');
    button.className = 'kadence-button';
    button.innerHTML = '<span class="material-symbols-outlined">record_voice_over</span>';
    button.setAttribute('aria-label', 'Open Kadence AI Assistant');
    wrapper.appendChild(button);
    
    // Create popup
    popup = document.createElement('div');
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
    
    // Create content
    const content = document.createElement('div');
    content.className = 'kadence-content';
    
    // Status text
    statusText = document.createElement('div');
    statusText.className = 'kadence-status';
    statusText.textContent = 'Click Start to speak with Kadence';
    content.appendChild(statusText);
    
    // Volume meter
    const volumeMeter = document.createElement('div');
    volumeMeter.className = 'kadence-volume-meter';
    const volumeLevel = document.createElement('div');
    volumeLevel.className = 'kadence-volume-level';
    volumeMeter.appendChild(volumeLevel);
    content.appendChild(volumeMeter);
    
    // Toggle button
    toggleButton = document.createElement('button');
    toggleButton.className = 'kadence-toggle-button';
    toggleButton.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> Start';
    toggleButton.addEventListener('click', toggleConnection);
    content.appendChild(toggleButton);
    
    popup.appendChild(content);
    wrapper.appendChild(popup);
    
    // Add to document
    document.body.appendChild(wrapper);
    
    // Add event listeners
    button.addEventListener('click', () => {
      popup.classList.add('open');
    });
    
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.classList.remove('open');
      
      // Disconnect if connected
      if (connected) {
        toggleConnection();
      }
    });
  }

  // Initialize when DOM is ready
  function init() {
    createKadenceUI();
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 
/**
 * Kadence Audio Module - Handles audio recording and processing
 * This module is used by the Kadence Voice Widget
 */

class KadenceAudioProcessor {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 16000;
    this.bufferSize = options.bufferSize || 4096;
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.isRecording = false;
    
    // Callbacks
    this.onAudioData = options.onAudioData || (() => {});
    this.onVolumeChange = options.onVolumeChange || (() => {});
    this.onError = options.onError || console.error;
  }
  
  /**
   * Initialize the audio context and request microphone access
   */
  async initialize() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
        latencyHint: 'interactive'
      });
      
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Create source node from microphone stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      return true;
    } catch (error) {
      this.onError('Failed to initialize audio: ' + error.message);
      return false;
    }
  }
  
  /**
   * Start recording audio
   */
  async startRecording() {
    if (this.isRecording) return;
    
    try {
      if (!this.audioContext) {
        const initialized = await this.initialize();
        if (!initialized) return;
      }
      
      // Resume audio context if it's suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Create script processor node for audio processing
      this.processorNode = this.audioContext.createScriptProcessor(
        this.bufferSize, 
        1, // input channels
        1  // output channels
      );
      
      // Process audio data
      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        
        const inputBuffer = e.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Calculate volume for UI updates
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const volume = Math.min(1, sum / inputData.length / 0.2);
        this.onVolumeChange(volume);
        
        // Convert to 16-bit PCM
        const pcmData = this.float32ToInt16(inputData);
        const base64Data = this.arrayBufferToBase64(pcmData.buffer);
        
        // Send audio data
        this.onAudioData({
          mimeType: "audio/pcm;rate=16000",
          data: base64Data
        });
      };
      
      // Connect nodes
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
      
      this.isRecording = true;
    } catch (error) {
      this.onError('Failed to start recording: ' + error.message);
    }
  }
  
  /**
   * Stop recording audio
   */
  stopRecording() {
    if (!this.isRecording) return;
    
    try {
      // Disconnect nodes
      if (this.processorNode) {
        this.processorNode.disconnect();
        this.sourceNode.disconnect();
        this.processorNode = null;
      }
      
      this.isRecording = false;
      this.onVolumeChange(0);
    } catch (error) {
      this.onError('Failed to stop recording: ' + error.message);
    }
  }
  
  /**
   * Release resources
   */
  release() {
    this.stopRecording();
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
  
  /**
   * Convert Float32Array to Int16Array
   */
  float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Convert -1.0 - 1.0 to -32768 - 32767
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }
  
  /**
   * Convert ArrayBuffer to Base64 string
   */
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

// Make available globally
window.KadenceAudioProcessor = KadenceAudioProcessor; 
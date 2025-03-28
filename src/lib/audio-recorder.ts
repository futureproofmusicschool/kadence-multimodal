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

import { audioContext } from "./utils";
import AudioRecordingWorklet from "./worklets/audio-processing";
import VolMeterWorket from "./worklets/vol-meter";

import { createWorketFromSrc } from "./audioworklet-registry";
import EventEmitter from "eventemitter3";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export class AudioRecorder extends EventEmitter {
  stream: MediaStream | undefined;
  audioContext: AudioContext | undefined;
  source: MediaStreamAudioSourceNode | undefined;
  additionalSource: MediaStreamAudioSourceNode | undefined;
  recording: boolean = false;
  recordingWorklet: AudioWorkletNode | undefined;
  vuWorklet: AudioWorkletNode | undefined;
  systemVuWorklet: AudioWorkletNode | undefined;

  private starting: Promise<void> | null = null;

  constructor(public sampleRate = 16000) {
    super();
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Could not request user media");
    }

    this.starting = new Promise(async (resolve, reject) => {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = await audioContext({ sampleRate: this.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      const workletName = "audio-recorder-worklet";
      const src = createWorketFromSrc(workletName, AudioRecordingWorklet);

      await this.audioContext.audioWorklet.addModule(src);
      this.recordingWorklet = new AudioWorkletNode(
        this.audioContext,
        workletName,
      );

      this.recordingWorklet.port.onmessage = async (ev: MessageEvent) => {
        // worklet processes recording floats and messages converted buffer
        const arrayBuffer = ev.data.data.int16arrayBuffer;

        if (arrayBuffer) {
          const arrayBufferString = arrayBufferToBase64(arrayBuffer);
          this.emit("data", arrayBufferString);
        }
      };
      this.source.connect(this.recordingWorklet);

      // vu meter worklet
      const vuWorkletName = "vu-meter";
      await this.audioContext.audioWorklet.addModule(
        createWorketFromSrc(vuWorkletName, VolMeterWorket),
      );
      this.vuWorklet = new AudioWorkletNode(this.audioContext, vuWorkletName);
      this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
        this.emit("volume", ev.data.volume);
      };

      this.source.connect(this.vuWorklet);
      this.recording = true;
      resolve();
      this.starting = null;
    });
  }

  /**
   * Connects an additional audio source (like system audio from screen sharing)
   * to the recorder worklets
   * @param stream MediaStream containing the audio track
   */
  addAudioSource(stream: MediaStream) {
    if (!this.audioContext || !this.recordingWorklet || !this.vuWorklet) {
      console.warn("AudioRecorder not initialized, can't add audio source");
      return;
    }

    // Check if the stream has audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn("No audio tracks found in the provided stream");
      return;
    }

    // Disconnect existing additional source if any
    if (this.additionalSource) {
      this.additionalSource.disconnect();
      if (this.systemVuWorklet) {
        this.systemVuWorklet.disconnect();
      }
    }

    // Create a new source from the stream
    this.additionalSource = this.audioContext.createMediaStreamSource(stream);
    
    // Create a separate volume meter for system audio
    const vuWorkletName = "system-vu-meter";
    this.audioContext.audioWorklet.addModule(
      createWorketFromSrc(vuWorkletName, VolMeterWorket)
    ).then(() => {
      this.systemVuWorklet = new AudioWorkletNode(this.audioContext!, vuWorkletName);
      this.systemVuWorklet.port.onmessage = (ev: MessageEvent) => {
        this.emit("systemVolume", ev.data.volume);
      };
      
      // Connect the system audio source to both the recording worklet and its own volume meter
      this.additionalSource!.connect(this.recordingWorklet!);
      this.additionalSource!.connect(this.systemVuWorklet);
    }).catch(err => {
      console.error("Failed to create system audio volume meter:", err);
      
      // Even if the volume meter fails, still connect to recording worklet
      this.additionalSource!.connect(this.recordingWorklet!);
    });
  }

  /**
   * Disconnects additional audio source if exists
   */
  removeAdditionalAudioSource() {
    if (this.additionalSource) {
      this.additionalSource.disconnect();
      this.additionalSource = undefined;
    }
    
    if (this.systemVuWorklet) {
      this.systemVuWorklet.disconnect();
      this.systemVuWorklet = undefined;
      
      // Emit zero volume to update the UI
      this.emit("systemVolume", 0);
    }
  }

  stop() {
    // its plausible that stop would be called before start completes
    // such as if the websocket immediately hangs up
    const handleStop = () => {
      this.source?.disconnect();
      this.additionalSource?.disconnect();
      this.stream?.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
      this.additionalSource = undefined;
      this.systemVuWorklet = undefined;
    };
    if (this.starting) {
      this.starting.then(handleStop);
      return;
    }
    handleStop();
  }
}

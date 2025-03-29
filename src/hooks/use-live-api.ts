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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MultimodalLiveAPIClientConnection,
  MultimodalLiveClient,
} from "../lib/multimodal-live-client";
import { LiveConfig } from "../multimodal-live-types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import { fetchUserContext } from "../lib/user-context-service";

export type UseLiveAPIResults = {
  client: MultimodalLiveClient;
  setConfig: (config: LiveConfig) => void;
  config: LiveConfig;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

export function useLiveAPI({
  url,
  apiKey,
}: MultimodalLiveAPIClientConnection): UseLiveAPIResults {
  const client = useMemo(
    () => new MultimodalLiveClient({ url, apiKey }),
    [url, apiKey],
  );
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<LiveConfig>({
    model: "models/gemini-2.0-flash-exp",
  });
  const [volume, setVolume] = useState(0);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  // Define disconnect first
  const disconnect = useCallback(async () => {
    console.log("Disconnect called.");
    client.disconnect();
    setConnected(false);
  }, [client]);

  // Effect for handling client events (close, audio, content, etc.)
  useEffect(() => {
    const onOpen = () => {
      console.log("WebSocket connection opened");
    }
    
    const onClose = () => {
      console.log("WebSocket connection closed.");
      setConnected(false);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) => {
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));
    }
    
    // Attach basic event listeners
    client
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);
  }, [client]);

  // Define connect AFTER disconnect
  const connect = useCallback(async () => {
    console.log("Starting connection with config:", config);
    if (!config) {
      throw new Error("config has not been set");
    }
    
    if (connected) {
      await disconnect(); 
    }
    
    try {
      let username = 'student';
      let userId = 'anonymous';
      const systemInstructionText = config.systemInstruction?.parts?.[0]?.text;
      
      if (systemInstructionText) {
        const usernameMatch = systemInstructionText.match(/current user's name is ([^\.]+)/i);
        if (usernameMatch && usernameMatch[1]) {
          username = usernameMatch[1].trim();
        }
        const userIdMatch = systemInstructionText.match(/User ID: ([^\n]+)/i); 
        if (userIdMatch && userIdMatch[1]) {
          userId = userIdMatch[1].trim();
        }
      }
      
      const userContext = await fetchUserContext(username);
      let updatedConfig = { ...config }; 
      
      if (userContext && updatedConfig.systemInstruction?.parts?.[0]?.text) {
        const currentText = updatedConfig.systemInstruction.parts[0].text;
        let newSystemPrompt = currentText;
        const userSectionIndex = currentText.indexOf("The current user's name is");
        const contextInsertion = `\n\nImportant Information About This User:\n${userContext}\n\nYou should reference this information naturally in your conversation to personalize your assistance.\nDon't explicitly state that you have this information, but use it to tailor your responses.\n\n`;

        if (userSectionIndex !== -1) {
            const afterUserSection = currentText.substring(userSectionIndex);
            const nextParaIndex = afterUserSection.indexOf("\n\n");
            if (nextParaIndex !== -1) {
                const insertionPoint = userSectionIndex + nextParaIndex + 2;
                newSystemPrompt = currentText.substring(0, insertionPoint) + contextInsertion + currentText.substring(insertionPoint);
            } else {
                newSystemPrompt = currentText + contextInsertion;
            }
        } else {
            newSystemPrompt = currentText + contextInsertion;
        }
        updatedConfig.systemInstruction.parts[0].text = newSystemPrompt;
        console.log("Updated system instruction with user context");
      }
      
      await client.connect(updatedConfig);
      setConnected(true);
      console.log("Connection successful.");

    } catch (error) {
      console.error("Error during connect process:", error);
      try {
          await disconnect(); 
      } catch(disconnectError) {
          console.error("Error during disconnect after connect failure:", disconnectError);
          client.disconnect();
          setConnected(false);
      }
    }
  }, [client, config, connected, disconnect]);

  return {
    client,
    config,
    setConfig,
    connected,
    connect,
    disconnect,
    volume,
  };
}

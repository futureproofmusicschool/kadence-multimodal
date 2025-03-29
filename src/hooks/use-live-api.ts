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

  useEffect(() => {
    const onClose = () => {
      setConnected(false);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    client
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    return () => {
      client
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio);
    };
  }, [client]);

  const connect = useCallback(async () => {
    console.log("Starting connection with config:", config);
    if (!config) {
      throw new Error("config has not been set");
    }
    
    // Disconnect any existing connection
    client.disconnect();
    
    try {
      // Extract username from system instruction if available
      let username = 'student';
      const systemInstructionText = config.systemInstruction?.parts?.[0]?.text;
      
      if (systemInstructionText) {
        // Try to extract username from system instruction text
        const usernameMatch = systemInstructionText.match(/current user's name is ([^\.]+)/i);
        if (usernameMatch && usernameMatch[1]) {
          username = usernameMatch[1].trim();
        }
      }
      
      // Fetch user context from n8n webhook
      const userContext = await fetchUserContext(username);
      
      // Create a new configuration with user context injected
      let updatedConfig = { ...config };
      
      if (userContext && updatedConfig.systemInstruction?.parts?.[0]?.text) {
        const currentText = updatedConfig.systemInstruction.parts[0].text;
        
        // Insert context in a more structured way for better AI use
        let newSystemPrompt = currentText;
        
        // Find the best insertion point - after user introduction but before conversation guidance
        const userSectionIndex = currentText.indexOf("The current user's name is");
        
        if (userSectionIndex !== -1) {
          // Find the end of the current user section
          const afterUserSection = currentText.substring(userSectionIndex);
          const nextParaIndex = afterUserSection.indexOf("\n\n");
          
          if (nextParaIndex !== -1) {
            // Insert user context between paragraphs
            const beforeContext = currentText.substring(0, userSectionIndex + nextParaIndex + 2);
            const afterContext = currentText.substring(userSectionIndex + nextParaIndex + 2);
            
            newSystemPrompt = `${beforeContext}
Important Information About This User:
${userContext}

You should reference this information naturally in your conversation to personalize your assistance.
Don't explicitly state that you have this information, but use it to tailor your responses.

${afterContext}`;
          } else {
            // Fallback - append after the user section
            newSystemPrompt = `${currentText}

Important Information About This User:
${userContext}

You should reference this information naturally in your conversation to personalize your assistance.
Don't explicitly state that you have this information, but use it to tailor your responses.`;
          }
        } else {
          // Fallback - append to the end
          newSystemPrompt = `${currentText}

Important Information About This User:
${userContext}

You should reference this information naturally in your conversation to personalize your assistance.
Don't explicitly state that you have this information, but use it to tailor your responses.`;
        }
        
        updatedConfig.systemInstruction.parts[0].text = newSystemPrompt;
        console.log("Updated system instruction with user context");
      }
      
      // Connect with the updated config
      await client.connect(updatedConfig);
      setConnected(true);
    } catch (error) {
      console.error("Error connecting with user context:", error);
      // Fall back to connecting without context if there was an error
      await client.connect(config);
      setConnected(true);
    }
  }, [client, setConnected, config]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

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

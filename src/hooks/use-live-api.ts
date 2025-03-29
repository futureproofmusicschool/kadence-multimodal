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
import { ConversationMessage, SessionLog, saveSessionLog } from "../lib/session-logger";

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
  
  // Session logging state
  const [sessionLog, setSessionLog] = useState<SessionLog | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const usernameRef = useRef<string>('student');
  const userIdRef = useRef<string>('anonymous');

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
      
      // Save the session log when disconnected
      if (sessionLog) {
        const completedLog: SessionLog = {
          ...sessionLog,
          endTime: Date.now()
        };
        saveSessionLog(completedLog);
        setSessionLog(null);
      }
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));
    
    // Track content for conversation logging
    const onContent = (content: any) => {
      if (!sessionLog || !content) return;
      
      // Extract text from model turn
      if (content.modelTurn && content.modelTurn.parts) {
        const parts = content.modelTurn.parts;
        
        let textContent = '';
        parts.forEach((part: any) => {
          if (part.text) {
            textContent += part.text;
          }
        });
        
        if (textContent) {
          const newMessage: ConversationMessage = {
            role: 'assistant',
            content: textContent,
            timestamp: Date.now()
          };
          
          setSessionLog(prevLog => {
            if (!prevLog) return null;
            return {
              ...prevLog,
              messages: [...prevLog.messages, newMessage]
            };
          });
        }
      }
    };
    
    // Monkey patch the send method to capture user messages
    const originalSend = client.send;
    client.send = (parts: any, turnComplete = true) => {
      // Call the original method
      const result = originalSend.call(client, parts, turnComplete);
      
      // Extract text content from the parts for logging
      if (sessionLog) {
        let textContent = '';
        const partsArray = Array.isArray(parts) ? parts : [parts];
        
        partsArray.forEach((part: any) => {
          if (part.text) {
            textContent += part.text;
          }
        });
        
        if (textContent) {
          const newMessage: ConversationMessage = {
            role: 'user',
            content: textContent,
            timestamp: Date.now()
          };
          
          setSessionLog(prevLog => {
            if (!prevLog) return null;
            return {
              ...prevLog,
              messages: [...prevLog.messages, newMessage]
            };
          });
        }
      }
      
      return result;
    };

    client
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio)
      .on("content", onContent);

    return () => {
      // Restore the original send method
      if (client.send !== originalSend) {
        client.send = originalSend;
      }
      
      client
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .off("content", onContent);
    };
  }, [client, sessionLog]);

  const connect = useCallback(async () => {
    console.log("Starting connection with config:", config);
    if (!config) {
      throw new Error("config has not been set");
    }
    
    // Disconnect any existing connection
    client.disconnect();
    
    try {
      // Extract username AND user ID from system instruction or context
      let username = 'student';
      let userId = 'anonymous'; // Default user ID
      const systemInstructionText = config.systemInstruction?.parts?.[0]?.text;
      
      if (systemInstructionText) {
        const usernameMatch = systemInstructionText.match(/current user's name is ([^\.]+)/i);
        if (usernameMatch && usernameMatch[1]) {
          username = usernameMatch[1].trim();
        }
        // Attempt to extract User ID if available in the context part (you might need to adjust this regex based on how user ID is included)
        const userIdMatch = systemInstructionText.match(/User ID: ([^\n]+)/i); 
        if (userIdMatch && userIdMatch[1]) {
          userId = userIdMatch[1].trim();
        }
      }
      
      // Store the username and user ID for session logging
      usernameRef.current = username;
      userIdRef.current = userId; // Store the extracted user ID
      
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
      
      // Initialize session logging
      sessionStartTimeRef.current = Date.now();
      setSessionLog({
        user_id: userIdRef.current, // Use the stored user ID
        username: usernameRef.current,
        startTime: sessionStartTimeRef.current,
        endTime: null,
        messages: []
      });
      
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
    // Save the session log before disconnecting
    if (sessionLog) {
      const completedLog: SessionLog = {
        ...sessionLog,
        endTime: Date.now()
      };
      await saveSessionLog(completedLog);
      setSessionLog(null);
    }
    
    client.disconnect();
    setConnected(false);
  }, [setConnected, client, sessionLog]);

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

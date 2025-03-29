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
  const sessionLogRef = useRef<SessionLog | null>(null);
  const usernameRef = useRef<string>('student');
  const userIdRef = useRef<string>('anonymous');
  // Define more precise type for the send method
  type SendMethod = (parts: any, turnComplete?: boolean) => any;
  const originalSendRef = useRef<SendMethod | null>(null);

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

  // Define disconnect first as connect depends on it now
  const disconnect = useCallback(async () => {
    console.log("Disconnect called. Attempting to save log from ref.");
    // Save the session log from the ref before disconnecting
    if (sessionLogRef.current) {
      const completedLog: SessionLog = {
        ...sessionLogRef.current,
        endTime: Date.now()
      };
      console.log("Saving log from ref on disconnect:", completedLog);
      try {
         await saveSessionLog(completedLog);
      } catch (saveError) {
          console.error("Error saving log during disconnect:", saveError);
      }
      sessionLogRef.current = null; // Clear the ref
    } else {
        console.log("No session log found in ref on disconnect.");
    }
    
    // Restore original send method if needed before disconnecting
    if (originalSendRef.current && client.send !== originalSendRef.current) {
      console.log("[useLiveAPI] Restoring original send method during disconnect");
      client.send = originalSendRef.current;
    }
    
    client.disconnect();
    setConnected(false);
  }, [client]); // Only depends on client

  // Effect for handling client events (close, audio, content, etc.)
  useEffect(() => {
    // Store the original send method at the beginning of the effect
    originalSendRef.current = client.send;
  
    // Debug logging for all major events
    function onOpen() {
      console.log("[DEBUG] WebSocket connection opened");
    }
    
    const onClose = () => {
      console.log("[DEBUG] WebSocket connection closed. Attempting to save log from ref.");
      setConnected(false);
      
      // Save the session log when disconnected, reading from the ref
      if (sessionLogRef.current) {
        const completedLog: SessionLog = {
          ...sessionLogRef.current,
          endTime: Date.now()
        };
        console.log("Saving log from ref on close:", completedLog);
        saveSessionLog(completedLog); // Fire-and-forget for now
        sessionLogRef.current = null; // Clear the ref after saving
      } else {
        console.log("No session log found in ref on close.");
      }
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) => {
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));
    }
    
    /**
     * This is where we capture the assistant's responses
     * The data from the Live API will be structured like:
     * { modelTurn: { parts: [ { text: "...response text..." } ] } }
     */
    const onContent = (content: any) => {
      console.log("[DEBUG] onContent event received:", typeof content);
      
      if (!sessionLogRef.current) {
        console.log("[DEBUG] No session log ref found in onContent");
        return;
      }
      
      try {
        // Content will be a ModelTurn object with parts from Live API
        if (content && content.modelTurn && content.modelTurn.parts) {
          // This is the structure directly from the Gemini Live API
          const parts = content.modelTurn.parts;
          let textContent = '';
          
          // Collect text from all parts
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
            
            sessionLogRef.current.messages.push(newMessage);
            console.log("[DEBUG] ✅ Assistant message added to session log:", 
              textContent.substring(0, 50) + (textContent.length > 50 ? "..." : ""));
            console.log("[DEBUG] Current message count:", sessionLogRef.current.messages.length);
          }
        } else {
          console.log("[DEBUG] ❓ Content event doesn't match expected structure:", content);
        }
      } catch (error) {
        console.error("[DEBUG] Error processing content event:", error, content);
      }
    };
    
    // Manual patch of the send method to capture user messages
    if (originalSendRef.current && client.send === originalSendRef.current) {
      const originalSend = originalSendRef.current;
      
      client.send = (parts: any, turnComplete = true) => {
        console.log("[DEBUG] client.send called");
        
        // First call the original method
        const result = originalSend.call(client, parts, turnComplete);
        
        // Then extract and log user messages
        if (sessionLogRef.current) {
          try {
            let textContent = '';
            const partsArray = Array.isArray(parts) ? parts : [parts];
            
            partsArray.forEach((part: any) => {
              if (part && typeof part === 'object' && part.text) {
                textContent += part.text;
              } else if (typeof part === 'string') {
                textContent += part;
              }
            });
            
            if (textContent) {
              const newMessage: ConversationMessage = {
                role: 'user',
                content: textContent,
                timestamp: Date.now()
              };
              sessionLogRef.current.messages.push(newMessage);
              console.log("[DEBUG] ✅ User message added to session log:", 
                textContent.substring(0, 50) + (textContent.length > 50 ? "..." : ""));
              console.log("[DEBUG] Current message count:", sessionLogRef.current.messages.length);
            } else {
              console.log("[DEBUG] ⚠️ No text content found in send parts:", parts);
            }
          } catch (error) {
            console.error("[DEBUG] Error capturing user message:", error);
          }
        }
        
        return result;
      };
      console.log("[DEBUG] Patched client.send method for message logging");
    }

    // Attach event listeners to MultimodalLiveClient
    client
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio)
      .on("content", onContent);

    // Add listener for turn complete to log assistant audio turns
    function onTurnComplete() {
      console.log("[DEBUG] TurnComplete event received");
      if (sessionLogRef.current) {
         const messages = sessionLogRef.current.messages;
         // Check if the last message was from the user
         if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
             const newMessage: ConversationMessage = {
                role: 'assistant', // Log as assistant turn
                content: "[Assistant Audio Response]", // Placeholder text
                timestamp: Date.now()
             };
             sessionLogRef.current.messages.push(newMessage);
             console.log("[DEBUG] ✅ Assistant Audio Turn logged (placeholder)");
             console.log("[DEBUG] Current message count:", sessionLogRef.current.messages.length);
         }
      }
    }
    client.on("turncomplete", onTurnComplete);

    // Cleanup function
    return () => {
      console.log("[DEBUG] Cleaning up listeners and restoring send method");
      if (originalSendRef.current && client.send !== originalSendRef.current) {
        client.send = originalSendRef.current;
      }
      client
        .off("open", onOpen)
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .off("content", onContent)
        .off("turncomplete", onTurnComplete); // Clean up the new listener
    };
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
    // No need to call client.disconnect() here again, disconnect function handles it
    sessionLogRef.current = null; // Clear ref before new connection
    
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
      
      usernameRef.current = username;
      userIdRef.current = userId;
      
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
      
      console.log(`Initializing log ref for user: ${userIdRef.current} (${usernameRef.current})`);
      sessionLogRef.current = {
        user_id: userIdRef.current,
        username: usernameRef.current,
        startTime: Date.now(),
        endTime: null,
        messages: []
      };
      
      await client.connect(updatedConfig);
      setConnected(true);
      console.log("Connection successful.");

    } catch (error) {
      console.error("Error during connect process:", error);
      // Attempt cleanup even on error
      try {
          await disconnect(); // Ensure log is attempted to be saved even if connect fails midway
      } catch(disconnectError) {
          console.error("Error during disconnect after connect failure:", disconnectError);
          client.disconnect(); // Ensure raw disconnect if save fails
          setConnected(false);
          sessionLogRef.current = null;
      }
    }
  }, [client, config, connected, disconnect]); // Keep dependencies

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

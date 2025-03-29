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
import { useEffect, memo, useRef } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

interface KadenceProps {
  username?: string;
}

// Define the function declaration schema
const LATEST_TRACK_ANALYSIS_FUNCTION: FunctionDeclaration = {
  name: "latest_track_analyses",
  description: "Fetches the latest analysis of the user's most recently uploaded music track when the user asks about it, mentions uploaded music, attached audio, or asks Kadence to listen to something they provided.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {}, // No parameters needed from the model itself
  },
};

function KadenceComponent({ username = 'student' }: KadenceProps) {
  const { client, setConfig, connected } = useLiveAPIContext();
  const hasInitiatedRef = useRef(false);
  const usernameRef = useRef(username); // Store username in a ref

  // Update username ref if prop changes
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  // Set system configuration on component mount or when username changes
  useEffect(() => {
    console.log("[Kadence] Setting system config...");
    setConfig({
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
            You respond to user voice inputs. You cannot view the user's screen or hear their music. Your main purpose is to provide helpful and informative responses to all user queries. Be concise, clear, and engaging in your responses.
            
            The current user's name is ${username}. Be friendly and supportive of their musical journey.
            
            IMPORTANT: Start the conversation *immediately* by greeting ${username} by name and asking how their music is going today. Then wait for their response. 
            Do not mention their name again after the initial greeting.
            
            Notes on Pronounciation:
            
            Words should always be pronounced according to their common usage in a musical context.
            The word bass is always pronounced like base.`,
          },
        ],
      },
      tools: [
        // { googleSearch: {} }, // Temporarily comment out Google Search
        { functionDeclarations: [LATEST_TRACK_ANALYSIS_FUNCTION] }
      ],
    });
  }, [setConfig, username]);
  
  // Effect to send initial prompt *once* when connected
  useEffect(() => {
    // Only run when connected and we haven't initiated yet
    if (connected && client && !hasInitiatedRef.current) {
      console.log("[Kadence] Connection established. Sending initial empty prompt to trigger greeting...");
      
      // Mark as initiated to prevent re-sending
      hasInitiatedRef.current = true;
      
      // Send a minimal text part to prompt the AI's first turn (greeting)
      // Use a slight delay just in case the connection needs a moment to settle
      const timer = setTimeout(() => {
         if (client && connected) { // Double-check connection state
            client.send([{ text: " " }], true); // Send a single space as a minimal prompt
            console.log("[Kadence] Initial empty prompt sent.");
         }
      }, 200); // Small delay (200ms)
      
      return () => clearTimeout(timer);
    }
    
    // Reset the flag if connection drops
    if (!connected) {
        hasInitiatedRef.current = false;
    }
    
  }, [connected, client]); // Depend on connection state and client instance
  
  // This component doesn't need to render anything visible
  return null;
}

export const Kadence = memo(KadenceComponent); 
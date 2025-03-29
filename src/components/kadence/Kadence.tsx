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

interface KadenceProps {
  username?: string;
}

function KadenceComponent({ username = 'student' }: KadenceProps) {
  const { client, setConfig, connected } = useLiveAPIContext();
  const hasGreetedRef = useRef(false);

  // Set system configuration on component mount
  useEffect(() => {
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
            
            Start the conversation by greeting ${username} and asking how their music is going today. 
            Do not mention their name again in the conversation.
            
            Notes on Pronounciation:
            
            Words should always be pronounced according to their common usage in a musical context.
            The word bass is always pronounced like base.`,
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
      ],
    });
  }, [setConfig, username]);
  
  // Watch for the connection establishment and send greeting ONCE when connected
  useEffect(() => {
    // Only act when connection is newly established
    if (connected && client && !hasGreetedRef.current) {
      console.log("Connection established, scheduling greeting...");
      
      // Set the flag to prevent greeting multiple times
      hasGreetedRef.current = true;
      
      // Short delay to make it seem more natural
      const timer = setTimeout(() => {
        if (client) {  // Double check client still exists
          console.log("Sending greeting message");
          client.send([{ 
            text: `Hi ${username}, how's it going with your music today? I'm Kadence, your AI music tutor. I can help you with production techniques, creative direction, or any other music-related questions.` 
          }]);
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [connected, client, username]);
  
  // This component doesn't need to render anything visible
  return null;
}

export const Kadence = memo(KadenceComponent); 
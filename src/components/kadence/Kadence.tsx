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
import { useEffect, memo, useState, useCallback } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import zepService from "../../lib/zep-service";

interface KadenceProps {
  username?: string;
}

function KadenceComponent({ username = 'student' }: KadenceProps) {
  const { client, setConfig, connected } = useLiveAPIContext();
  const [userContext, setUserContext] = useState<string>('');
  const [isContextLoaded, setIsContextLoaded] = useState<boolean>(false);

  // Fetch user context from Zep when the component mounts
  useEffect(() => {
    // Only fetch if we have a valid username
    if (username && username !== 'student' && !isContextLoaded) {
      fetchUserContext();
    } else {
      // If no valid username, mark as loaded with empty context
      setIsContextLoaded(true);
    }
  }, [username]);

  // Function to fetch user context from Zep
  const fetchUserContext = useCallback(async () => {
    try {
      console.log('Fetching user context from Zep for:', username);
      const context = await zepService.getUserContext(username);
      console.log('Received user context:', context ? 'Yes' : 'No');
      setUserContext(context);
      setIsContextLoaded(true);
    } catch (error) {
      console.error('Error fetching user context:', error);
      setIsContextLoaded(true); // Mark as loaded even if there's an error to prevent infinite retries
    }
  }, [username]);

  // Set up initial greeting message based on username
  useEffect(() => {
    // Wait for the context to be loaded before sending greeting
    if (!isContextLoaded || !client || !connected) return;
    
    // Short delay to make it seem more natural
    const timer = setTimeout(() => {
      if (client && username) {
        client.send([{ 
          text: `Hi ${username}, how's it going with your music today? I'm Kadence, your AI music tutor. I can help you with production techniques, creative direction, or any other music-related questions.` 
        }]);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [client, username, isContextLoaded, connected]);

  // Set up system config with user context
  useEffect(() => {
    // Wait for context to be loaded
    if (!isContextLoaded) return;
    
    // Construct base system instruction
    const baseInstruction = `You are Kadence, an AI tutor at Futureproof Music School, specializing in electronic music production and creative direction. 
    Your core mission is to provide expert guidance to aspiring musicians in any language, helping them develop their production skills while finding their unique artistic voice.
    You respond to user voice inputs. You cannot view the user's screen or hear their music. Your main purpose is to provide helpful and informative responses to all user queries. Be concise, clear, and engaging in your responses.
    
    The current user's name is ${username}. Be friendly and supportive of their musical journey.
    
    Start the conversation by greeting ${username} and asking how their music is going today. 
    Do not mention their name again in the conversation.
    
    Notes on Pronounciation:
    Words should always be pronounced according to their common usage in a musical context.
    The word bass is always pronounced like base.`;
    
    // Add user context if available
    const fullInstruction = userContext 
      ? `${baseInstruction}\n\n=== USER CONTEXT FROM PREVIOUS CONVERSATIONS ===\n${userContext}\n=== END USER CONTEXT ===\n\nUse this context to personalize your responses, but don't explicitly mention that you have this information unless the user brings it up.`
      : baseInstruction;
    
    console.log('Setting config with' + (userContext ? ' user context' : 'out user context'));
    
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
            text: fullInstruction,
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
      ],
    });
  }, [setConfig, username, userContext, isContextLoaded]);
  
  // This component doesn't need to render anything visible
  return null;
}

export const Kadence = memo(KadenceComponent); 
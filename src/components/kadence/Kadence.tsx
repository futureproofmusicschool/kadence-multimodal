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

// Always use Aoede voice
const VOICE_NAME = "Aoede";

function KadenceComponent({ username = 'student' }: KadenceProps) {
  const { client, setConfig, connected } = useLiveAPIContext();
  const [userContext, setUserContext] = useState<string>('');
  const [isContextLoaded, setIsContextLoaded] = useState<boolean>(false);
  const [contextError, setContextError] = useState<string | null>(null);

  // Clean and normalize username
  const normalizedUsername = username?.trim().toLowerCase() || 'student';

  // Fetch user context from Zep when the component mounts
  useEffect(() => {
    // Only fetch if we have a valid username
    if (normalizedUsername && normalizedUsername !== 'student' && !isContextLoaded) {
      console.log(`[Kadence] Initiating context fetch for user: ${normalizedUsername}`);
      fetchUserContext();
    } else {
      // If no valid username, mark as loaded with empty context
      console.log(`[Kadence] Skipping context fetch for default user: ${normalizedUsername}`);
      setIsContextLoaded(true);
    }
  }, [normalizedUsername]);

  // Function to fetch user context from Zep
  const fetchUserContext = useCallback(async () => {
    try {
      console.log(`[Kadence] Fetching user context from Zep for: ${normalizedUsername}`);
      const context = await zepService.getUserContext(normalizedUsername);
      
      if (context) {
        console.log(`[Kadence] Successfully retrieved context (${context.length} chars)`);
        setUserContext(context);
      } else {
        console.log(`[Kadence] No context available or empty context received`);
      }
      
      setContextError(null);
      setIsContextLoaded(true);
    } catch (error) {
      console.error(`[Kadence] Error fetching user context:`, error);
      setContextError(error instanceof Error ? error.message : String(error));
      setIsContextLoaded(true); // Mark as loaded even if there's an error to prevent infinite retries
    }
  }, [normalizedUsername]);

  // Set up initial greeting message based on username
  useEffect(() => {
    // Wait for the context to be loaded before sending greeting
    if (!isContextLoaded || !client || !connected) return;
    
    console.log(`[Kadence] Preparing to send initial greeting to ${normalizedUsername}`);
    
    // Short delay to make it seem more natural
    const timer = setTimeout(() => {
      if (client) {
        console.log(`[Kadence] Sending initial greeting`);
        client.send([{ 
          text: `Hi ${normalizedUsername}, how's it going with your music today? I'm Kadence, your AI music tutor. I can help you with production techniques, creative direction, or any other music-related questions.` 
        }]);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [client, normalizedUsername, isContextLoaded, connected]);

  // Set up system config with user context
  useEffect(() => {
    // Wait for context to be loaded
    if (!isContextLoaded) return;
    
    console.log(`[Kadence] Setting up system config with context loaded: ${!!userContext}`);
    
    // Construct base system instruction
    const baseInstruction = `You are Kadence, an AI tutor at Futureproof Music School, specializing in electronic music production and creative direction. 
    Your core mission is to provide expert guidance to aspiring musicians in any language, helping them develop their production skills while finding their unique artistic voice.
    You respond to user voice inputs. You cannot view the user's screen or hear their music. Your main purpose is to provide helpful and informative responses to all user queries. Be concise, clear, and engaging in your responses.
    
    The current user's name is ${normalizedUsername}. Be friendly and supportive of their musical journey.
    
    Start the conversation by greeting ${normalizedUsername} and asking how their music is going today. 
    Do not mention their name again in the conversation.
    
    Notes on Pronounciation:
    Words should always be pronounced according to their common usage in a musical context.
    The word bass is always pronounced like base.`;
    
    // Add user context if available
    const fullInstruction = userContext 
      ? `${baseInstruction}\n\n=== USER CONTEXT FROM PREVIOUS CONVERSATIONS ===\n${userContext}\n=== END USER CONTEXT ===\n\nUse this context to personalize your responses, but don't explicitly mention that you have this information unless the user brings it up.`
      : baseInstruction;
    
    console.log(`[Kadence] Setting config with voice "${VOICE_NAME}" and ${userContext ? 'user context' : 'no user context'}`);
    
    // Add context error if applicable
    const finalInstruction = contextError 
      ? `${fullInstruction}\n\nNote: There was an error retrieving full user context: ${contextError}. Please proceed with the available information.` 
      : fullInstruction;
    
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { 
            prebuiltVoiceConfig: { 
              voiceName: VOICE_NAME 
            } 
          },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: finalInstruction,
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
      ],
    });
  }, [setConfig, normalizedUsername, userContext, isContextLoaded, contextError]);
  
  // This component doesn't need to render anything visible
  return null;
}

export const Kadence = memo(KadenceComponent); 
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

import { useEffect, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { fetchUserData } from "../../utils/googleSheets";

interface KadenceProps {
  username?: string;
}

function KadenceComponent({ username = 'student' }: KadenceProps) {
  const { client, setConfig } = useLiveAPIContext();
  const [userData, setUserData] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data from Google Sheets
  useEffect(() => {
    async function getUserData() {
      setIsLoading(true);
      try {
        const data = await fetchUserData(username);
        setUserData(data);
        console.log('User data fetched:', data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    getUserData();
  }, [username]);

  // Set up initial greeting message based on username
  useEffect(() => {
    // Only send greeting after user data is loaded
    if (isLoading) return;

    // Short delay to make it seem more natural
    const timer = setTimeout(() => {
      if (client && username) {
        client.send([{ 
          text: `Hi ${username}, how's it going with your music today? I'm Kadence, your AI music tutor. I can help you with production techniques, creative direction, or any other music-related questions.` 
        }]);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [client, username, isLoading]);

  // Configure the AI with system instructions including user data
  useEffect(() => {
    // Only set config once user data is loaded (or confirmed not available)
    if (isLoading) return;

    // Format user data into a readable format for the system prompt
    let userDataText = '';
    if (userData) {
      userDataText = 'User Information:\n';
      Object.entries(userData).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          userDataText += `- ${key}: ${value}\n`;
        }
      });
    }

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
            Your core mission is to provide expert guidance to aspiring musicians, helping them develop their production skills while finding their unique artistic voice.
            
            IMPORTANT: Always respond only in English regardless of what language the user speaks in.
            
            You respond to user voice and screen sharing inputs. Your main purpose is to provide helpful and informative responses to all user queries. Be concise, clear, and engaging in your responses.
            
            The current user's name is ${username}. Always address them by name occasionally to make the conversation more personal. Be friendly and supportive of their musical journey.
            
            ${userDataText ? `USER CONTEXT INFORMATION (IMPORTANT - USE THIS TO PERSONALIZE RESPONSES):
            ${userDataText}
            
            IMPORTANT: Reference the above user information when appropriate to personalize your interactions. Provide advice based on their background, experience level, musical interests, and preferred software when mentioned in the data above.` : ''}
            
            Start the conversation by greeting ${username} and asking how their music is going today.`,
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
      ],
    });
  }, [setConfig, username, userData, isLoading]);
  
  // This component doesn't need to render anything visible
  return null;
}

// Memoize component for optimization
export const Kadence = KadenceComponent;

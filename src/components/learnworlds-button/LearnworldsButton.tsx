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
import "./learnworlds-button.scss";

declare global {
  interface Window {
    chatbotConfig?: {
      username?: string;
      userId?: string;
      currentUrl?: string;
      currentPath?: string;
    };
  }
}

interface LearnworldsButtonProps {
  defaultUsername?: string;
}

export function LearnworldsButton({ defaultUsername = "student" }: LearnworldsButtonProps) {
  const { connected, connect, disconnect } = useLiveAPIContext();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState(defaultUsername);

  // Get user info from Learnworlds
  useEffect(() => {
    if (window.chatbotConfig && window.chatbotConfig.username) {
      setUsername(window.chatbotConfig.username);
      console.log("User info from Learnworlds:", window.chatbotConfig);
    }
  }, []);

  const toggleConnection = () => {
    if (isOpen) {
      if (connected) {
        disconnect();
      } else {
        connect();
      }
    } else {
      setIsOpen(true);
      // Auto-connect when opening
      if (!connected) {
        connect();
      }
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    if (connected) {
      disconnect();
    }
  };

  return (
    <div className={`learnworlds-kadence-wrapper ${isOpen ? 'open' : 'closed'}`}>
      {isOpen ? (
        <div className="kadence-chat-container">
          <div className="kadence-header">
            <span>Kadence AI Assistant</span>
            <button className="close-button" onClick={closeChat}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="kadence-content">
            <div className="kadence-status">
              {connected ? 'Speaking with Kadence...' : 'Connecting...'}
            </div>
            <div className="kadence-controls">
              <button 
                className={`kadence-toggle-button ${connected ? 'connected' : ''}`}
                onClick={connected ? disconnect : connect}
              >
                <span className="material-symbols-outlined">
                  {connected ? 'pause' : 'play_arrow'}
                </span>
                {connected ? 'Pause' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button className="kadence-floating-button" onClick={toggleConnection}>
          <span className="material-symbols-outlined">record_voice_over</span>
        </button>
      )}
    </div>
  );
}

export default LearnworldsButton; 
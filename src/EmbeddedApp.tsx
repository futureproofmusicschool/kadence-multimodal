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
import "./App.scss";
import "./theme-override.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import { Kadence } from "./components/kadence/Kadence";
import { useLiveAPIContext } from "./contexts/LiveAPIContext";

// Base WebSocket URL
const host = "generativelanguage.googleapis.com";
const baseUri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

// Function to get URL parameters
function getUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    username: urlParams.get('username') || 'student',
    userId: urlParams.get('userId') || 'anonymous',
    embedded: urlParams.get('embedded') === 'true'
  };
}

// Embedded app controller
function EmbeddedAppController() {
  const { connect, disconnect } = useLiveAPIContext();
  const [username, setUsername] = useState(getUrlParams().username);

  // Listen for messages from the parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message from parent:', event.data);
      
      // Handle connect/disconnect messages
      if (event.data.action === 'connect') {
        if (event.data.userConfig && event.data.userConfig.username) {
          setUsername(event.data.userConfig.username);
        }
        connect();
      } else if (event.data.action === 'disconnect') {
        disconnect();
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [connect, disconnect]);

  return (
    <div className="embedded-app">
      <Kadence username={username} />
    </div>
  );
}

// Main embedded app
function EmbeddedApp() {
  const [secureUri, setSecureUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the secure URI with the API key from our serverless function
  useEffect(() => {
    async function getSecureUri() {
      try {
        setIsLoading(true);
        console.log("Requesting secure WebSocket URL for:", baseUri);
        
        const response = await fetch('/api/gemini-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ wsUrl: baseUri }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get secure URI');
        }
        
        const data = await response.json();
        console.log("Received secure WebSocket URL");
        
        setSecureUri(data.secureWsUrl);
        setIsLoading(false);
      } catch (error) {
        console.error('Error getting secure URI:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
        setIsLoading(false);
      }
    }
    
    getSecureUri();
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="embedded-loading">
        <div className="loading-spinner"></div>
        <p>Loading Kadence AI...</p>
      </div>
    );
  }

  // Show error
  if (error || !secureUri) {
    return (
      <div className="embedded-error">
        <p>Could not connect to Kadence AI</p>
      </div>
    );
  }

  return (
    <div className="EmbeddedApp">
      <LiveAPIProvider url={secureUri} apiKey="">
        <EmbeddedAppController />
      </LiveAPIProvider>
    </div>
  );
}

export default EmbeddedApp; 
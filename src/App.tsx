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

import { useEffect, useRef, useState } from "react";
import "./App.scss";
import "./theme-override.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import { Kadence } from "./components/altair/Kadence";
import ControlTray from "./components/control-tray/ControlTray";
import cn from "classnames";

// Generate a base WebSocket URL without the API key
const host = "generativelanguage.googleapis.com";
const baseUri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

function App() {
  // State for the secure URI that includes the API key
  const [secureUri, setSecureUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

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
        console.log("Received secure WebSocket URL (partial):", 
          data.secureWsUrl.substring(0, data.secureWsUrl.indexOf('key=') + 7) + '***');
        
        // Make sure we have a valid URL structure
        if (!data.secureWsUrl || !data.secureWsUrl.startsWith('wss://')) {
          throw new Error('Invalid WebSocket URL received from server');
        }
        
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

  // Show loading state while getting the secure URI
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Kadence AI...</p>
      </div>
    );
  }

  // Show error message if we couldn't get the secure URI
  if (error || !secureUri) {
    return (
      <div className="error-container">
        <h3>Could not initialize Kadence AI</h3>
        <p>{error || 'Failed to secure connection. Please try again later.'}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Important: Pass an empty string as the apiKey, since it's already in the secureUri */}
      <LiveAPIProvider url={secureUri} apiKey="">
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="main-app-area">
              {/* APP goes here */}
              <Kadence />
              <video
                className={cn("stream", {
                  hidden: !videoRef.current || !videoStream,
                })}
                ref={videoRef}
                autoPlay
                playsInline
              />
            </div>

            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
            >
              {/* put your own buttons here */}
            </ControlTray>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;

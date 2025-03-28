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

import cn from "classnames";

import { memo, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import SystemAudioPulse from "../audio-pulse/SystemAudioPulse";
import "./control-tray.scss";

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
};

/**
 * button used for triggering screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop }: MediaStreamButtonProps) =>
    isStreaming ? (
      <button className="action-button disabled-button" onClick={stop} disabled>
        <span className="material-symbols-outlined">{onIcon}</span>
      </button>
    ) : (
      <button className="action-button disabled-button" onClick={start} disabled>
        <span className="material-symbols-outlined">{offIcon}</span>
      </button>
    ),
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
}: ControlTrayProps) {
  const screenCapture = useScreenCapture();
  const [activeVideoStream, setActiveVideoStream] =
    useState<MediaStream | null>(null);
  const [inVolume, setInVolume] = useState(0);
  const [systemVolume, setSystemVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [hasSystemAudio, setHasSystemAudio] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    
    const onSystemVolume = (vol: number) => {
      setSystemVolume(vol);
    };
    
    if (connected && !muted && audioRecorder) {
      audioRecorder
        .on("data", onData)
        .on("volume", setInVolume)
        .on("systemVolume", onSystemVolume)
        .start();
    } else {
      audioRecorder.stop();
      // Reset volumes when stopped
      setSystemVolume(0);
    }
    return () => {
      audioRecorder
        .off("data", onData)
        .off("volume", setInVolume)
        .off("systemVolume", onSystemVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }

    let timeoutId = -1;

    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas) {
        return;
      }

      const ctx = canvas.getContext("2d")!;
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      if (canvas.width + canvas.height > 0) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 1.0);
        const data = base64.slice(base64.indexOf(",") + 1, Infinity);
        client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
      }
      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef]);

  //handler for starting/stopping screen capture
  const startScreenCapture = async () => {
    const mediaStream = await screenCapture.start();
    setActiveVideoStream(mediaStream);
    onVideoStreamChange(mediaStream);
    
    // If the screen capture includes audio, add it to the audio recorder
    if (screenCapture.hasSystemAudio) {
      audioRecorder.addAudioSource(mediaStream);
      setHasSystemAudio(true);
      console.log('Connected screen audio to recorder');
    } else {
      setHasSystemAudio(false);
    }
  };

  const stopScreenCapture = () => {
    screenCapture.stop();
    setActiveVideoStream(null);
    onVideoStreamChange(null);
    
    // Remove additional audio source when stopping
    audioRecorder.removeAdditionalAudioSource();
    setHasSystemAudio(false);
    setSystemVolume(0);
  };

  // Update the connection button handler to show loading state
  const handleConnection = async () => {
    if (connected) {
      disconnect();
    } else {
      setIsConnecting(true);
      try {
        await connect();
      } catch (error) {
        console.error('Error connecting:', error);
      } finally {
        setIsConnecting(false);
      }
    }
  };

  return (
    <section className="control-tray">
      <canvas style={{ display: "none" }} ref={renderCanvasRef} />
      <nav className={cn("actions-nav", { disabled: !connected })}>
        <button
          className={cn("action-button mic-button")}
          onClick={() => setMuted(!muted)}
        >
          {!muted ? (
            <span className="material-symbols-outlined filled">mic</span>
          ) : (
            <span className="material-symbols-outlined filled">mic_off</span>
          )}
        </button>

        <div className="action-button no-action outlined">
          <AudioPulse volume={volume} active={connected} hover={false} />
        </div>

        {hasSystemAudio && screenCapture.isStreaming && (
          <div className="action-button no-action outlined system-audio-meter">
            <SystemAudioPulse volume={systemVolume} active={connected} hover={false} />
          </div>
        )}

        {supportsVideo && (
          <>
            <MediaStreamButton
              isStreaming={screenCapture.isStreaming}
              start={startScreenCapture}
              stop={stopScreenCapture}
              onIcon="cancel_presentation"
              offIcon="present_to_all"
            />
            {hasSystemAudio && screenCapture.isStreaming && (
              <div className="system-audio-indicator">
                <span className="material-symbols-outlined">volume_up</span>
                <span className="system-audio-text">System Audio</span>
              </div>
            )}
          </>
        )}
        {children}
      </nav>

      <div className={cn("connection-container", { connected })}>
        <div className="connection-button-container">
          <button
            ref={connectButtonRef}
            className={cn("action-button connect-toggle", { connected, "connecting": isConnecting })}
            onClick={handleConnection}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <span className="material-symbols-outlined filled">hourglass_empty</span>
            ) : (
              <span className="material-symbols-outlined filled">
                {connected ? "pause" : "play_arrow"}
              </span>
            )}
          </button>
        </div>
        <span className="text-indicator">
          {isConnecting ? "Connecting..." : (connected ? "Streaming" : "")}
        </span>
      </div>
    </section>
  );
}

export default memo(ControlTray);

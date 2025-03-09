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

import { useState, useEffect } from "react";
import { UseMediaStreamResult } from "./use-media-stream-mux";

export function useScreenCapture(): UseMediaStreamResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasSystemAudio, setHasSystemAudio] = useState(false);

  useEffect(() => {
    const handleStreamEnded = () => {
      setIsStreaming(false);
      setStream(null);
      setHasSystemAudio(false);
    };
    if (stream) {
      stream
        .getTracks()
        .forEach((track) => track.addEventListener("ended", handleStreamEnded));
      return () => {
        stream
          .getTracks()
          .forEach((track) =>
            track.removeEventListener("ended", handleStreamEnded),
          );
      };
    }
  }, [stream]);

  const start = async () => {
    try {
      // const controller = new CaptureController();
      // controller.setFocusBehavior("no-focus-change");
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // Request system audio when sharing screen
        // controller
      });
      
      // Check if system audio was captured
      const hasAudio = mediaStream.getAudioTracks().length > 0;
      setHasSystemAudio(hasAudio);
      
      if (!hasAudio) {
        console.log('System audio capture was not supported or not allowed by the user');
      } else {
        console.log('System audio capture is active');
      }
      
      setStream(mediaStream);
      setIsStreaming(true);
      return mediaStream;
    } catch (error) {
      console.error('Error starting screen capture:', error);
      throw error;
    }
  };

  const stop = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsStreaming(false);
      setHasSystemAudio(false);
    }
  };

  const result: UseMediaStreamResult = {
    type: "screen",
    start,
    stop,
    isStreaming,
    stream,
    hasSystemAudio,
  };

  return result;
}

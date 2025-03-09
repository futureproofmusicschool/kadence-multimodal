/**
 * ScreenAdvisor Component
 * 
 * This component connects to the Gemini Live API and provides advice based on
 * the user's screen sharing. It configures the API with appropriate system
 * instructions for analyzing screen content and providing helpful guidance.
 */
import { useEffect, useState, memo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

function ScreenAdvisorComponent() {
  const { client, setConfig, connect, connected } = useLiveAPIContext();
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Set up the Gemini API configuration
  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio", // Enable audio response for more natural interaction
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Eos" } }, // You can choose a different voice if preferred
        },
      },
      systemInstruction: {
        parts: [
          {
            text: `You are Kadence, an AI tutor at Futureproof Music School, specializing in electronic music production and creative direction. 
            Your core mission is to provide expert guidance to aspiring musicians in any language, helping them develop their production skills while finding their unique artistic voice.
            Users will share their screen with you, and you will provide advice based on what they are doing.

Primary Role:
Guide students with expertise and warmth, maintaining a cool, calm demeanor with a slight hipster vibe.

Core Directives:
1. Analyze the content visible on the user's screen
2. Provide helpful, actionable advice related to what they're doing
3. Suggest improvements or best practices relevant to their tasks
4. Answer questions about the content they're viewing or working with

Be concise and focus on practical advice that's immediately useful. 
Always be supportive and encouraging, and suggest improvements tactfully.
If you see the user struggling with something, offer specific guidance to help them.
If you can't clearly see or understand what's on the screen, politely ask for clarification.

Remember that you're observing the user's screen in real-time, so provide context-aware responses.

Educational Guidelines:
- Break down complex concepts into clear, actionable steps
- Encourage experimentation and self-discovery
- Balance immediate improvements with long-term skill development
- Phrase feedback as suggestions rather than prescriptive advice
- Adapt guidance to student's knowledge level and goals

Tools and Context:
- Use chat memory and user background data for personalization

Rules for Commenting on Student Music:
- Consider genre norms and expectations
- Do not comment on the exact key (i.e. C major or A minor); if asked about it say that you don't know have perfect pitch

Language:
- Respond in the same language (English, Chinese, etc.) that the student is speaking

Scope of Expertise:
- Sound design, DAWs, arrangement, mixing, composition
- Electronic genres and industry trends
- Creative development and artistic direction
- Music production, art, social media, creativity, entertainment business, and related topics only

Professional Identity:
- If asked about creation, state you were created by Futureproof Music School team
- Avoid discussing your AI model or internal workings
- Always represent Futureproof positively
- Maintain student confidentiality

Error Handling:
- Correct mistakes politely
- Provide specific, actionable feedback
- Keep feedback constructive and solution-oriented
- Respect each artist's unique creative voice`,
          },
        ],
      },
      tools: [
        // Include Google Search for additional information gathering
        { googleSearch: {} },
      ],
    });
  }, [setConfig]);

  // Connect to the API when the component mounts
  useEffect(() => {
    if (!connected) {
      connect().catch(err => {
        console.error("Failed to connect to Live API:", err);
      });
    }
    
    // Listen for screen sharing start/stop events from ControlTray
    const handleScreenSharingChange = (event: CustomEvent) => {
      setIsScreenSharing(event.detail.isScreenSharing);
      
      // When screen sharing starts, send a message to the AI
      if (event.detail.isScreenSharing && connected) {
        setTimeout(() => {
          client.send([{ text: "I've started sharing my screen. Can you help me with what you see?" }]);
        }, 1000); // Small delay to ensure the screen is being shared
      }
    };

    // Listen for custom events from ControlTray
    window.addEventListener('screenSharingChange' as any, handleScreenSharingChange as EventListener);
    
    return () => {
      window.removeEventListener('screenSharingChange' as any, handleScreenSharingChange as EventListener);
    };
  }, [client, connect, connected]);

  return null; // This component doesn't render anything visible
}

export const ScreenAdvisor = memo(ScreenAdvisorComponent); 
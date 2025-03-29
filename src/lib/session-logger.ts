/**
 * Session Logger
 * Logs user-assistant conversations and saves them via an API route
 */
// Remove direct Supabase client import from frontend logger
// import { supabase } from './supabaseClient'; 

// Define conversation message type
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Define session log type
export interface SessionLog {
  user_id: string; 
  username: string;
  startTime: number;
  endTime: number | null;
  messages: ConversationMessage[];
}

// Function to format timestamp to human-readable date/time (used for console fallback)
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Format session log to text (for console logging fallback)
 */
export function formatSessionLog(log: SessionLog): string {
  const sessionDuration = log.endTime ? 
    Math.round((log.endTime - log.startTime) / 1000) : 
    0;
  
  let logText = `Voice Session with ${log.username} (ID: ${log.user_id})\n`;
  logText += `Started: ${formatTimestamp(log.startTime)}\n`;
  logText += log.endTime ? `Ended: ${formatTimestamp(log.endTime)}\n` : 'Session in progress\n';
  logText += `Duration: ${Math.floor(sessionDuration / 60)}m ${sessionDuration % 60}s\n\n`;
  
  logText += `CONVERSATION LOG:\n\n`;
  
  log.messages.forEach(msg => {
    const formattedTime = formatTimestamp(msg.timestamp);
    logText += `[${msg.role.toUpperCase()} - ${formattedTime}]\n${msg.content}\n\n`;
  });
  
  return logText;
}

/**
 * Save session log by sending it to the backend API route
 */
export async function saveSessionLog(log: SessionLog): Promise<boolean> {
  try {
    console.log("Attempting to save session log via API route...");
    
    const response = await fetch('/api/save-log', { // Relative path to the API route
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API route error response:', errorData);
      throw new Error(`API route failed with status ${response.status}: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('Successfully sent session log via API route:', result);
    return true;
    
  } catch (error) {
    console.error('Error saving session log via API route:', error);
    // Log the formatted session to console as a fallback
    console.error("Failed to save via API. Logging to console instead:\n", formatSessionLog(log));
    return false;
  }
} 
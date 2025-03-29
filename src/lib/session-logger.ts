/**
 * Session Logger
 * Logs user-assistant conversations and saves them
 */

// Define conversation message type
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Define session log type
export interface SessionLog {
  username: string;
  startTime: number;
  endTime: number | null;
  messages: ConversationMessage[];
}

// Function to format timestamp to human-readable date/time
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Format session log to text
 */
export function formatSessionLog(log: SessionLog): string {
  const sessionDuration = log.endTime ? 
    Math.round((log.endTime - log.startTime) / 1000) : 
    0;
  
  let logText = `Voice Session with ${log.username}\n`;
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
 * Save session log to the server/database
 */
export async function saveSessionLog(log: SessionLog): Promise<boolean> {
  try {
    // For now, just log to console, but this could be extended to:
    // 1. Send to a server endpoint
    // 2. Save to local storage
    // 3. Send back to the n8n webhook to update user records
    console.log('Saving session log:', formatSessionLog(log));
    
    // Example implementation to send to a server:
    /*
    const response = await fetch('/api/save-session-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save session log');
    }
    
    return true;
    */
    
    // For now, we'll just return success
    return true;
  } catch (error) {
    console.error('Error saving session log:', error);
    return false;
  }
} 
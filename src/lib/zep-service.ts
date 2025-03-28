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

// Zep Cloud API service
// Based on documentation from https://help.getzep.com/

interface ZepMemory {
  summary?: string;
  messages?: ZepMessage[];
  metadata?: Record<string, any>;
}

interface ZepMessage {
  role: string;
  content: string;
}

/**
 * Service to interact with Zep Cloud API for retrieving user context
 */
export class ZepService {
  private readonly apiUrl: string = 'https://api.getzep.com';
  
  /**
   * Get user context from Zep Cloud
   * 
   * @param username User identifier in Zep
   * @returns User context as a formatted string
   */
  async getUserContext(username: string): Promise<string> {
    try {
      // Call our server-side proxy to avoid exposing API key in client
      const response = await fetch('/api/zep-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      
      if (!response.ok) {
        console.error('Failed to fetch user context from Zep:', response.statusText);
        return '';
      }
      
      const data = await response.json();
      
      // Format the context for use in the system prompt
      return this.formatUserContext(data);
    } catch (error) {
      console.error('Error fetching user context:', error);
      return '';
    }
  }
  
  /**
   * Format Zep memory data into a cohesive context string
   */
  private formatUserContext(memory: ZepMemory): string {
    if (!memory) return '';
    
    let context = '';
    
    // Add summary if available
    if (memory.summary) {
      context += `User Summary: ${memory.summary}\n\n`;
    }
    
    // Add relevant messages if available (limiting to last 5 for brevity)
    if (memory.messages && memory.messages.length > 0) {
      context += 'Recent Conversation History:\n';
      
      const recentMessages = memory.messages.slice(-5);
      recentMessages.forEach(msg => {
        context += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    // Add any important metadata if available
    if (memory.metadata) {
      context += '\nUser Metadata:\n';
      
      const importantKeys = ['experience_level', 'preferred_genre', 'daw', 'goals'];
      importantKeys.forEach(key => {
        if (memory.metadata && memory.metadata[key]) {
          context += `${key}: ${memory.metadata[key]}\n`;
        }
      });
    }
    
    return context;
  }
}

export default new ZepService(); 
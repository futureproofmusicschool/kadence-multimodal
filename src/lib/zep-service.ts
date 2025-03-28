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
      console.log(`[Zep Service] Fetching context for user: "${username}"`);
      
      if (!username || username === 'student' || username === 'undefined') {
        console.warn(`[Zep Service] Invalid username "${username}". Skipping context fetch.`);
        return '';
      }
      
      // Call our server-side proxy to avoid exposing API key in client
      const response = await fetch('/api/zep-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      
      console.log(`[Zep Service] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Zep Service] Failed to fetch user context: ${response.status} - ${errorText}`);
        return '';
      }
      
      const data = await response.json();
      console.log(`[Zep Service] Retrieved data:`, {
        hasSummary: !!data.summary,
        messageCount: data.messages?.length || 0,
        hasMetadata: !!data.metadata
      });
      
      // Format the context for use in the system prompt
      const formattedContext = this.formatUserContext(data);
      console.log(`[Zep Service] Formatted context length: ${formattedContext.length} chars`);
      return formattedContext;
    } catch (error) {
      console.error(`[Zep Service] Error fetching user context:`, error);
      return '';
    }
  }
  
  /**
   * Format Zep memory data into a cohesive context string
   */
  private formatUserContext(memory: ZepMemory): string {
    if (!memory) {
      console.log(`[Zep Service] Empty memory object received.`);
      return '';
    }
    
    let context = '';
    
    // Add summary if available
    if (memory.summary) {
      context += `User Summary: ${memory.summary}\n\n`;
      console.log(`[Zep Service] Added summary to context.`);
    }
    
    // Add relevant messages if available (limiting to last 5 for brevity)
    if (memory.messages && memory.messages.length > 0) {
      context += 'Recent Conversation History:\n';
      
      const recentMessages = memory.messages.slice(-5);
      console.log(`[Zep Service] Adding ${recentMessages.length} recent messages to context.`);
      
      recentMessages.forEach(msg => {
        context += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    // Add any important metadata if available
    if (memory.metadata) {
      context += '\nUser Metadata:\n';
      
      const importantKeys = ['experience_level', 'preferred_genre', 'daw', 'goals'];
      const foundKeys = importantKeys.filter(key => memory.metadata && memory.metadata[key]);
      
      console.log(`[Zep Service] Adding ${foundKeys.length} metadata fields to context.`);
      
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
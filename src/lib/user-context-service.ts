/**
 * User Context Service
 * Handles fetching user context information from n8n webhook
 */

const WEBHOOK_URL = 'https://futureproofmusic.app.n8n.cloud/webhook/2fd54c14-b3c7-4c4d-aa62-7d24da3c6d76';

/**
 * Fetches user context data from n8n webhook
 * @param username The username to fetch context for
 * @returns Promise with user context data
 */
export async function fetchUserContext(username: string): Promise<string> {
  try {
    console.log(`Fetching context for user: ${username}`);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      console.error('Error fetching user context:', response.statusText);
      return '';
    }

    const data = await response.json();
    console.log('Received user context:', data);
    
    if (data && data.context) {
      return data.context;
    }
    
    return '';
  } catch (error) {
    console.error('Error fetching user context:', error);
    return '';
  }
} 
/**
 * Client for logging conversation data to Supabase via serverless function
 */

/**
 * Log a conversation exchange to Supabase via secure server-side API
 */
export async function logConversation(userId: string, username: string, message: string, assistantResponse: string) {
  try {
    if (!userId || !username) {
      console.warn('Missing user information, skipping conversation logging');
      return false;
    }

    const apiEndpoint = '/api/log-conversation';
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        username,
        message,
        response: assistantResponse
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error logging conversation:', errorData);
      return false;
    }

    console.log('Successfully logged conversation');
    return true;
  } catch (error) {
    console.error('Error logging conversation:', error);
    return false;
  }
} 
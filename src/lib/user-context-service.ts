/**
 * User Context Service
 * Handles fetching user context information from n8n webhook
 */

const WEBHOOK_URL = 'https://futureproofmusic.app.n8n.cloud/webhook/2fd54c14-b3c7-4c4d-aa62-7d24da3c6d76';

/**
 * Formats user data into a readable context string
 */
function formatUserContext(userData: any): string {
  if (!userData) return '';
  
  // Filter out empty values and system columns
  const relevantFields: Record<string, string> = {};
  Object.entries(userData).forEach(([key, value]) => {
    // Skip system fields, row number, empty values, and columns with numeric names
    if (
      key !== 'row_number' && 
      key !== 'user_id' && 
      key !== 'username' &&
      key !== 'signup' &&
      !key.startsWith('col_') && 
      value && 
      String(value).trim() !== '' &&
      String(value).trim() !== '-'
    ) {
      relevantFields[key] = String(value);
    }
  });
  
  // Format the context as a readable text
  let contextString = '';
  
  if (Object.keys(relevantFields).length > 0) {
    contextString = 'User Profile Information:\n';
    
    // Add high-value musical information first
    const priorityFields = [
      'instruments_played',
      'music_education',
      'daw_proficiency',
      'music_software_used',
      'music_hardware_used',
      'genres_liked',
      'genres_disliked',
      'artists_favorite',
      'musical_goals_short_term',
      'musical_goals_long_term',
      'learning_motivations',
      'current_projects',
      'strengths',
      'needs_work',
      'last_session_notes'
    ];
    
    // Add priority fields first
    priorityFields.forEach(field => {
      if (relevantFields[field]) {
        const formattedKey = field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        contextString += `- ${formattedKey}: ${relevantFields[field]}\n`;
        delete relevantFields[field]; // Remove to avoid duplication
      }
    });
    
    // Add any remaining fields
    Object.entries(relevantFields).forEach(([key, value]) => {
      const formattedKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      contextString += `- ${formattedKey}: ${value}\n`;
    });
  }
  
  return contextString;
}

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
    console.log('Received user context data:', data);
    
    // The n8n response is an array of user objects
    if (Array.isArray(data) && data.length > 0) {
      // Format the first user object (should be the only one matching the username)
      const formattedContext = formatUserContext(data[0]);
      console.log('Formatted user context:', formattedContext);
      return formattedContext;
    } else if (data && data.context) {
      // Handle original expected format as fallback
      return data.context;
    }
    
    return '';
  } catch (error) {
    console.error('Error fetching user context:', error);
    return '';
  }
} 
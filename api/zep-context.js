/**
 * Server-side API to proxy requests to Zep Cloud API
 * This prevents exposing the API key in the client
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.body;
    
    if (!username) {
      console.log('[ZEP API] No username provided');
      return res.status(400).json({ error: 'Username is required' });
    }
    
    console.log(`[ZEP API] Fetching context for user: ${username}`);
    
    // Get API key from environment variable
    const ZEP_API_KEY = process.env.ZEP_API_KEY;
    
    if (!ZEP_API_KEY) {
      console.error('[ZEP API] ZEP_API_KEY environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Construct the API URL
    // The correct URL format based on Zep docs: https://help.getzep.com/sdk-reference/python#zep_python.collections.get_memory
    const collectionName = process.env.ZEP_COLLECTION_NAME || 'users';
    const apiUrl = `https://api.getzep.com/api/v1/collection/${collectionName}/memory/${encodeURIComponent(username)}`;
    
    console.log(`[ZEP API] Request details:
    - Collection: ${collectionName}
    - Username: ${username}
    - Full URL: ${apiUrl}
    - API Key Present: ${!!ZEP_API_KEY}
    `);
    
    // Fetch user memory from Zep Cloud
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEP_API_KEY}`
      }
    });
    
    console.log(`[ZEP API] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ZEP API] Error: ${response.status} - ${errorText}`);
      console.error(`[ZEP API] Full request info: URL=${apiUrl}, Username=${username}, Headers=${JSON.stringify(response.headers)}`);
      
      // If user not found, return empty context rather than error
      if (response.status === 404) {
        console.log(`[ZEP API] User not found in Zep memory collection. Creating empty context.`);
        return res.status(200).json({ summary: '', messages: [] });
      }
      
      return res.status(response.status).json({ 
        error: `Failed to fetch data from Zep: ${response.statusText}` 
      });
    }
    
    const data = await response.json();
    console.log(`[ZEP API] Successfully retrieved context for ${username} with ${data.messages?.length || 0} messages`);
    return res.status(200).json(data);
    
  } catch (error) {
    console.error(`[ZEP API] Unhandled error: ${error.message}`, error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
} 
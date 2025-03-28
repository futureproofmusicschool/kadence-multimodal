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
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Get API key from environment variable
    const ZEP_API_KEY = process.env.ZEP_API_KEY;
    
    if (!ZEP_API_KEY) {
      console.error('ZEP_API_KEY environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Fetch user memory from Zep Cloud
    const response = await fetch(`https://api.getzep.com/api/v1/collection/users/memory/${username}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEP_API_KEY}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Zep API error: ${response.status} - ${errorText}`);
      
      // If user not found, return empty context rather than error
      if (response.status === 404) {
        return res.status(200).json({ summary: '', messages: [] });
      }
      
      return res.status(response.status).json({ 
        error: `Failed to fetch data from Zep: ${response.statusText}` 
      });
    }
    
    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Error in zep-context API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
/**
 * Secure proxy for Gemini API
 * This keeps the API key on the server side and prevents client exposure
 */
export default async function handler(req, res) {
  // Set CORS headers if needed
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://futureproofmusicschool.com'); // Only allow requests from the music school domain
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the API key from environment variables
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('API key is not set in environment variables');
      return res.status(500).json({ error: 'API configuration error' });
    }
    
    // Extract WebSocket URL from forwarded request
    const wsUrl = req.body.wsUrl;
    
    if (!wsUrl) {
      return res.status(400).json({ error: 'WebSocket URL is required' });
    }
    
    // Check if the URL already has query parameters
    const hasQueryParams = wsUrl.includes('?');
    
    // Add the API key to the URL, using & if there are already query params, ? otherwise
    const secureWsUrl = hasQueryParams ? 
      `${wsUrl}&key=${apiKey}` : 
      `${wsUrl}?key=${apiKey}`;
    
    // Return the secure URL with the API key
    res.status(200).json({ secureWsUrl });
  } catch (error) {
    console.error('Error in Gemini proxy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 
/**
 * Secure proxy for Gemini API
 * This keeps the API key on the server side and prevents client exposure
 */
export default async function handler(req, res) {
  // Set CORS headers with support for multiple origins
  const allowedOrigins = [
    'https://futureproofmusicschool.com',
    'https://www.futureproofmusicschool.com',
    // During development, allow requests from localhost and vercel preview URLs
    'http://localhost:3000',
    'https://kadence-multimodal.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', true);
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
    console.log('API proxy received request:', req.body);
    
    // Get the API key from environment variables
    let apiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
    
    // Log API key length but not the actual key for security
    console.log(`API key length: ${apiKey.length}, first 4 chars: ${apiKey.substring(0, 4)}...`);
    
    // Clean the API key - remove any '?key=' or similar formatting
    apiKey = apiKey.replace(/[?&]key=/g, '').trim();
    console.log(`Cleaned API key length: ${apiKey.length}, first 4 chars: ${apiKey.substring(0, 4)}...`);
    
    if (!apiKey) {
      console.error('API key is not set in environment variables');
      return res.status(500).json({ error: 'API configuration error' });
    }
    
    // Extract WebSocket URL from forwarded request
    let wsUrl = req.body.wsUrl || '';
    console.log('Original WebSocket URL:', wsUrl);
    
    if (!wsUrl) {
      return res.status(400).json({ error: 'WebSocket URL is required' });
    }
    
    // GUARANTEED CLEAN APPROACH: 
    // 1. Remove any query string completely
    if (wsUrl.includes('?')) {
      wsUrl = wsUrl.substring(0, wsUrl.indexOf('?'));
      console.log('Stripped WebSocket URL (removed all query params):', wsUrl);
    }
    
    // 2. Append the API key as the only query parameter
    const secureWsUrl = `${wsUrl}?key=${apiKey}`;
    
    // Log secure URL structure (without showing full API key)
    console.log(`Final secure URL structure: ${wsUrl}?key=XXXX...`);
    
    // Return the secure URL with the API key
    res.status(200).json({ secureWsUrl });
  } catch (error) {
    console.error('Error in Gemini proxy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 
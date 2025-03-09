/**
 * Simple API to check if environment variables are properly set
 * For debugging purposes only - remove in production
 */
export default async function handler(req, res) {
  try {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    
    res.status(200).json({
      hasApiKey: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0,
      keyPrefix: apiKey ? apiKey.substring(0, 4) + '...' : 'none',
      envVars: Object.keys(process.env).filter(key => 
        key.startsWith('REACT_') || key.startsWith('NEXT_') || key.startsWith('VERCEL_')
      )
    });
  } catch (error) {
    console.error('Error checking environment:', error);
    res.status(500).json({ error: 'Error checking environment' });
  }
} 
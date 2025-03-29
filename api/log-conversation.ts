import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const conversationsTable = process.env.SUPABASE_TABLE || 'conversations';

// Create Supabase client with server-side key
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Basic validation
    const { userId, username, message, response } = req.body;
    
    if (!userId || !username || !message || !response) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['userId', 'username', 'message', 'response'] 
      });
    }

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Insert conversation into Supabase
    const { data, error } = await supabase
      .from(conversationsTable)
      .insert({
        // timestamp will be handled by Supabase's now()
        user_id: userId,
        username: username,
        message: message,
        response: response
      });

    if (error) {
      console.error('Error logging conversation to Supabase:', error);
      return res.status(500).json({ error: 'Failed to log conversation', details: error.message });
    }

    // Return success
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Unexpected error logging conversation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
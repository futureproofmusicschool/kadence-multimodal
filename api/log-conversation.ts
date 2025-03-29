import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const conversationsTable = process.env.SUPABASE_TABLE || 'Member Logs';

// Create Supabase client with server-side key
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[${new Date().toISOString()}] /api/log-conversation handler invoked.`); // Log start

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`[${new Date().toISOString()}] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log(`[${new Date().toISOString()}] Received request body:`, req.body); // Log body
    // Basic validation
    const { userId, username, message, response } = req.body;
    
    if (!userId || !username || !message || !response) {
      console.log(`[${new Date().toISOString()}] Missing required fields.`);
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['userId', 'username', 'message', 'response'] 
      });
    }

    // Check if Supabase is configured
    console.log(`[${new Date().toISOString()}] Supabase Config Check: URL=${supabaseUrl ? 'Set' : 'Not Set'}, Key=${supabaseKey ? 'Set' : 'Not Set'}, Table=${conversationsTable}`); // Log config status
    if (!supabaseUrl || !supabaseKey) {
      console.error(`[${new Date().toISOString()}] Supabase credentials not configured`);
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Prepare data for insert
    const insertData = {
      user_id: userId,
      username: username,
      message: message,
      response: response
    };
    console.log(`[${new Date().toISOString()}] Attempting to insert into Supabase table '${conversationsTable}':`, insertData); // Log before insert

    // Insert conversation into Supabase
    const { data, error } = await supabase
      .from(conversationsTable)
      .insert(insertData); // Use prepared data

    if (error) {
      console.error(`[${new Date().toISOString()}] Error logging conversation to Supabase:`, error); // Log Supabase error
      return res.status(500).json({ error: 'Failed to log conversation', details: error.message });
    }

    // Return success
    console.log(`[${new Date().toISOString()}] Successfully logged conversation to Supabase. Result:`, data); // Log success
    return res.status(200).json({ success: true, data: data }); // Optionally return data
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error in /api/log-conversation:`, error); // Log unexpected error
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
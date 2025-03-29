import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node'; // Use Vercel types if deploying there
// Correct the import path assuming 'api' is at the root level
import type { SessionLog, ConversationMessage } from '../src/lib/session-logger'; 

// Function to format timestamp for Supabase
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export default async (req: VercelRequest, res: VercelResponse) => {
  // Allow only POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Get Supabase credentials and table name from SERVER environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabaseTableName = process.env.SUPABASE_TABLE || 'Kadence'; // Default to 'Kadence'

  // Validate environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Server Error: Supabase URL or Service Key not configured.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Initialize Supabase client *on the server* using the Service Key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase Admin client initialized for API route.');

    // Get the session log data from the request body
    const log: SessionLog = req.body;

    if (!log || !log.messages || !log.user_id || !log.username) {
      console.error('Invalid log data received:', log);
      return res.status(400).json({ error: 'Invalid log data format' });
    }

    console.log(`Received log for user: ${log.username} (ID: ${log.user_id})`);

    // --- Prepare data for insertion (same logic as before) ---
    const conversationPairs: { user_message: string, assistant_response: string, timestamp: number }[] = [];
    // Explicitly type currentUserMessage
    let currentUserMessage: ConversationMessage | null = null; 

    for (const msg of log.messages) {
      if (msg.role === 'user') {
        currentUserMessage = msg;
      } else if (msg.role === 'assistant' && currentUserMessage) {
        conversationPairs.push({
          user_message: currentUserMessage.content, // Now type-safe
          assistant_response: msg.content,
          timestamp: currentUserMessage.timestamp // Now type-safe
        });
        currentUserMessage = null;
      }
    }
    if (currentUserMessage) {
      conversationPairs.push({
        user_message: currentUserMessage.content, // Now type-safe
        assistant_response: '',
        timestamp: currentUserMessage.timestamp // Now type-safe
      });
    }
    
    if (conversationPairs.length === 0) {
      console.log("No conversation pairs to save via API route.");
      return res.status(200).json({ message: 'No conversation pairs to save' });
    }

    const rowsToInsert = conversationPairs.map(pair => ({
      user_id: log.user_id,
      username: log.username,
      message: pair.user_message,
      response: pair.assistant_response,
      timestamp: formatTimestamp(pair.timestamp)
    }));
    // -----------------------------------------------------------
    
    console.log(`Attempting to insert ${rowsToInsert.length} rows into ${supabaseTableName}...`);

    // Insert data into the specified table
    const { data, error } = await supabaseAdmin
      .from(supabaseTableName)
      .insert(rowsToInsert);

    if (error) {
      console.error('Supabase insert error via API route:', error);
      throw error; // Let the catch block handle it
    }

    console.log('Successfully saved session log via API route:', data);
    return res.status(200).json({ success: true, message: 'Log saved successfully' });

  } catch (error: any) {
    console.error('Error in save-log API route:', error);
    return res.status(500).json({ error: 'Failed to save session log', details: error.message });
  }
}; 
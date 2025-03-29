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
    return res.status(405).json({ error: 'Method Not Allowed' }); // Send JSON error
  }

  // Wrap the entire logic in a try...catch to handle unexpected errors
  try {
    // Get Supabase credentials and table name from SERVER environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const supabaseTableName = process.env.SUPABASE_TABLE || 'Kadence'; // Default to 'Kadence'

    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('API Route Error: Supabase URL or Service Key not configured.');
      // Don't expose detailed config errors to the client
      return res.status(500).json({ error: 'Server configuration error', code: 'ENV_MISSING' });
    }

    // --- Client Initialization --- 
    let supabaseAdmin;
    try {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      console.log('Supabase Admin client initialized for API route.');
    } catch (initError: any) {
      console.error('API Route Error: Failed to initialize Supabase client:', initError);
      return res.status(500).json({ error: 'Database connection failed', code: 'SUPABASE_INIT_FAILED', details: initError.message });
    }

    // --- Request Body Parsing and Validation --- 
    let log: SessionLog;
    try {
      // Ensure body is parsed (Vercel usually handles this)
      if (typeof req.body !== 'object' || req.body === null) {
         throw new Error('Request body is not a valid JSON object.');
      }
      log = req.body as SessionLog; // Type assertion after check
      console.log(`Received log for user: ${log?.username} (ID: ${log?.user_id})`);

      if (!log || !log.messages || !log.user_id || !log.username) {
        console.warn('API Route Warning: Invalid log data received:', log);
        return res.status(400).json({ error: 'Invalid log data format', code: 'INVALID_PAYLOAD' });
      }
    } catch (parseError: any) {
      console.error('API Route Error: Failed to parse request body:', parseError);
      return res.status(400).json({ error: 'Bad Request: Could not parse JSON body', code: 'BODY_PARSE_ERROR', details: parseError.message });
    }

    // --- Data Preparation --- 
    let rowsToInsert: any[]; // Define outside try block
    try {
        const conversationPairs: { user_message: string, assistant_response: string, timestamp: number }[] = [];
        let currentUserMessage: ConversationMessage | null = null;

        for (const msg of log.messages) {
          if (msg.role === 'user') {
            currentUserMessage = msg;
          } else if (msg.role === 'assistant' && currentUserMessage) {
            conversationPairs.push({
              user_message: currentUserMessage.content,
              assistant_response: msg.content,
              timestamp: currentUserMessage.timestamp
            });
            currentUserMessage = null;
          }
        }
        // Handle last user message if no assistant response followed
        if (currentUserMessage) {
           conversationPairs.push({
             user_message: currentUserMessage.content,
             assistant_response: '', // Empty string for assistant response
             timestamp: currentUserMessage.timestamp
           });
        }

        if (conversationPairs.length === 0) {
          console.log("No conversation pairs to save via API route.");
          return res.status(200).json({ success: true, message: 'No conversation pairs to save', code: 'NO_PAIRS' });
        }

        rowsToInsert = conversationPairs.map(pair => ({
          user_id: log.user_id,
          username: log.username,
          message: pair.user_message,
          response: pair.assistant_response,
          timestamp: formatTimestamp(pair.timestamp)
        }));
        console.log(`Prepared ${rowsToInsert.length} rows for insertion into ${supabaseTableName}...`);
    } catch (prepError: any) {
      console.error('API Route Error: Failed to prepare data for insertion:', prepError);
      return res.status(500).json({ error: 'Internal server error during data processing', code: 'DATA_PREP_FAILED', details: prepError.message });
    }
    
    // --- Database Insertion --- 
    try {
      console.log(`Attempting to insert ${rowsToInsert.length} rows into ${supabaseTableName}...`);
      const { data, error: insertError } = await supabaseAdmin
        .from(supabaseTableName)
        .insert(rowsToInsert)
        .select(); // Optional: Select to confirm insertion and get data back

      if (insertError) {
        // Throw the specific Supabase error to be caught below
        throw insertError; 
      }

      console.log(`Successfully saved ${data?.length ?? 0} log entries via API route.`);
      return res.status(200).json({ success: true, message: 'Log saved successfully', data: data });

    } catch (dbError: any) {
      console.error('API Route Error: Supabase insert error:', dbError);
      // Provide more context if available (e.g., RLS issues, column type mismatches)
      let errorMessage = 'Failed to save session log to database';
      let errorCode = 'SUPABASE_INSERT_FAILED';
      if (dbError.message) {
          errorMessage += `: ${dbError.message}`;
      }
      // Add more specific Supabase error codes if needed based on dbError structure
      // if (dbError.code === '23503') errorCode = 'FOREIGN_KEY_VIOLATION';
      // if (dbError.code === '42703') errorCode = 'COLUMN_UNDEFINED';
      
      return res.status(500).json({ error: errorMessage, code: errorCode, details: dbError });
    }

  } catch (error: any) {
    // Catch-all for any unexpected errors not caught by inner blocks
    console.error('API Route Error: Unhandled exception:', error);
    return res.status(500).json({ error: 'An unexpected server error occurred', code: 'UNHANDLED_EXCEPTION', details: error.message });
  }
}; 
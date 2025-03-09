/**
 * Server-side API endpoint for securely fetching user data
 * This runs as a Vercel serverless function
 */

// Import the Google Sheets API client
const { google } = require('googleapis');

// Sheet ID from the provided URL
const SHEET_ID = '1mGHglwD1rzKhqyntKtSxTZ4NaUQvNc6Q2LJaNnhqBKs';
const SHEET_NAME = 'Sheet1'; // Default sheet name, change if needed

/**
 * Creates an authorized Google Sheets client
 * Uses server-side environment variables for authentication
 */
async function getGoogleSheetsClient() {
  try {
    // For service account authentication (more secure than API key)
    // Requires setting up a service account in Google Cloud Console
    // and downloading credentials JSON
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      // Load credentials from environment variable
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      
      // Create JWT client
      const auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets.readonly']
      );
      
      return google.sheets({ version: 'v4', auth });
    } 
    // Fallback to API key (less secure, but simpler)
    else if (process.env.GOOGLE_SHEETS_API_KEY) {
      return google.sheets({ 
        version: 'v4', 
        auth: process.env.GOOGLE_SHEETS_API_KEY 
      });
    } 
    else {
      throw new Error('No Google authentication credentials provided');
    }
  } catch (error) {
    console.error('Error creating Google Sheets client:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username } = req.query;
    
    // Validate username
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Get authorized sheets client
    const sheets = await getGoogleSheetsClient();
    
    // Fetch data from the spreadsheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_NAME,
    });
    
    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No data found in spreadsheet' });
    }
    
    // Get header row
    const headers = rows[0];
    
    // Find the row where column B (index 1) matches username
    const userRow = rows.find(row => 
      row.length > 1 && row[1]?.toLowerCase() === username.toLowerCase()
    );
    
    if (!userRow) {
      // Return 200 with null data rather than 404
      // This avoids exposing which usernames exist in the system
      return res.status(200).json(null);
    }
    
    // Convert row to object with header keys
    const userData = {};
    headers.forEach((header, index) => {
      if (userRow[index] !== undefined) {
        userData[header] = userRow[index];
      }
    });
    
    // Return the user data
    return res.status(200).json(userData);
    
  } catch (error) {
    console.error('API error:', error);
    // Return generic error message to avoid leaking implementation details
    return res.status(500).json({ error: 'Error fetching user data' });
  }
} 
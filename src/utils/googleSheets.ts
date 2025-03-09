/**
 * User data utility function
 * Securely fetches user data via server-side API
 */

interface UserData {
  [key: string]: string;
}

/**
 * Fetch user data from our secure API endpoint
 * @param username The username to look up
 * @returns Promise with user data or null if not found
 */
export async function fetchUserData(username: string): Promise<UserData | null> {
  try {
    if (!username) {
      console.log('No username provided, skipping user data fetch');
      return null;
    }

    console.log(`Fetching user data for: ${username}`);

    // Call our secure API endpoint (hosted as a Vercel serverless function)
    // This endpoint handles Google Sheets API authentication securely on the server
    const apiUrl = `/api/user-data?username=${encodeURIComponent(username)}`;
    console.log(`Calling API endpoint: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    console.log(`API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching user data:', errorText);
      return null;
    }
    
    const userData = await response.json();
    console.log('User data received:', userData);
    
    return userData;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
} 
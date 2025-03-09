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

    // Call our secure API endpoint (hosted as a Vercel serverless function)
    // This endpoint handles Google Sheets API authentication securely on the server
    const response = await fetch(`/api/user-data?username=${encodeURIComponent(username)}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching user data:', errorText);
      return null;
    }
    
    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
} 
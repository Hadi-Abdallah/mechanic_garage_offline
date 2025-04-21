import { useState, useEffect } from 'react';

// Custom hook to track online/offline status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Function to update online status
    function updateOnlineStatus() {
      setIsOnline(navigator.onLine);
    }

    // Add event listeners for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return isOnline;
}

// Check if we're currently online (without the hook, for non-component code)
export function checkOnlineStatus(): boolean {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true; // Default to true if we can't detect
}

// Function to ping the server to confirm actual connectivity
export async function pingServer(): Promise<boolean> {
  try {
    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/ping?t=${timestamp}`, {
      method: 'HEAD',
      // Set a short timeout to quickly determine if server is reachable
      // Note: AbortController is used in the actual fetch call
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('Ping failed:', error);
    return false;
  }
}

// Combines browser online check with ping verification
export async function isServerReachable(): Promise<boolean> {
  const browserOnline = checkOnlineStatus();
  
  if (!browserOnline) {
    return false; // Browser already knows we're offline
  }
  
  // Double-check with a ping
  return await pingServer();
}

// Alias for isServerReachable for compatibility
export const checkConnectivity = isServerReachable;
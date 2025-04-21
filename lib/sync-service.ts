"use client"

import { toast } from '@/components/ui/use-toast'
import { 
  getOfflineQueue, 
  removeFromOfflineQueue, 
  updateOperationRetryCount, 
  PendingOperation,
  PendingOperationWithRetry,
  clearOfflineData
} from './offline-storage'
import { checkConnectivity } from './network-status'

// Alias for backward compatibility
const clearOfflineQueue = clearOfflineData

// Maximum number of retry attempts for a single operation
const MAX_RETRY_ATTEMPTS = 3

// Time to wait between sync attempts (in milliseconds)
const SYNC_RETRY_DELAY = 5000

// Singleton flag to prevent multiple sync processes
let isSyncing = false

/**
 * Process a single offline operation by making the appropriate API call
 */
async function processOperation(operation: PendingOperationWithRetry): Promise<boolean> {
  try {
    // Make the API request based on the stored operation
    const response = await fetch(operation.url, {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: operation.method !== 'GET' && operation.method !== 'DELETE' ? JSON.stringify(operation.data) : undefined,
    })

    if (!response.ok) {
      console.error(`Sync failed for operation ${operation.id}:`, await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error(`Error processing operation ${operation.id}:`, error)
    return false
  }
}

/**
 * Attempt to synchronize all pending offline operations
 */
export async function syncOfflineData(): Promise<{ success: boolean; syncedCount: number; failedCount: number }> {
  // If already syncing, don't start another sync process
  if (isSyncing) {
    return { success: false, syncedCount: 0, failedCount: 0 }
  }

  // Check if we're online - if not, don't even try
  const isConnected = await checkConnectivity()
  if (!isConnected) {
    return { success: false, syncedCount: 0, failedCount: 0 }
  }

  try {
    isSyncing = true
    
    // Get all pending operations
    const operations = getOfflineQueue()
    
    if (operations.length === 0) {
      return { success: true, syncedCount: 0, failedCount: 0 }
    }
    
    let syncedCount = 0
    let failedCount = 0
    
    // Process operations one by one
    for (const operation of operations) {
      const success = await processOperation(operation)
      
      if (success) {
        // If successful, remove from queue
        removeFromOfflineQueue(operation.id)
        syncedCount++
      } else {
        // If failed, increment retry count
        const currentRetryCount = (operation as PendingOperationWithRetry).retryCount || 0;
        updateOperationRetryCount(operation.id, currentRetryCount + 1)
        
        // If we've tried too many times, give up on this operation
        if (currentRetryCount + 1 >= MAX_RETRY_ATTEMPTS) {
          removeFromOfflineQueue(operation.id)
          console.error(`Giving up on operation ${operation.id} after ${MAX_RETRY_ATTEMPTS} failed attempts`)
        }
        
        failedCount++
      }
    }
    
    return { success: syncedCount > 0, syncedCount, failedCount }
  } catch (error) {
    console.error('Error during offline sync:', error)
    return { success: false, syncedCount: 0, failedCount: 0 }
  } finally {
    isSyncing = false
  }
}

/**
 * Setup background sync that triggers when online status changes
 */
export function setupBackgroundSync() {
  if (typeof window === 'undefined') return
  
  // Sync when we come online
  window.addEventListener('online', async () => {
    // Show toast notification
    toast({
      title: 'Back online',
      description: 'Synchronizing your offline changes...',
    })
    
    // Attempt to sync
    const result = await syncOfflineData()
    
    // Show result toast
    if (result.syncedCount > 0) {
      toast({
        title: 'Sync complete',
        description: `Successfully synchronized ${result.syncedCount} changes.`,
        variant: 'default',
      })
    }
    
    if (result.failedCount > 0) {
      toast({
        title: 'Sync issues',
        description: `${result.failedCount} changes could not be synchronized.`,
        variant: 'destructive',
      })
    }
  })
  
  // Setup periodic background sync attempt (every minute when online)
  setInterval(async () => {
    const isConnected = await checkConnectivity()
    if (isConnected) {
      await syncOfflineData()
    }
  }, 60000)
}

/**
 * Manually trigger a sync attempt
 */
export async function manualSync(): Promise<{ success: boolean; syncedCount: number; failedCount: number }> {
  toast({
    title: 'Syncing data',
    description: 'Attempting to synchronize your offline changes...',
  })
  
  const result = await syncOfflineData()
  
  if (result.syncedCount > 0) {
    toast({
      title: 'Sync complete',
      description: `Successfully synchronized ${result.syncedCount} changes.`,
      variant: 'default',
    })
  } else if (result.failedCount > 0) {
    toast({
      title: 'Sync failed',
      description: `${result.failedCount} changes could not be synchronized.`,
      variant: 'destructive',
    })
  } else {
    toast({
      title: 'Nothing to sync',
      description: 'No offline changes were found.',
    })
  }
  
  return result
}
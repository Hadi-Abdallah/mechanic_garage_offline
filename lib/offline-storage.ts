/**
 * Offline storage implementation using localStorage
 */

// Define storage keys
const PENDING_OPERATIONS_KEY = 'offline_pending_operations';
const OFFLINE_DATA_KEY_PREFIX = 'offline_data_';

// Type for pending operations
export interface PendingOperation {
  id: string;
  timestamp: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  data?: any;
}

// Check if we're in a browser environment
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Save pending operations to localStorage
export function savePendingOperations(operations: PendingOperation[]): void {
  if (!isBrowser()) return;
  
  try {
    localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(operations));
  } catch (error) {
    console.error('Failed to save pending operations to localStorage:', error);
  }
}

// Load pending operations from localStorage
export function loadPendingOperations(): PendingOperation[] {
  if (!isBrowser()) return [];
  
  try {
    const data = localStorage.getItem(PENDING_OPERATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load pending operations from localStorage:', error);
    return [];
  }
}

// Add a pending operation
export function queueOfflineOperation(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
): string {
  if (!isBrowser()) return '';
  
  const operations = loadPendingOperations();
  const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  const newOperation: PendingOperation = {
    id,
    timestamp: Date.now(),
    method,
    url,
    data,
  };
  
  operations.push(newOperation);
  savePendingOperations(operations);
  return id;
}

// Remove a pending operation by ID
export function removePendingOperation(id: string): void {
  if (!isBrowser()) return;
  
  const operations = loadPendingOperations();
  const filteredOperations = operations.filter(op => op.id !== id);
  savePendingOperations(filteredOperations);
}

// Store data in offline storage
export function storeOfflineData(key: string, data: any): void {
  if (!isBrowser()) return;
  
  try {
    localStorage.setItem(`${OFFLINE_DATA_KEY_PREFIX}${key}`, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to store offline data for key ${key}:`, error);
  }
}

// Retrieve data from offline storage
export function getOfflineData<T = any>(key: string): T | null {
  if (!isBrowser()) return null;
  
  try {
    const data = localStorage.getItem(`${OFFLINE_DATA_KEY_PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Failed to get offline data for key ${key}:`, error);
    return null;
  }
}

// Remove data from offline storage
export function removeOfflineData(key: string): void {
  if (!isBrowser()) return;
  
  try {
    localStorage.removeItem(`${OFFLINE_DATA_KEY_PREFIX}${key}`);
  } catch (error) {
    console.error(`Failed to remove offline data for key ${key}:`, error);
  }
}

// Clear all offline data (but keep pending operations)
export function clearOfflineData(): void {
  if (!isBrowser()) return;
  
  try {
    // Get all localStorage keys
    const keys = Object.keys(localStorage);
    
    // Remove all items with the offline data prefix
    for (const key of keys) {
      if (key.startsWith(OFFLINE_DATA_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('Failed to clear offline data:', error);
  }
}

// Check if there are pending operations
export function hasPendingOperations(): boolean {
  return loadPendingOperations().length > 0;
}

// Get the count of pending operations
export function getPendingOperationsCount(): number {
  return loadPendingOperations().length;
}

// Get all pending operations (as the offline queue)
export function getOfflineQueue(): PendingOperation[] {
  return loadPendingOperations();
}

// Remove an operation from the offline queue
export function removeFromOfflineQueue(id: string): void {
  removePendingOperation(id);
}

// Update operation with retry count
export interface PendingOperationWithRetry extends PendingOperation {
  retryCount?: number;
}

// Update an operation's retry count
export function updateOperationRetryCount(id: string, retryCount: number): void {
  if (!isBrowser()) return;
  
  const operations = loadPendingOperations();
  const updatedOperations = operations.map(op => {
    if (op.id === id) {
      return { ...op, retryCount };
    }
    return op;
  });
  
  savePendingOperations(updatedOperations);
}
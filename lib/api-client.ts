"use client"

import { toast } from '@/components/ui/use-toast'
import { queueOfflineOperation } from './offline-storage'
import { checkConnectivity } from './network-status'

// Interface for API request options
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  requiresAuth?: boolean
  offlineFallback?: boolean // Whether to allow offline fallback or require online
}

// Default request options
const defaultOptions: ApiRequestOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  requiresAuth: false,
  offlineFallback: true,
}

/**
 * Makes API requests with offline support
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<{ data: T | null; error: Error | null; offline: boolean }> {
  // Merge default options with provided options
  const requestOptions: ApiRequestOptions = { ...defaultOptions, ...options }
  
  // If body is provided and is an object, convert to JSON string
  if (requestOptions.body && typeof requestOptions.body === 'object') {
    requestOptions.body = JSON.stringify(requestOptions.body)
  }
  
  try {
    // Check if we're online
    const isOnline = await checkConnectivity()
    
    // If we're online, make the actual API request
    if (isOnline) {
      const response = await fetch(endpoint, requestOptions as RequestInit)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }
      
      // Parse JSON response (or return null for no content)
      const contentType = response.headers.get('content-type')
      const data = contentType?.includes('application/json') 
        ? await response.json() as T
        : null
      
      return { data, error: null, offline: false }
    } 
    // We're offline, handle according to options
    else {
      // If this request doesn't support offline fallback, return an error
      if (!requestOptions.offlineFallback) {
        return {
          data: null,
          error: new Error('Network is offline and this action requires an internet connection'),
          offline: true,
        }
      }
      
      // For GET requests, we can't do much when offline except return an error
      if (requestOptions.method === 'GET') {
        return { 
          data: null, 
          error: new Error('Cannot fetch data while offline'),
          offline: true
        }
      }
      
      // For write operations (POST, PUT, DELETE), queue them for later
      const operationId = queueOfflineOperation(
        requestOptions.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint,
        typeof requestOptions.body === 'string' 
          ? JSON.parse(requestOptions.body) 
          : requestOptions.body
      )
      
      // Notify the user that we're working offline
      toast({
        title: 'You are offline',
        description: 'Your changes have been saved locally and will be synchronized when you reconnect.',
        variant: 'default',
      })
      
      // Return a "success" response with offline flag
      return { 
        data: typeof requestOptions.body === 'string' 
          ? JSON.parse(requestOptions.body) 
          : requestOptions.body, 
        error: null,
        offline: true
      }
    }
  } catch (error) {
    console.error('API request failed:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error occurred'),
      offline: false 
    }
  }
}

/**
 * Helper methods for common API operations with offline support
 */
export const api = {
  get: async <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) => {
    return apiRequest<T>(endpoint, { ...options, method: 'GET' })
  },
  
  post: async <T = any>(endpoint: string, data: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) => {
    return apiRequest<T>(endpoint, { ...options, method: 'POST', body: data })
  },
  
  put: async <T = any>(endpoint: string, data: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) => {
    return apiRequest<T>(endpoint, { ...options, method: 'PUT', body: data })
  },
  
  delete: async <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) => {
    return apiRequest<T>(endpoint, { ...options, method: 'DELETE' })
  },
}
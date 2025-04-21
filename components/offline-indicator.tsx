"use client"

import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/lib/network-status'
import { WifiOff, Upload } from 'lucide-react'
import { hasPendingOperations, getPendingOperationsCount } from '@/lib/offline-storage'
import { manualSync } from '@/lib/sync-service'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Offline indicator component shows when the user is working offline
export function OfflineIndicator() {
  const isOnline = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  
  // Update pending operations count every 5 seconds
  useEffect(() => {
    setPendingCount(getPendingOperationsCount())
    
    const interval = setInterval(() => {
      setPendingCount(getPendingOperationsCount())
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])
  
  // If online and no pending operations, don't show anything
  if (isOnline && pendingCount === 0) {
    return null
  }
  
  return (
    <div className="fixed bottom-4 right-4 flex items-center space-x-2 z-50">
      <TooltipProvider>
        {!isOnline && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-destructive text-destructive-foreground text-sm font-medium px-3 py-1.5 rounded-md flex items-center shadow-lg animate-pulse">
                <WifiOff className="w-4 h-4 mr-2" />
                <span>Offline Mode</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>You are currently working offline. Your changes will be saved locally and synced when you reconnect.</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {isOnline && pendingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-300"
                onClick={() => manualSync()}
              >
                <Upload className="w-4 h-4 mr-1" />
                <span>Sync ({pendingCount})</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>You have {pendingCount} pending changes to sync. Click to synchronize now.</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  )
}

// Layout wrapper that adds offline awareness to any component
export function OfflineAwareLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <OfflineIndicator />
    </>
  )
}
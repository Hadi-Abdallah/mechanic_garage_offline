"use client"

import React, { useEffect } from 'react'
import { OfflineAwareLayout } from '@/components/offline-indicator'
import { setupBackgroundSync } from '@/lib/sync-service'

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize offline sync on client side
  useEffect(() => {
    // Setup background sync process when component mounts (only in browser)
    setupBackgroundSync()
  }, [])

  return (
    <OfflineAwareLayout>
      {children}
    </OfflineAwareLayout>
  )
}
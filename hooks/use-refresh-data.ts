"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function useRefreshData(interval = 60000) {
  const router = useRouter()
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const refresh = useCallback(() => {
    router.refresh()
    setLastRefresh(new Date())
  }, [router])

  // Auto-refresh on interval
  useEffect(() => {
    const timer = setInterval(() => {
      refresh()
    }, interval)

    return () => clearInterval(timer)
  }, [refresh, interval])

  return { lastRefresh, refresh }
}


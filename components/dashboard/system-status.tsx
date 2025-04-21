"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Clock } from "lucide-react"

export function SystemStatus() {
  const [status, setStatus] = useState<"online" | "offline" | "checking">("checking")
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // In a real app, this would check the actual database connection
        // For now, we'll just simulate a check
        setStatus("checking")
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setStatus("online")
        setLastChecked(new Date())
      } catch (error) {
        setStatus("offline")
        setLastChecked(new Date())
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">System Status</CardTitle>
        <CardDescription>Database connection status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          {status === "online" && <CheckCircle className="h-5 w-5 text-green-500" />}
          {status === "offline" && <AlertCircle className="h-5 w-5 text-red-500" />}
          {status === "checking" && <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />}
          <span className="font-medium">
            {status === "online" && "System Online"}
            {status === "offline" && "System Offline"}
            {status === "checking" && "Checking Status..."}
          </span>
        </div>
        {lastChecked && (
          <p className="text-xs text-muted-foreground mt-1">Last checked: {lastChecked.toLocaleTimeString()}</p>
        )}
      </CardContent>
    </Card>
  )
}


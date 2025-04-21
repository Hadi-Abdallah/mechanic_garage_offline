"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getEnvVariables } from "@/lib/env-actions"

export function EnvDebug() {
  const [envVars, setEnvVars] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchEnvVars = async () => {
    setLoading(true)
    try {
      const vars = await getEnvVariables()
      setEnvVars(vars)
    } catch (error) {
      console.error("Error fetching env vars:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment Variables</CardTitle>
        <CardDescription>View your current environment variables</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={fetchEnvVars} disabled={loading}>
            {loading ? "Loading..." : "Show Environment Variables"}
          </Button>

          {envVars && (
            <div className="mt-4 space-y-2">
              <h3 className="text-lg font-medium">Available Variables:</h3>
              <div className="rounded-md bg-muted p-4">
                <pre className="text-sm">
                  {Object.entries(envVars).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-bold">{key}:</span> {value}
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


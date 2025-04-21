import { getLogs } from "@/lib/actions"
import { LogsTable } from "@/components/reports/logs-table"
import { RefreshButton } from "@/components/refresh-button"
import { Suspense } from "react"

export default async function ReportsPage() {
  try {
    // Fetch logs from the database
    const { success, data: logs, error } = await getLogs()

    if (!success) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Reports</h1>
            <RefreshButton />
          </div>
          <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
            Error loading logs: {error}
          </div>
        </div>
      )
    }

    // Validate logs is an array
    if (!Array.isArray(logs)) {
      console.error("Logs is not an array:", logs)
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Reports</h1>
            <RefreshButton />
          </div>
          <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
            Error: Invalid logs data format
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reports</h1>
          <RefreshButton />
        </div>
        <Suspense fallback={<div className="p-4 text-center">Loading logs data...</div>}>
          <LogsTable logs={logs} />
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error("Error in ReportsPage:", error)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reports</h1>
          <RefreshButton />
        </div>
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
          An unexpected error occurred: {error instanceof Error ? error.message : String(error)}
        </div>
      </div>
    )
  }
}


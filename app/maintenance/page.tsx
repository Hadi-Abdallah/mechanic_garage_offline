import { getMaintenanceRequests } from "@/lib/actions"
import { MaintenanceTable } from "@/components/maintenance/maintenance-table"
import { RefreshButton } from "@/components/refresh-button"
import { Suspense } from "react"

// Loading component to show while data is being fetched
function MaintenanceLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading maintenance data...</p>
      </div>
    </div>
  )
}

// Error component to show when data fetching fails
function MaintenanceError({ error }: { error: string }) {
  return (
    <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
      <h3 className="font-semibold mb-2">Error loading maintenance requests</h3>
      <p>{error}</p>
      <p className="mt-2 text-sm">Try refreshing the page or check the server logs for more details.</p>
    </div>
  )
}

export default async function MaintenancePage() {
  try {
    console.log("Fetching maintenance requests...")
    // Fetch maintenance requests from the database
    const { success, data: maintenanceRequests, error } = await getMaintenanceRequests()
    console.log(`Fetch result: success=${success}, error=${error}, data count=${maintenanceRequests?.length || 0}`)

    if (!success) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Maintenance</h1>
            <RefreshButton />
          </div>
          <MaintenanceError error={error || "Unknown error"} />
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Maintenance</h1>
          <RefreshButton />
        </div>
        <Suspense fallback={<MaintenanceLoading />}>
          <MaintenanceTable maintenanceRequests={maintenanceRequests || []} />
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error("Unhandled error in MaintenancePage:", error)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Maintenance</h1>
          <RefreshButton />
        </div>
        <MaintenanceError error={error instanceof Error ? error.message : "Unknown error"} />
      </div>
    )
  }
}


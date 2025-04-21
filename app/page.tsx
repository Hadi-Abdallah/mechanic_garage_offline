import { getSystemAnalytics } from "@/lib/actions"
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard"

export default async function DashboardPage() {
  const { success, data, error } = await getSystemAnalytics("month")

  // If we can't get analytics, show a basic dashboard
  if (!success || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
          Error loading analytics: {error || "Failed to load dashboard data"}
        </div>
      </div>
    )
  }

  return <AnalyticsDashboard initialData={data} />
}


import { Suspense } from "react"
import { ConsolidatedReportDashboard } from "@/components/reports/consolidated-report-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

export default function ConsolidatedReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Consolidated Reports</h1>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <ConsolidatedReportDashboard />
      </Suspense>
    </div>
  )
}
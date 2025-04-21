import { Suspense } from "react"
import { DailyReportDashboard } from "@/components/reports/daily-report-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

export default function DailyReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Daily Operations Report</h1>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <DailyReportDashboard />
      </Suspense>
    </div>
  )
}


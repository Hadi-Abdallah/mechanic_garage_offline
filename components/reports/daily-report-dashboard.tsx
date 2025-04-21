"use client"

import { useState, useEffect } from "react"
import { format, subDays } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertCircle, CalendarIcon, Download, RefreshCw } from "lucide-react"
import { NewCarsReport } from "@/components/reports/new-cars-report"
import { ServicesReport } from "@/components/reports/services-report"
import { ProductsReport } from "@/components/reports/products-report"
import { PaymentsReport } from "@/components/reports/payments-report"
import { MaintenanceReport } from "@/components/reports/maintenance-report"
import { getDailyReportData } from "@/lib/actions"
import { formatCurrency } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Helper function to get current date in Lebanon timezone
function getLebanonDate() {
  const now = new Date()
  // Lebanon is UTC+2 or UTC+3 depending on DST, using +3 to be safe
  const lebanonOffset = 3 * 60 // offset in minutes
  const utcOffset = now.getTimezoneOffset() // local offset in minutes

  // Calculate total offset from local time to Lebanon time
  const totalOffsetMinutes = utcOffset + lebanonOffset

  // Create a new date with the offset applied
  const lebanonDate = new Date(now.getTime() + totalOffsetMinutes * 60 * 1000)
  return lebanonDate
}

export function DailyReportDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(getLebanonDate())
  const [isLoading, setIsLoading] = useState(true)
  const [reportData, setReportData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchReportData = async (date: Date) => {
    setIsLoading(true)
    setError(null)
    try {
      // Format date in YYYY-MM-DD format
      const formattedDate = format(date, "yyyy-MM-dd")
      console.log(`Fetching report data for date: ${formattedDate}`)
      const result = await getDailyReportData(formattedDate)

      if (result.success) {
        console.log("Report data fetched successfully:", result.data)
        setReportData(result.data)
      } else {
        console.error("Failed to fetch report data:", result.error)
        setError(result.error || "Failed to fetch report data")
        // Still set the empty data structure to avoid null reference errors
        setReportData(
          result.data || {
            date: formattedDate,
            newCars: [],
            services: [],
            products: [],
            payments: [],
            totalPayments: 0,
            maintenance: [],
          },
        )
      }
    } catch (error) {
      console.error("Error fetching report data:", error)
      setError("An unexpected error occurred while fetching report data")
      setReportData({
        date: format(date, "yyyy-MM-dd"),
        newCars: [],
        services: [],
        products: [],
        payments: [],
        totalPayments: 0,
        maintenance: [],
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData(selectedDate)
  }, [selectedDate, retryCount])

  const handleRefresh = () => {
    setRetryCount((prev) => prev + 1)
  }

  const handleExportFullReport = () => {
    if (!reportData) return

    // Create CSV content for all data
    const allData = {
      newCars: reportData.newCars || [],
      services: reportData.services || [],
      products: reportData.products || [],
      payments: reportData.payments || [],
      maintenance: reportData.maintenance || [],
    }

    // Convert to JSON string
    const jsonString = JSON.stringify(allData, null, 2)

    // Create a blob and download
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `garage-report-${format(selectedDate, "yyyy-MM-dd")}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[240px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(getLebanonDate())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
              Previous Day
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportFullReport} disabled={!reportData || isLoading}>
            <Download className="mr-2 h-4 w-4" />
            Export Full Report
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : reportData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New Cars</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.newCars?.length || 0}</div>
                <p className="text-xs text-muted-foreground">{reportData.newCars?.length || 0} new registrations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Services Performed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.services?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(
                    reportData.services?.reduce((sum: number, s: any) => sum + (s.totalCost || 0), 0) || 0,
                  )}{" "}
                  value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Products Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.products?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.products?.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || 0} units
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Payments Received</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(reportData.totalPayments || 0)}</div>
                <p className="text-xs text-muted-foreground">{reportData.payments?.length || 0} transactions</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="maintenance">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="cars">New Cars</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="maintenance" className="mt-4">
              <MaintenanceReport data={reportData.maintenance || []} />
            </TabsContent>

            <TabsContent value="cars" className="mt-4">
              <NewCarsReport data={reportData.newCars || []} />
            </TabsContent>

            <TabsContent value="services" className="mt-4">
              <ServicesReport data={reportData.services || []} />
            </TabsContent>

            <TabsContent value="products" className="mt-4">
              <ProductsReport data={reportData.products || []} />
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <PaymentsReport data={reportData.payments || []} />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="flex items-center justify-center p-8 border rounded-lg">
          <p className="text-muted-foreground">No data available for the selected date.</p>
        </div>
      )}
    </div>
  )
}


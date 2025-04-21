"use client"

import { useState, useEffect } from "react"
import { format, subDays, addDays, isAfter, isBefore, isSameDay } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CalendarIcon, CalendarDays, Download, RefreshCw } from "lucide-react"
import { getDailyReportData } from "@/lib/actions"
import { formatCurrency } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConsolidatedTable } from "@/components/reports/consolidated-table"

// Helper function to get current date in Lebanon timezone (from existing code)
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

export function ConsolidatedReportDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(getLebanonDate())
  const [isLoading, setIsLoading] = useState(true)
  const [reportData, setReportData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Process the data for the consolidated hierarchical view
  const [consolidatedData, setConsolidatedData] = useState<any[]>([])
  // For tracking date range
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: selectedDate,
    end: selectedDate
  })
  const [isDateRangeMode, setIsDateRangeMode] = useState(false)
  
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
        // Update the start date in date range
        setDateRange(prev => ({ ...prev, start: date }))
        processHierarchicalData(result.data)
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
          }
        )
        setConsolidatedData([])
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
      setConsolidatedData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Process data into a hierarchical structure centered around cars and maintenance
  const processHierarchicalData = (data: any) => {
    if (!data) {
      setConsolidatedData([])
      return
    }
    
    // First, create a map of all cars (both new cars and cars from maintenance)
    const carsMap = new Map()
    
    // Process new cars data
    if (data.newCars && data.newCars.length > 0) {
      data.newCars.forEach((car: any) => {
        if (!carsMap.has(car.uin)) {
          carsMap.set(car.uin, {
            uin: car.uin,
            make: car.make,
            model: car.model,
            year: car.year,
            licensePlate: car.licensePlate,
            clientName: car.clientName,
            clientId: car.clientId,
            createdAt: car.createdAt,
            isNewCar: true,
            maintenance: [],
            displayName: `${car.make} ${car.model} (${car.licensePlate})`,
            totalCost: 0
          })
        }
      })
    }
    
    // Process maintenance data and associate with cars
    if (data.maintenance && data.maintenance.length > 0) {
      data.maintenance.forEach((maintenance: any) => {
        // If we don't have this car yet, add it
        if (!carsMap.has(maintenance.carUin)) {
          const carDetails = maintenance.carDetails || ''
          let make = ''
          let model = ''
          
          // Try to extract make and model from carDetails
          if (carDetails.includes(' ')) {
            const parts = carDetails.split(' ')
            make = parts[0]
            model = parts.slice(1).join(' ').replace(/\(.*\)/, '').trim()
          }
          
          carsMap.set(maintenance.carUin, {
            uin: maintenance.carUin,
            make: make,
            model: model,
            licensePlate: carDetails.match(/\((.*?)\)/)?.[1] || '',
            clientName: maintenance.clientName,
            clientId: maintenance.clientId,
            isNewCar: false,
            maintenance: [],
            displayName: carDetails || `Car ${maintenance.carUin}`,
            totalCost: 0
          })
        }
        
        // Get the car and add this maintenance request
        const car = carsMap.get(maintenance.carUin)
        
        // Calculate costs for products and services used in this maintenance
        let productsCost = 0
        let productsList = []
        if (maintenance.productDetails && maintenance.productDetails.length > 0) {
          productsList = maintenance.productDetails.map((product: any) => {
            const price = parseFloat(product.unitPrice || 0)
            const quantity = product.quantity || 1
            const cost = price * quantity
            productsCost += cost
            
            return {
              name: product.name,
              quantity: quantity,
              unitPrice: price,
              cost: cost,
              stockSource: product.stockSource
            }
          })
        } else if (data.products) {
          // Try to find products related to this maintenance
          const relatedProducts = data.products.filter((p: any) => p.maintenanceId === maintenance.id)
          productsList = relatedProducts.map((product: any) => {
            const name = product.productName || product.name
            // Use unitPrice (which should already be salePrice), otherwise fallback to salePrice over price
            const price = parseFloat(product.unitPrice || product.salePrice || product.price || 0)
            const quantity = product.quantity || 1
            const cost = product.totalCost || (price * quantity)
            productsCost += cost
            
            return {
              name: name,
              quantity: quantity,
              unitPrice: price,
              cost: cost,
              stockSource: product.stockSource
            }
          })
        }
        
        let servicesCost = 0
        let servicesList = []
        if (maintenance.serviceDetails && maintenance.serviceDetails.length > 0) {
          servicesList = maintenance.serviceDetails.map((service: any) => {
            const cost = service.cost || 0
            servicesCost += cost
            
            return {
              name: service.name,
              quantity: service.quantity || 1,
              unitPrice: service.quantity ? (cost / service.quantity) : cost,
              cost: cost
            }
          })
        } else if (data.services) {
          // Try to find services related to this maintenance
          const relatedServices = data.services.filter((s: any) => s.maintenanceId === maintenance.id)
          servicesList = relatedServices.map((service: any) => {
            const name = service.serviceName || service.name
            const cost = service.totalCost || service.cost || 0
            const quantity = service.quantity || 1
            const unitPrice = service.unitPrice || (quantity ? (cost / quantity) : 0)
            servicesCost += cost
            
            return {
              name: name,
              quantity: quantity,
              unitPrice: unitPrice,
              cost: cost
            }
          })
        }
        
        // Calculate total and update car's total
        const totalCost = maintenance.totalCost || (productsCost + servicesCost)
        car.totalCost += (isNaN(totalCost) ? 0 : totalCost)
        
        // Create the maintenance entry with full details
        const maintenanceEntry = {
          id: maintenance.id,
          startDate: maintenance.startDate,
          endDate: maintenance.endDate,
          status: maintenance.status,
          paymentStatus: maintenance.paymentStatus,
          totalCost: totalCost,
          paidAmount: maintenance.paidAmount || 0,
          remainingBalance: maintenance.remainingBalance || 0,
          additionalFee: maintenance.additionalFee || 0,
          discount: maintenance.discount || 0,
          products: productsList,
          services: servicesList,
          displayName: `Maintenance (${maintenance.status}) - ${format(new Date(maintenance.startDate || maintenance.createdAt), 'MMM d')}`
        }
        
        car.maintenance.push(maintenanceEntry)
      })
    }
    
    // Convert the map to an array and sort
    const consolidatedCars = Array.from(carsMap.values())
    
    // Sort cars: new cars first, then by total cost (descending)
    consolidatedCars.sort((a, b) => {
      if (a.isNewCar && !b.isNewCar) return -1
      if (!a.isNewCar && b.isNewCar) return 1
      return b.totalCost - a.totalCost
    })
    
    // For each car, sort maintenance by date (newest first)
    consolidatedCars.forEach(car => {
      car.maintenance.sort((a: any, b: any) => {
        return new Date(b.startDate || b.createdAt).getTime() - 
               new Date(a.startDate || a.createdAt).getTime()
      })
    })
    
    setConsolidatedData(consolidatedCars)
  }

  // Function to fetch data for a date range
  const fetchDateRangeData = async (start: Date, end: Date) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const startFormatted = format(start, "yyyy-MM-dd")
      const endFormatted = format(end, "yyyy-MM-dd")
      console.log(`Fetching report data for date range: ${startFormatted} to ${endFormatted}`)
      
      // Create array of all dates in the range
      const dates: Date[] = []
      let currentDate = new Date(start)
      
      while (currentDate <= end) {
        dates.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Fetch data for each date in the range
      const allDataPromises = dates.map(date => getDailyReportData(format(date, "yyyy-MM-dd")))
      const allResults = await Promise.all(allDataPromises)
      
      // Combine all successful results
      const combinedData = {
        date: `${startFormatted} to ${endFormatted}`,
        newCars: [],
        services: [],
        products: [],
        payments: [],
        totalPayments: 0,
        maintenance: []
      }
      
      allResults.forEach(result => {
        if (result.success && result.data) {
          combinedData.newCars = [...combinedData.newCars, ...(result.data.newCars || [])]
          combinedData.services = [...combinedData.services, ...(result.data.services || [])]
          combinedData.products = [...combinedData.products, ...(result.data.products || [])]
          combinedData.payments = [...combinedData.payments, ...(result.data.payments || [])]
          combinedData.totalPayments += (result.data.totalPayments || 0)
          combinedData.maintenance = [...combinedData.maintenance, ...(result.data.maintenance || [])]
        }
      })
      
      setReportData(combinedData)
      processHierarchicalData(combinedData)
    } catch (error) {
      console.error("Error fetching date range data:", error)
      setError("An unexpected error occurred while fetching date range data")
      setReportData({
        date: `${format(start, "yyyy-MM-dd")} to ${format(end, "yyyy-MM-dd")}`,
        newCars: [],
        services: [],
        products: [],
        payments: [],
        totalPayments: 0,
        maintenance: [],
      })
      setConsolidatedData([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data based on the selected mode (single day or date range)
  const fetchData = () => {
    if (isDateRangeMode && dateRange.start && dateRange.end) {
      fetchDateRangeData(dateRange.start, dateRange.end)
    } else {
      fetchReportData(selectedDate)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate, dateRange.start, dateRange.end, isDateRangeMode, retryCount])

  const handleRefresh = () => {
    setRetryCount((prev) => prev + 1)
  }

  const handleExportFullReport = () => {
    if (!reportData) return

    // Create filename based on date mode
    let fileName = ""
    let dateStr = ""
    
    if (isDateRangeMode) {
      dateStr = `${format(dateRange.start, "yyyy-MM-dd")}_to_${format(dateRange.end, "yyyy-MM-dd")}`
      fileName = `consolidated-report-${dateStr}.json`
    } else {
      dateStr = format(selectedDate, "yyyy-MM-dd")
      fileName = `consolidated-report-${dateStr}.json`
    }

    // Create JSON data including consolidated view
    const allData = {
      date: isDateRangeMode 
        ? `${format(dateRange.start, "yyyy-MM-dd")} to ${format(dateRange.end, "yyyy-MM-dd")}`
        : format(selectedDate, "yyyy-MM-dd"),
      summary: {
        newCars: reportData.newCars?.length || 0,
        services: reportData.services?.length || 0,
        products: reportData.products?.length || 0,
        payments: reportData.payments?.length || 0,
        totalPayments: reportData.totalPayments || 0,
        maintenance: reportData.maintenance?.length || 0,
      },
      consolidated: consolidatedData,
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
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Tabs 
          defaultValue="single-day" 
          className="w-full"
          onValueChange={(value) => setIsDateRangeMode(value === "date-range")}
        >
          <div className="flex flex-col sm:flex-row justify-between items-center mb-2">
            <TabsList>
              <TabsTrigger value="single-day">Single Day</TabsTrigger>
              <TabsTrigger value="date-range">Date Range</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2 mt-2 sm:mt-0">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportFullReport} 
                disabled={!reportData || isLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Full Report
              </Button>
            </div>
          </div>
          
          <TabsContent value="single-day" className="mt-2">
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
          </TabsContent>
          
          <TabsContent value="date-range" className="mt-2">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[200px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.start ? format(dateRange.start, "MMM d, yyyy") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.start}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, start: date }))}
                      initialFocus
                      disabled={(date) => isAfter(date, dateRange.end)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[200px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.end ? format(dateRange.end, "MMM d, yyyy") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.end}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, end: date }))}
                      initialFocus
                      disabled={(date) => isBefore(date, dateRange.start)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex gap-2 self-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const today = getLebanonDate()
                    setDateRange({
                      start: subDays(today, 6), // Last 7 days including today
                      end: today
                    })
                  }}
                >
                  Last 7 Days
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const today = getLebanonDate()
                    setDateRange({
                      start: subDays(today, 29), // Last 30 days including today
                      end: today
                    })
                  }}
                >
                  Last 30 Days
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="h-[500px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Loading report data...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : consolidatedData.length > 0 ? (
        <ConsolidatedTable 
          data={consolidatedData} 
          dateInfo={{
            isDateRange: isDateRangeMode,
            singleDate: selectedDate,
            dateRange: dateRange
          }}
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">No data available for the selected date.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
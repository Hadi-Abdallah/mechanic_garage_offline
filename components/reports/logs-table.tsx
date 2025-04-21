"use client"

import { useState, useEffect } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { LogEntry } from "@/lib/db"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, FileText } from "lucide-react"
import { getLogsByDateRange, getClients, getCars, getServices, getProducts, getMaintenanceById } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollableDialogBody } from "@/components/ui/scrollable-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

// Extended LogEntry type to include enriched data
type EnrichedLogEntry = LogEntry & {
  clientName?: string
  carDetails?: string
  insuranceName?: string
  serviceName?: string
  productName?: string
  // Added for maintenance details
  maintenanceDetails?: {
    serviceDetails?: Array<{
      serviceId: string
      quantity: number
      name: string
      cost: number
    }>
    productDetails?: Array<{
      productId: string
      quantity: number
      stockSource: "warehouse" | "shop"
      name: string
      unitPrice: number
      cost: number
    }>
  }
}

interface LogsTableProps {
  logs: EnrichedLogEntry[]
}

export function LogsTable({ logs: initialLogs }: LogsTableProps) {
  // Helper function to safely parse JSON
  // Helper function to format JSON in a human-readable way
  const tryParseJSON = (jsonString: string | null | undefined) => {
    if (!jsonString) return null

    try {
      // First check if it's already an object (might have been parsed already)
      if (typeof jsonString === "object") return jsonString

      const parsedData = JSON.parse(jsonString)
      
      // Create a more human-readable version of the data
      if (typeof parsedData === 'object' && parsedData !== null) {
        return parsedData
      }
      
      return parsedData
    } catch (error) {
      console.error("Error parsing JSON:", error)
      // Return the original string instead of an error object
      return { rawData: jsonString }
    }
  }
  
  // Helper function to render JSON data as human-readable content
  const formatJSONForDisplay = (data: any): React.ReactNode => {
    if (!data) return "No data"
    
    if (data.rawData) {
      return <span>Raw data (not valid JSON): {data.rawData}</span>
    }
    
    if (typeof data !== 'object' || data === null) {
      return String(data)
    }
    
    // Filter out empty objects or arrays (common in maintenance data)
    const filteredEntries = Object.entries(data).filter(([key, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'object') {
        return Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0;
      }
      return true;
    });
    
    // If it's an empty filtered object, return a helpful message
    if (filteredEntries.length === 0) {
      return <span className="text-muted-foreground">No detailed information available</span>;
    }
    
    // If it's a simple object, render it as a table
    return (
      <div className="space-y-1 text-xs">
        {filteredEntries.map(([key, value], index) => {
          // Format the key to be more readable
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
            .replace(/Id$/, ' ID')
            .replace(/Uin$/, ' UIN')
          
          // Format the value based on its type
          let formattedValue: React.ReactNode
          
          if (value === null || value === undefined) {
            formattedValue = <span className="text-muted-foreground">None</span>
          } else if (typeof value === 'boolean') {
            formattedValue = value ? 'Yes' : 'No'
          } else if (typeof value === 'number') {
            // Format monetary values
            if (['price', 'cost', 'fee', 'amount', 'balance', 'total'].some(term => key.toLowerCase().includes(term))) {
              formattedValue = formatCurrency(value)
            } else {
              formattedValue = String(value)
            }
          } else if (typeof value === 'string') {
            // Check if it's a date string
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
              formattedValue = new Date(value).toLocaleString()
            } else {
              formattedValue = value
            }
          } else if (typeof value === 'object') {
            // For nested objects, show a summarized version with expandable details
            const isArray = Array.isArray(value)
            const count = isArray ? value.length : Object.keys(value).length
            
            // Special handling for maintenance-related arrays
            if (isArray && (key === 'servicesUsed' || key === 'productsUsed')) {
              formattedValue = (
                <div className="space-y-1 mt-1">
                  {value.map((item: any, idx: number) => {
                    // Format services and products nicely
                    if (key === 'servicesUsed') {
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span>{item.serviceId?.substring(0, 8) || 'Service'} × {item.quantity || 1}</span>
                        </div>
                      )
                    } else { // productsUsed
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span>{item.productId?.substring(0, 8) || 'Product'} × {item.quantity || 1} ({item.stockSource || 'stock'})</span>
                        </div>
                      )
                    }
                  })}
                </div>
              )
            } else {
              // Default expandable details for other objects/arrays
              formattedValue = (
                <details>
                  <summary className="cursor-pointer text-blue-500 dark:text-blue-400 hover:text-blue-700 text-xs">
                    {isArray ? `${count} items` : `${count} properties`}
                  </summary>
                  <div className="pl-4 pt-1 border-l-2 border-muted mt-1">
                    {formatJSONForDisplay(value)}
                  </div>
                </details>
              )
            }
          } else {
            formattedValue = String(value)
          }
          
          return (
            <div key={index} className="grid grid-cols-3 gap-2 py-1 border-b border-muted">
              <div className="font-medium col-span-1">{formattedKey}</div>
              <div className="col-span-2">{formattedValue}</div>
            </div>
          )
        })}
      </div>
    )
  }

  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [logs, setLogs] = useState<EnrichedLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<EnrichedLogEntry | null>(null)
  const [filterTable, setFilterTable] = useState<string>("all")
  const [clients, setClients] = useState<any[]>([])
  const [cars, setCars] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  // Fetch reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [clientsResponse, carsResponse, servicesResponse, productsResponse] = await Promise.all([
          getClients(),
          getCars(),
          getServices(),
          getProducts(),
        ])

        if (clientsResponse.success && clientsResponse.data) {
          setClients(clientsResponse.data)
        }
        if (carsResponse.success && carsResponse.data) {
          setCars(carsResponse.data)
        }
        if (servicesResponse.success && servicesResponse.data) {
          setServices(servicesResponse.data)
        }
        if (productsResponse.success && productsResponse.data) {
          setProducts(productsResponse.data)
        }
      } catch (error) {
        console.error("Error fetching reference data:", error)
      }
    }

    fetchReferenceData()
  }, [])

  // Enrich logs with names instead of IDs and fetch maintenance details
  useEffect(() => {
    async function fetchMaintenanceDetails() {
      if (!initialLogs || !Array.isArray(initialLogs)) {
        setIsLoading(false)
        return
      }

      // Process each log entry
      const enrichedLogs = await Promise.all(
        initialLogs.map(async (log) => {
          const enrichedLog = { ...log }

          // If log has a maintenance ID, fetch the maintenance details (for both maintenance and payment logs)
          if (log.maintenanceId && (log.tableName === "maintenance" || (log.paymentAmount && log.actionType === "update"))) {
            try {
              const maintenanceResponse = await getMaintenanceById(log.maintenanceId)
              if (maintenanceResponse.success && maintenanceResponse.data) {
                const maintenance = maintenanceResponse.data
                
                // Get service details if available
                const serviceDetails = Array.isArray(maintenance.servicesUsed)
                  ? maintenance.servicesUsed.map(serviceUsed => {
                      const service = services.find(s => s.id === serviceUsed.serviceId)
                      return {
                        ...serviceUsed,
                        name: service?.name || "Unknown Service",
                        cost: service ? service.standardFee * serviceUsed.quantity : 0,
                      }
                    })
                  : []

                // Get product details if available
                const productDetails = Array.isArray(maintenance.productsUsed)
                  ? maintenance.productsUsed.map(productUsed => {
                      const product = products.find(p => p.id === productUsed.productId)
                      return {
                        ...productUsed,
                        name: product?.name || "Unknown Product",
                        unitPrice: product?.price || 0,
                        cost: product ? product.price * productUsed.quantity : 0,
                      }
                    })
                  : []

                enrichedLog.maintenanceDetails = {
                  serviceDetails,
                  productDetails,
                }
              }
            } catch (error) {
              console.error(`Error fetching maintenance details for ${log.maintenanceId}:`, error)
              // If there's an error, we'll continue without maintenance details
              enrichedLog.maintenanceDetails = { serviceDetails: [], productDetails: [] }
            }
          }
          return enrichedLog
        })
      )
      
      setLogs(enrichedLogs)
      setIsLoading(false)
    }

    fetchMaintenanceDetails()
  }, [initialLogs, services, products])

  const handleDateRangeFilter = async () => {
    if (!startDate) {
      toast({
        title: "Error",
        description: "Please select a start date",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const formattedStartDate = format(startDate, "yyyy-MM-dd")
      const formattedEndDate = endDate ? format(endDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")

      const result = await getLogsByDateRange(formattedStartDate, formattedEndDate)
      if (result.success) {
        // Enrich the filtered logs with names
        const enrichedFilteredLogs = result.data.map((log) => {
          const enrichedLog = { ...log }

          // Add client name if clientId exists
          if (log.clientId) {
            const client = clients.find((c) => c.id === log.clientId)
            if (client) {
              enrichedLog.clientName = client.name
            }
          }

          // Add car details if carUin exists
          if (log.carUin) {
            const car = cars.find((c) => c.uin === log.carUin)
            if (car) {
              enrichedLog.carDetails = `${car.make} ${car.model} (${car.licensePlate})`
            }
          }

          // Add service name if serviceId exists
          if (log.serviceId) {
            const service = services.find((s) => s.id === log.serviceId)
            if (service) {
              enrichedLog.serviceName = service.name
            }
          }

          // Add product name if productId exists
          if (log.productId) {
            const product = products.find((p) => p.id === log.productId)
            if (product) {
              enrichedLog.productName = product.name
            }
          }

          return enrichedLog
        })

        setLogs(enrichedFilteredLogs || [])
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetDateFilter = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    setLogs(initialLogs)
    setFilterTable("all")
  }

  const filterLogsByTable = (table: string) => {
    if (table === "all") {
      setLogs(startDate ? logs : initialLogs)
    } else {
      const filtered = (startDate ? logs : initialLogs).filter((log) => log.tableName === table)
      setLogs(filtered)
    }
    setFilterTable(table)
  }

  const handleViewDetails = (log: EnrichedLogEntry) => {
    setSelectedLog(log)
  }

  const columns: ColumnDef<EnrichedLogEntry>[] = [
    {
      accessorKey: "clientName",
      header: "Client",
      cell: ({ row }) => {
        const clientId = row.original.clientId
        const clientName = row.original.clientName
        if (!clientId) return "-"
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/clients/${clientId}`} className="text-blue-600 hover:underline">
                  {clientName || clientId}
                </Link>
              </TooltipTrigger>
              <TooltipContent className="w-80 p-0">
                <div className="p-4 max-h-[300px] overflow-y-auto">
                  <p className="font-medium">Client: {clientName || clientId}</p>
                  {clientId && (
                    <p className="text-xs text-muted-foreground mt-1">ID: {clientId}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      filterFn: (row, id, value) => true,
      // Make this column sticky (fixed) when scrolling horizontally
      meta: {
        className: "sticky left-0 z-10 bg-white dark:bg-gray-950",
      },
    },
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => {
        const timestamp = row.getValue("timestamp")
        if (timestamp) {
          return new Date(timestamp as string).toLocaleString()
        }
        return "N/A"
      },
      filterFn: (row, id, value) => true, // Custom filter function
    },
    {
      accessorKey: "actionType",
      header: "Action",
      cell: ({ row }) => {
        const actionType = row.getValue("actionType") as string
        const paymentAmount = row.original.paymentAmount

        // If there's a payment amount, show "Payment" instead of "update"
        const displayAction = paymentAmount && actionType === "update" ? "Payment" : actionType

        // Determine action description for tooltip
        let actionDescription = "";
        if (displayAction === "Payment") {
          actionDescription = `Payment of ${formatCurrency(paymentAmount || 0)} recorded`;
        } else if (displayAction === "create") {
          actionDescription = "New record created";
        } else if (displayAction === "update") {
          actionDescription = "Existing record updated";
        } else if (displayAction === "delete") {
          actionDescription = "Record deleted";
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={
                    displayAction === "Payment"
                      ? "success"
                      : displayAction === "create"
                        ? "success"
                        : displayAction === "update"
                          ? "default"
                          : "destructive"
                  }
                >
                  {displayAction === "Payment" ? "Payment" : displayAction}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="p-3">
                <p className="font-medium">{actionDescription}</p>
                {row.original.timestamp && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(row.original.timestamp).toLocaleString()}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      filterFn: (row, id, value) => true,
    },
    {
      accessorKey: "tableName",
      header: "Table",
      cell: ({ row }) => {
        const tableName = row.getValue("tableName") as string
        
        // Get a more readable table name for the tooltip
        const tableDisplayName = tableName.charAt(0).toUpperCase() + tableName.slice(1)
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="cursor-default">
                {tableName}
              </TooltipTrigger>
              <TooltipContent className="p-3">
                <p className="font-medium">{tableDisplayName} Record</p>
                {row.original.beforeValue && row.original.afterValue && (
                  <div className="text-xs text-muted-foreground mt-1">
                    <p>Record was {row.original.actionType}d</p>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      filterFn: (row, id, value) => true,
    },
    {
      accessorKey: "carDetails",
      header: "Car",
      cell: ({ row }) => {
        const carUin = row.original.carUin
        const carDetails = row.original.carDetails
        if (!carUin) return "-"
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/cars/${carUin}`} className="text-blue-600 hover:underline">
                  {carDetails || carUin}
                </Link>
              </TooltipTrigger>
              <TooltipContent className="w-80 p-0">
                <div className="p-4 max-h-[300px] overflow-y-auto">
                  <p className="font-medium">Car: {carDetails || carUin}</p>
                  {carUin && (
                    <p className="text-xs text-muted-foreground mt-1">UIN: {carUin}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      filterFn: (row, id, value) => true,
    },
    {
      accessorKey: "paymentAmount",
      header: "Payment",
      cell: ({ row }) => {
        const amount = row.getValue("paymentAmount")
        if (!amount) return "-"
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="text-right font-medium">
                {formatCurrency(Number(amount))}
              </TooltipTrigger>
              <TooltipContent className="p-3">
                <div>
                  <p className="font-medium">Payment Details</p>
                  <p className="text-xs text-muted-foreground mt-1">Amount: {formatCurrency(Number(amount))}</p>
                  {row.original.maintenanceId && (
                    <p className="text-xs text-muted-foreground">For maintenance: {row.original.maintenanceId}</p>
                  )}
                  {row.original.timestamp && (
                    <p className="text-xs text-muted-foreground">
                      Date: {new Date(row.original.timestamp).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      filterFn: (row, id, value) => true,
    },
    {
      accessorKey: "adminName",
      header: "Admin",
      cell: ({ row }) => {
        const adminName = row.getValue("adminName") as string
        if (!adminName) return "-"
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="cursor-default">
                {adminName}
              </TooltipTrigger>
              <TooltipContent className="p-3">
                <p className="font-medium">Administrator: {adminName}</p>
                {row.original.timestamp && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Action performed on {new Date(row.original.timestamp).toLocaleString()}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      filterFn: (row, id, value) => true,
    },
    {
      id: "itemsUsed",
      header: "Items Used",
      cell: ({ row }) => {
        const log = row.original
        
        // Handle maintenance logs
        if ((log.tableName === "maintenance" && log.maintenanceId) || 
            (log.paymentAmount && log.actionType === "update" && log.maintenanceId)) {
          // Fetch and display items directly from the maintenance details
          let displayText = "-";
          
          // Check if we have maintenanceDetails available
          if (log.maintenanceDetails) {
            const servicesList = log.maintenanceDetails.serviceDetails || [];
            const productsList = log.maintenanceDetails.productDetails || [];
            
            // If there are services or products, show them directly in the table
            if (servicesList.length > 0 || productsList.length > 0) {
              // Get the first few items to display directly in the cell
              const displayItems = [
                ...servicesList.slice(0, 2).map(s => `${s.name} (x${s.quantity})`),
                ...productsList.slice(0, 2).map(p => `${p.name} (x${p.quantity})`)
              ];
              
              const totalItems = servicesList.length + productsList.length;
              const hasMore = totalItems > displayItems.length;
              displayText = `${displayItems.join(", ")}${hasMore ? ` +${totalItems - displayItems.length} more` : ""}`;
              
              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="cursor-default text-left">
                      <span>{displayText}</span>
                    </TooltipTrigger>
                    <TooltipContent className="p-0 max-w-md">
                      <div className="p-4 max-h-[400px] overflow-y-auto">
                        <p className="font-medium">Items Used in Maintenance</p>
                        
                        {servicesList.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Services:</p>
                            <ul className="list-disc list-inside pl-2">
                              {servicesList.map((service, idx) => (
                                <li key={idx} className="text-xs">
                                  {service.name} x{service.quantity}: {formatCurrency(service.cost)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {productsList.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Products:</p>
                            <ul className="list-disc list-inside pl-2">
                              {productsList.map((product, idx) => (
                                <li key={idx} className="text-xs">
                                  {product.name} x{product.quantity} ({product.stockSource}): {formatCurrency(product.cost)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }
          }
          
          // If we don't have the details yet, check the before/after value for any service or product info
          if (log.afterValue) {
            try {
              const afterData = typeof log.afterValue === 'string' ? JSON.parse(log.afterValue) : log.afterValue;
              
              if (afterData && (afterData.servicesUsed || afterData.productsUsed)) {
                const services = afterData.servicesUsed || [];
                const products = afterData.productsUsed || [];
                
                if (services.length > 0 || products.length > 0) {
                  // Create a display text using more user-friendly names
                  const serviceTexts = services.slice(0, 2).map(s => {
                    // Map common service IDs to readable names
                    let serviceName = 'Service';
                    if (s.serviceId) {
                      // Common service names based on IDs in the data
                      if (s.serviceId.includes('d9dcf0')) serviceName = 'Oil Change';
                      else if (s.serviceId.includes('c0f481')) serviceName = 'Oil';
                      else serviceName = 'Maintenance Service';
                    }
                    return `${serviceName} (x${s.quantity || 1})`;
                  });
                  
                  const productTexts = products.slice(0, 2).map(p => {
                    // Map common product IDs to readable names
                    let productName = 'Product';
                    if (p.productId) {
                      // Common product names based on IDs in the data
                      if (p.productId.includes('d9dcf0')) productName = 'Oil';
                      else if (p.productId.includes('c0f481')) productName = 'Oil Filter';
                      else productName = 'Auto Part';
                    }
                    return `${productName} (x${p.quantity || 1})`;
                  });
                  
                  const displayItems = [...serviceTexts, ...productTexts];
                  const totalItems = services.length + products.length;
                  const hasMore = totalItems > displayItems.length;
                  return `${displayItems.join(", ")}${hasMore ? ` +${totalItems - displayItems.length} more` : ""}`;
                }
              }
            } catch (e) {
              // If we can't parse the JSON, just show a dash
              return "-";
            }
          }
        } 
        // Handle product logs
        else if (log.tableName === "products" && log.productId) {
          const productData = tryParseJSON(log.afterValue || log.beforeValue);
          if (productData) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-default text-left">
                    <span>{productData.name || "Product"}</span>
                  </TooltipTrigger>
                  <TooltipContent className="p-0 max-w-md">
                    <div className="p-4 max-h-[300px] overflow-y-auto">
                      <p className="font-medium">Product Details</p>
                      <table className="w-full text-xs mt-2">
                        <tbody>
                          <tr className="border-b">
                            <td className="font-medium py-1">Name:</td>
                            <td>{productData.name || "N/A"}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="font-medium py-1">Price:</td>
                            <td>{formatCurrency(productData.price || 0)}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="font-medium py-1">Description:</td>
                            <td>{productData.description || "N/A"}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="font-medium py-1">Warehouse Stock:</td>
                            <td>{productData.warehouseStock || 0}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="font-medium py-1">Shop Stock:</td>
                            <td>{productData.shopStock || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
        }
        // Handle service logs
        else if (log.tableName === "services" && log.serviceId) {
          const serviceData = tryParseJSON(log.afterValue || log.beforeValue);
          if (serviceData) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-default text-left">
                    <span>{serviceData.name || "Service"}</span>
                  </TooltipTrigger>
                  <TooltipContent className="p-0 max-w-md">
                    <div className="p-4 max-h-[300px] overflow-y-auto">
                      <p className="font-medium">Service Details</p>
                      <table className="w-full text-xs mt-2">
                        <tbody>
                          <tr className="border-b">
                            <td className="font-medium py-1">Name:</td>
                            <td>{serviceData.name || "N/A"}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="font-medium py-1">Fee:</td>
                            <td>{formatCurrency(serviceData.standardFee || 0)}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="font-medium py-1">Description:</td>
                            <td>{serviceData.description || "N/A"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
        }
        // Handle supplier logs
        else if (log.tableName === "suppliers") {
          const supplierData = tryParseJSON(log.afterValue || log.beforeValue);
          if (supplierData && supplierData.name) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-default text-left">
                    <span>{supplierData.name}</span>
                  </TooltipTrigger>
                  <TooltipContent className="p-0 max-w-md">
                    <div className="p-4 max-h-[300px] overflow-y-auto">
                      <p className="font-medium">Supplier Details</p>
                      <table className="w-full text-xs mt-2">
                        <tbody>
                          <tr className="border-b">
                            <td className="font-medium py-1">Name:</td>
                            <td>{supplierData.name || "N/A"}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="font-medium py-1">Contact:</td>
                            <td>{supplierData.contact || "N/A"}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="font-medium py-1">Phone:</td>
                            <td>{supplierData.phone || "N/A"}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="font-medium py-1">Email:</td>
                            <td>{supplierData.email || "N/A"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
        }
        // For other types, return a dash
        return "-";
      },
      filterFn: (row, id, value) => true,
    },
    {
      id: "maintenanceCost",
      header: "Maintenance Cost",
      cell: ({ row }) => {
        const log = row.original
        
        // Handle both maintenance logs and payment logs that reference maintenance
        if ((log.tableName === "maintenance" && log.maintenanceId && log.maintenanceDetails) || 
            (log.paymentAmount && log.actionType === "update" && log.maintenanceId && log.maintenanceDetails)) {
          const servicesCost = log.maintenanceDetails.serviceDetails?.reduce((total, service) => total + service.cost, 0) || 0
          const productsCost = log.maintenanceDetails.productDetails?.reduce((total, product) => total + product.cost, 0) || 0
          const totalCost = servicesCost + productsCost
          
          // For payment logs, also show the payment amount
          const isPayment = log.paymentAmount > 0 && log.actionType === "update"
          const paymentAmount = isPayment ? log.paymentAmount : 0
          
          if (totalCost > 0 || isPayment) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="text-right font-medium">
                    {isPayment 
                      ? <span className="flex items-center">
                          <span className="mr-1">{formatCurrency(totalCost)}</span>
                          <span className="text-green-500 text-xs ml-1">({formatCurrency(paymentAmount)} paid)</span>
                        </span>
                      : formatCurrency(totalCost)
                    }
                  </TooltipTrigger>
                  <TooltipContent className="w-80 p-0">
                    {/* Fixed wrapper to prevent stray text nodes */}
                    <>{/* 
                      This fragment wrapper ensures no stray text nodes appear
                      between the TooltipContent and the first div
                    */}</>
                    <div className="bg-white dark:bg-gray-900 rounded-md p-4">
                      {/* Maintenance Details Header */}
                      <h4 className="text-sm font-semibold mb-2">
                        {isPayment ? "Payment & Maintenance Details" : "Maintenance Details"}
                      </h4>
                      
                      {/* Payment Section (if applicable) */}
                      {isPayment && (
                        <div className="mb-3 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                          <div className="flex justify-between text-xs font-medium">
                            <span>Payment Amount</span>
                            <span className="text-green-600 dark:text-green-400">{formatCurrency(paymentAmount)}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Services Section */}
                      {log.maintenanceDetails.serviceDetails && log.maintenanceDetails.serviceDetails.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium mb-1">Services</p>
                          <div className="space-y-1">
                            {log.maintenanceDetails.serviceDetails.map((service, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span>{service.name} (x{service.quantity})</span>
                                <span>{formatCurrency(service.cost)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs font-medium border-t pt-1 mt-1">
                              <span>Services Total</span>
                              <span>{formatCurrency(servicesCost)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Products Section */}
                      {log.maintenanceDetails.productDetails && log.maintenanceDetails.productDetails.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Products</p>
                          <div className="space-y-1">
                            {log.maintenanceDetails.productDetails.map((product, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span>{product.name} (x{product.quantity})</span>
                                <span>{formatCurrency(product.cost)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs font-medium border-t pt-1 mt-1">
                              <span>Products Total</span>
                              <span>{formatCurrency(productsCost)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Total Section */}
                      <div className="flex justify-between text-sm font-semibold mt-3 pt-2 border-t">
                        <span>Total Cost</span>
                        <span>{formatCurrency(totalCost)}</span>
                      </div>
                      
                      {/* Payment Balance (if applicable) */}
                      {isPayment && (
                        <div className="flex justify-between text-xs mt-2 text-muted-foreground">
                          <span>Remaining Balance</span>
                          <span>{formatCurrency(totalCost - paymentAmount)}</span>
                        </div>
                      )}
                      {/* Final fragment to ensure no stray nodes at the end */}
                      <></>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          }
        }
        // For product logs, show the product price
        else if (log.tableName === "products" && log.productId) {
          const productData = tryParseJSON(log.afterValue || log.beforeValue)
          if (productData && productData.price) {
            return formatCurrency(productData.price)
          }
        }
        // For service logs, show the service fee
        else if (log.tableName === "services" && log.serviceId) {
          const serviceData = tryParseJSON(log.afterValue || log.beforeValue)
          if (serviceData && serviceData.standardFee) {
            return formatCurrency(serviceData.standardFee)
          }
        }
        return "-"
      },
      filterFn: (row, id, value) => true,
    },
    {
      id: "actions",
      header: "Details",
      cell: ({ row }) => {
        const log = row.original

        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                // Remove the onClick handler from here - it's causing the double-click issue
              >
                <FileText className="h-4 w-4" />
                <span className="sr-only">View Details</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Log Details</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto pr-6 pb-4" style={{ maxHeight: "60vh" }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Timestamp</p>
                      <p className="text-sm">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Action</p>
                      <Badge
                        variant={
                          log.paymentAmount && log.actionType === "update"
                            ? "success"
                            : log.actionType === "create"
                              ? "success"
                              : log.actionType === "update"
                                ? "default"
                                : "destructive"
                        }
                      >
                        {log.paymentAmount && log.actionType === "update" ? "Payment" : log.actionType}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Table</p>
                      <p className="text-sm">{log.tableName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Admin</p>
                      <p className="text-sm">{log.adminName}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Related Entities</p>
                    <div className="grid grid-cols-2 gap-4">
                      {log.clientId && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Client</p>
                          <p className="text-sm">{log.clientName || log.clientId}</p>
                        </div>
                      )}
                      {log.carUin && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Car</p>
                          <p className="text-sm">{log.carDetails || log.carUin}</p>
                        </div>
                      )}
                      {log.insuranceId && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Insurance</p>
                          <p className="text-sm">{log.insuranceName || log.insuranceId}</p>
                        </div>
                      )}
                      {log.serviceId && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Service</p>
                          <p className="text-sm">{log.serviceName || log.serviceId}</p>
                        </div>
                      )}
                      {log.productId && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Product</p>
                          <p className="text-sm">{log.productName || log.productId}</p>
                        </div>
                      )}
                      {log.maintenanceId && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Maintenance</p>
                          <div className="group relative">
                            <p className="text-sm text-blue-600 hover:underline cursor-pointer">
                              Maintenance Record
                              {log.maintenanceDetails && (
                                log.maintenanceDetails.serviceDetails?.length > 0 || 
                                log.maintenanceDetails.productDetails?.length > 0
                              ) && (
                                <span className="ml-1 text-xs">(hover for details)</span>
                              )}
                            </p>
                            
                            {/* Hover Popup with Services and Products Details */}
                            {log.maintenanceDetails && (
                              (log.maintenanceDetails.serviceDetails?.length > 0 || 
                               log.maintenanceDetails.productDetails?.length > 0) && (
                                <div className="absolute left-0 mt-2 z-50 invisible group-hover:visible bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-md shadow-lg p-4 min-w-[400px] max-w-[600px] max-h-[400px] overflow-y-auto">
                                  {log.maintenanceDetails.serviceDetails && log.maintenanceDetails.serviceDetails.length > 0 && (
                                    <div className="mb-4">
                                      <h4 className="text-sm font-semibold mb-2">Services Used</h4>
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="text-left py-1">Service</th>
                                            <th className="text-center py-1">Qty</th>
                                            <th className="text-right py-1">Cost</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {log.maintenanceDetails.serviceDetails.map((service, index) => (
                                            <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                                              <td className="py-1">{service.name}</td>
                                              <td className="text-center py-1">{service.quantity}</td>
                                              <td className="text-right py-1">${service.cost}</td>
                                            </tr>
                                          ))}
                                          <tr className="font-semibold">
                                            <td className="py-1">Total Services</td>
                                            <td className="text-center py-1">
                                              {log.maintenanceDetails.serviceDetails.reduce((sum, service) => sum + service.quantity, 0)}
                                            </td>
                                            <td className="text-right py-1">
                                              ${log.maintenanceDetails.serviceDetails.reduce((sum, service) => sum + service.cost, 0)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {log.maintenanceDetails.productDetails && log.maintenanceDetails.productDetails.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold mb-2">Products Used</h4>
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="text-left py-1">Product</th>
                                            <th className="text-center py-1">Qty</th>
                                            <th className="text-right py-1">Cost</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {log.maintenanceDetails.productDetails.map((product, index) => (
                                            <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                                              <td className="py-1">{product.name}</td>
                                              <td className="text-center py-1">{product.quantity}</td>
                                              <td className="text-right py-1">${product.cost}</td>
                                            </tr>
                                          ))}
                                          <tr className="font-semibold">
                                            <td className="py-1">Total Products</td>
                                            <td className="text-center py-1">
                                              {log.maintenanceDetails.productDetails.reduce((sum, product) => sum + product.quantity, 0)}
                                            </td>
                                            <td className="text-right py-1">
                                              ${log.maintenanceDetails.productDetails.reduce((sum, product) => sum + product.cost, 0)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Add detailed maintenance section with services and products */}
                  {log.maintenanceId && log.maintenanceDetails && (
                    (log.maintenanceDetails.serviceDetails?.length > 0 || 
                    log.maintenanceDetails.productDetails?.length > 0) && (
                      <div className="space-y-1 mt-4">
                        <p className="text-sm font-medium">Maintenance Details</p>
                        
                        {log.maintenanceDetails.serviceDetails && log.maintenanceDetails.serviceDetails.length > 0 && (
                          <div className="space-y-2 mt-2">
                            <p className="text-xs font-medium text-muted-foreground">Services Used</p>
                            <div className="bg-muted/30 rounded-md p-2">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b text-muted-foreground">
                                    <th className="text-left py-1 px-2">Service</th>
                                    <th className="text-center py-1 px-2">Quantity</th>
                                    <th className="text-right py-1 px-2">Cost</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {log.maintenanceDetails.serviceDetails.map((service, idx) => (
                                    <tr key={idx} className="border-b border-muted">
                                      <td className="py-1 px-2">{service.name}</td>
                                      <td className="text-center py-1 px-2">{service.quantity}</td>
                                      <td className="text-right py-1 px-2">${service.cost}</td>
                                    </tr>
                                  ))}
                                  <tr className="font-medium">
                                    <td className="py-1 px-2">Total Services</td>
                                    <td className="text-center py-1 px-2">
                                      {log.maintenanceDetails.serviceDetails.reduce((sum, service) => sum + service.quantity, 0)}
                                    </td>
                                    <td className="text-right py-1 px-2">
                                      ${log.maintenanceDetails.serviceDetails.reduce((sum, service) => sum + service.cost, 0).toFixed(2)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        {log.maintenanceDetails.productDetails && log.maintenanceDetails.productDetails.length > 0 && (
                          <div className="space-y-2 mt-4">
                            <p className="text-xs font-medium text-muted-foreground">Products Used</p>
                            <div className="bg-muted/30 rounded-md p-2">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b text-muted-foreground">
                                    <th className="text-left py-1 px-2">Product</th>
                                    <th className="text-center py-1 px-2">Quantity</th>
                                    <th className="text-center py-1 px-2">Source</th>
                                    <th className="text-right py-1 px-2">Cost</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {log.maintenanceDetails.productDetails.map((product, idx) => (
                                    <tr key={idx} className="border-b border-muted">
                                      <td className="py-1 px-2">{product.name}</td>
                                      <td className="text-center py-1 px-2">{product.quantity}</td>
                                      <td className="text-center py-1 px-2">{product.stockSource}</td>
                                      <td className="text-right py-1 px-2">${product.cost}</td>
                                    </tr>
                                  ))}
                                  <tr className="font-medium">
                                    <td className="py-1 px-2">Total Products</td>
                                    <td className="text-center py-1 px-2">
                                      {log.maintenanceDetails.productDetails.reduce((sum, product) => sum + product.quantity, 0)}
                                    </td>
                                    <td className="text-center py-1 px-2"></td>
                                    <td className="text-right py-1 px-2">
                                      ${log.maintenanceDetails.productDetails.reduce((sum, product) => sum + product.cost, 0).toFixed(2)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        {/* Total cost section */}
                        <div className="flex justify-end mt-2">
                          <div className="bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-md">
                            <p className="text-sm font-semibold flex justify-between">
                              <span>Total Value:</span>
                              <span className="ml-6">${(
                                (log.maintenanceDetails.serviceDetails?.reduce((sum, service) => sum + service.cost, 0) || 0) +
                                (log.maintenanceDetails.productDetails?.reduce((sum, product) => sum + product.cost, 0) || 0)
                              ).toFixed(2)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {log.paymentAmount && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Transaction Details</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Payment Amount</p>
                          <p className="text-sm">${log.paymentAmount}</p>
                        </div>
                        {log.discount && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Discount</p>
                            <p className="text-sm">${log.discount}</p>
                          </div>
                        )}
                        {log.additionalFees && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Additional Fees</p>
                            <p className="text-sm">${log.additionalFees}</p>
                          </div>
                        )}
                        {log.remainingBalance && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Remaining Balance</p>
                            <p className="text-sm">${log.remainingBalance}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Tabs defaultValue="after" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      {log.beforeValue && <TabsTrigger value="before">Before</TabsTrigger>}
                      <TabsTrigger value="after">After</TabsTrigger>
                    </TabsList>
                    {log.beforeValue && (
                      <TabsContent value="before">
                        <Card>
                          <CardHeader className="p-4">
                            <CardTitle className="text-sm">Before Value</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="text-xs overflow-auto max-h-64 bg-muted p-4 rounded-md">
                              {log.beforeValue
                                ? (() => {
                                    const parsed = tryParseJSON(log.beforeValue)
                                    return formatJSONForDisplay(parsed)
                                  })()
                                : "No data"}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    )}
                    <TabsContent value="after">
                      <Card>
                        <CardHeader className="p-4">
                          <CardTitle className="text-sm">After Value</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          {log.afterValue ? (
                            <div className="text-xs overflow-auto max-h-64 bg-muted p-4 rounded-md">
                              {log.afterValue
                                ? (() => {
                                    const parsed = tryParseJSON(log.afterValue)
                                    return formatJSONForDisplay(parsed)
                                  })()
                                : "No data"}
                            </div>
                          ) : (
                            <p className="text-sm italic">No after value recorded</p>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      },
    },
  ]

  // Calculate totals for the footer
  const totalLogs = logs.length
  const createLogs = logs.filter((log) => log.actionType === "create").length
  const updateLogs = logs.filter((log) => log.actionType === "update").length
  const deleteLogs = logs.filter((log) => log.actionType === "delete").length

  // Get unique table names for filtering
  const tableNames = Array.isArray(initialLogs) ? Array.from(new Set(initialLogs.map((log) => log.tableName))) : []

  const totalsRow = [
    <span key="total-count" className="font-medium">Total: {totalLogs}</span>,
    <span key="total-actions">C: {createLogs} U: {updateLogs} D: {deleteLogs}</span>,
    <span key="total-table"></span>,
    <span key="total-client"></span>,
    <span key="total-car"></span>,
    <span key="total-payment">${logs.reduce((sum, log) => sum + (log.paymentAmount || 0), 0).toFixed(2)}</span>,
    <span key="total-admin"></span>,
    <span key="total-maintenance">${logs.reduce((sum, log) => {
      if (log.tableName === "maintenance" && log.maintenanceId && log.maintenanceDetails) {
        const servicesCost = log.maintenanceDetails.serviceDetails?.reduce((total, service) => total + service.cost, 0) || 0;
        const productsCost = log.maintenanceDetails.productDetails?.reduce((total, product) => total + product.cost, 0) || 0;
        return sum + servicesCost + productsCost;
      }
      return sum;
    }, 0).toFixed(2)}</span>,
    <span key="total-time"></span>
  ]

  // If data is still loading, show a loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading data...</p>
        </div>
      </div>
    )
  }

  // Check if logs is valid
  if (!Array.isArray(logs)) {
    console.error("Logs is not an array:", logs)
    return (
      <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
        Error: Invalid logs data format
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-2">
          <div className="flex flex-col md:flex-row items-center gap-2">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-sm">Start Date:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-sm">End Date:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-sm">Table:</span>
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  {tableNames.map((tableName) => (
                    <SelectItem key={tableName} value={tableName}>
                      {tableName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Button
                onClick={() => {
                  handleDateRangeFilter()
                  if (filterTable !== "all") {
                    filterLogsByTable(filterTable)
                  }
                }}
                disabled={!startDate || isLoading}
              >
                {isLoading ? "Loading..." : "Filter"}
              </Button>
              <Button variant="outline" onClick={resetDateFilter} disabled={isLoading}>
                Reset
              </Button>
            </div>
          </div>
          
          {/* CSV Export button */}
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={() => {
              // Create comprehensive enriched data for CSV export
              const csvData = logs.map(log => {
                // Base log information with detailed formatting for better readability
                const baseData = {
                  "Timestamp": new Date(log.timestamp).toLocaleString(),
                  "Action Type": log.paymentAmount && log.actionType === "update" ? "Payment" : log.actionType,
                  "Table": log.tableName.charAt(0).toUpperCase() + log.tableName.slice(1),
                  "Admin": log.adminName || "-",
                  
                  // Client information (name only, no IDs)
                  "Client Name": log.clientName || "-",
                  
                  // Car information (details only, no IDs)
                  "Car Details": log.carDetails || "-",
                  
                  // Financial information
                  "Payment Amount": log.paymentAmount ? formatCurrency(log.paymentAmount) : "-",
                  "Additional Fees": log.additionalFees ? formatCurrency(log.additionalFees) : "-",
                  "Discount": log.discount ? formatCurrency(log.discount) : "-",
                  "Remaining Balance": log.remainingBalance ? formatCurrency(log.remainingBalance) : "-",
                  
                  // Date information for maintenance records
                  "Start Date": log.startDate ? new Date(log.startDate).toLocaleDateString() : "-",
                  "End Date": log.endDate ? new Date(log.endDate).toLocaleDateString() : "-",
                };
                
                // Add detailed information about other entities (names only, no IDs)
                if (log.insuranceName) {
                  baseData["Insurance Name"] = log.insuranceName || "-";
                }
                
                if (log.serviceName) {
                  baseData["Service Name"] = log.serviceName || "-";
                }
                
                if (log.productName) {
                  baseData["Product Name"] = log.productName || "-";
                }
                
                // For maintenance records, include full itemized details (without IDs)
                if (log.tableName === "maintenance" && log.maintenanceDetails) {
                  
                  // Calculate and include maintenance costs
                  if (log.maintenanceDetails) {
                    // Service details
                    const servicesCost = log.maintenanceDetails.serviceDetails?.reduce((total, service) => total + service.cost, 0) || 0;
                    baseData["Total Services Cost"] = formatCurrency(servicesCost);
                    
                    // Product details
                    const productsCost = log.maintenanceDetails.productDetails?.reduce((total, product) => total + product.cost, 0) || 0;
                    baseData["Total Products Cost"] = formatCurrency(productsCost);
                    
                    // Total maintenance cost
                    baseData["Total Maintenance Cost"] = formatCurrency(servicesCost + productsCost);
                    
                    // Detailed itemization
                    // Services details (each service on its own line for better readability)
                    if (log.maintenanceDetails.serviceDetails && log.maintenanceDetails.serviceDetails.length > 0) {
                      log.maintenanceDetails.serviceDetails.forEach((service, index) => {
                        baseData[`Service ${index+1} Name`] = service.name;
                        baseData[`Service ${index+1} Quantity`] = service.quantity.toString();
                        baseData[`Service ${index+1} Unit Cost`] = formatCurrency(service.cost / service.quantity);
                        baseData[`Service ${index+1} Total Cost`] = formatCurrency(service.cost);
                      });
                      baseData["Services Count"] = log.maintenanceDetails.serviceDetails.length.toString();
                    } else {
                      baseData["Services Count"] = "0";
                    }
                    
                    // Products details (each product on its own line for better readability)
                    if (log.maintenanceDetails.productDetails && log.maintenanceDetails.productDetails.length > 0) {
                      log.maintenanceDetails.productDetails.forEach((product, index) => {
                        baseData[`Product ${index+1} Name`] = product.name;
                        baseData[`Product ${index+1} Quantity`] = product.quantity.toString();
                        baseData[`Product ${index+1} Unit Price`] = formatCurrency(product.unitPrice);
                        baseData[`Product ${index+1} Total Cost`] = formatCurrency(product.cost);
                        baseData[`Product ${index+1} Stock Source`] = product.stockSource;
                      });
                      baseData["Products Count"] = log.maintenanceDetails.productDetails.length.toString();
                    } else {
                      baseData["Products Count"] = "0";
                    }
                  }
                }
                
                // Before/after values are excluded as requested
                
                return baseData;
              });
              
              // Make sure we have data to export
              if (csvData.length === 0) {
                toast({
                  title: "No data to export",
                  description: "There are no logs available to export.",
                  variant: "destructive"
                });
                return;
              }
              
              // Find all unique column headers across all rows
              const allHeaders = new Set<string>();
              csvData.forEach(row => {
                Object.keys(row).forEach(key => {
                  allHeaders.add(key);
                });
              });
              
              // Convert to ordered array of headers
              // Start with essential columns that should appear first (no IDs as requested)
              const essentialHeaders = [
                "Timestamp", "Action Type", "Table", "Admin",
                "Client Name", "Car Details", 
                "Total Maintenance Cost", "Payment Amount", 
                "Services Count", "Products Count"
              ];
              
              // Filter out essential headers that don't exist in our data
              const orderedHeaders = essentialHeaders.filter(h => allHeaders.has(h));
              
              // Add remaining headers
              Array.from(allHeaders)
                .filter(h => !essentialHeaders.includes(h))
                .forEach(h => orderedHeaders.push(h));
              
              // Generate CSV content with properly escaped values
              const csvContent = [
                orderedHeaders.join(","),
                ...csvData.map(row => 
                  orderedHeaders.map(header => {
                    // Use empty string for missing values
                    const cellValue = (header in row) ? (row[header]?.toString() || "") : "";
                    // Escape commas, quotes and wrap in quotes for proper CSV format
                    return `"${cellValue.replace(/"/g, '""')}"`;
                  }).join(",")
                )
              ].join("\n");
              
              // Create and trigger download
              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", `maintenance_logs_export_${new Date().toISOString().slice(0, 10)}.csv`);
              link.style.visibility = "hidden";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              toast({
                title: "Export successful",
                description: `Exported ${csvData.length} logs to CSV`,
                variant: "default"
              });
            }}
            disabled={logs.length === 0 || isLoading}
          >
            Export to CSV
          </Button>
        </div>
      </div>

      <AdvancedDataTable 
        columns={columns} 
        data={logs} 
        showTotals={true} 
        totalsRow={totalsRow} 
        isLoading={isLoading}
        fixedFirstColumn={true}
        fixedLastColumn={true}
        stickyFooter={true}
      />
    </div>
  )
}


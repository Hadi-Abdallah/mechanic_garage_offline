"use client"

import { useState, useEffect } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Edit, Trash2, Plus, FileText, CreditCard, Download, CalendarIcon } from "lucide-react"
import type { MaintenanceRequest } from "@/lib/db"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MaintenanceForm } from "@/components/maintenance/maintenance-form"
import { PaymentForm } from "@/components/maintenance/payment-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Import the new scrollable dialog components
import {
  Dialog,
  DialogTrigger,
  ScrollableDialogContent as DialogContent,
  ScrollableDialogHeader as DialogHeader,
  ScrollableDialogTitle as DialogTitle,
  ScrollableDialogBody,
} from "@/components/ui/scrollable-dialog"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { deleteMaintenanceRequest, makePayment, getClients, getCars, getServices, getProducts } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { api } from "@/lib/api-client"
import { useOnlineStatus } from "@/lib/network-status"

// Extended type to include client and car details
type EnrichedMaintenanceRequest = MaintenanceRequest & {
  clientName?: string
  carDetails?: string
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

interface MaintenanceTableProps {
  maintenanceRequests: MaintenanceRequest[]
}

export function MaintenanceTable({ maintenanceRequests }: MaintenanceTableProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null)
  const [payingRequest, setPayingRequest] = useState<MaintenanceRequest | null>(null)
  const [viewingRequest, setViewingRequest] = useState<MaintenanceRequest | null>(null)
  const [filteredRequests, setFilteredRequests] = useState<MaintenanceRequest[]>(maintenanceRequests)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<{ start?: Date; end?: Date }>({})
  const [clients, setClients] = useState<any[]>([])
  const [cars, setCars] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [enrichedRequests, setEnrichedRequests] = useState<EnrichedMaintenanceRequest[]>([])
  const [dataInitialized, setDataInitialized] = useState(false)

  // Fetch reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      setIsLoading(true)
      setLoadingError(null)
      try {
        console.log("Fetching reference data for maintenance table...")
        const [clientsResponse, carsResponse, servicesResponse, productsResponse] = await Promise.all([
          getClients(),
          getCars(),
          getServices(),
          getProducts(),
        ])

        if (clientsResponse.success && clientsResponse.data) {
          setClients(clientsResponse.data)
        } else {
          console.error("Failed to fetch clients:", clientsResponse.error)
        }

        if (carsResponse.success && carsResponse.data) {
          setCars(carsResponse.data)
        } else {
          console.error("Failed to fetch cars:", carsResponse.error)
        }

        if (servicesResponse.success && servicesResponse.data) {
          setServices(servicesResponse.data)
        } else {
          console.error("Failed to fetch services:", servicesResponse.error)
        }

        if (productsResponse.success && productsResponse.data) {
          setProducts(productsResponse.data)
        } else {
          console.error("Failed to fetch products:", productsResponse.error)
        }

        setDataInitialized(true)
      } catch (error) {
        console.error("Error fetching reference data:", error)
        setLoadingError("Failed to load reference data. Please try refreshing the page.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchReferenceData()
  }, [])

  // Enrich maintenance requests with names instead of IDs
  useEffect(() => {
    if (!dataInitialized) return

    try {
      console.log("Enriching maintenance requests with reference data...")
      console.log(
        `Working with: ${maintenanceRequests.length} requests, ${clients.length} clients, ${cars.length} cars, ${services.length} services, ${products.length} products`,
      )

      if (!Array.isArray(maintenanceRequests)) {
        console.error("maintenanceRequests is not an array:", maintenanceRequests)
        setLoadingError("Invalid maintenance data format")
        setEnrichedRequests([])
        return
      }

      const enriched = maintenanceRequests.map((request) => {
        try {
          // Find client name
          const client = clients.find((c) => c.id === request.clientId)
          const clientName = client ? client.name : `Client #${request.clientId}`

          // Find car details
          const car = cars.find((c) => c.uin === request.carUin)
          const carDetails = car ? `${car.make} ${car.model} (${car.licensePlate})` : request.carUin

          // Ensure servicesUsed is an array
          const servicesUsed = Array.isArray(request.servicesUsed) ? request.servicesUsed : []

          // Get service details
          const serviceDetails = servicesUsed.map((serviceUsed) => {
            const service = services.find((s) => s.id === serviceUsed.serviceId)
            return {
              ...serviceUsed,
              name: service ? service.name : `Service #${serviceUsed.serviceId}`,
              cost: service ? service.standardFee * serviceUsed.quantity : 0,
            }
          })

          // Ensure productsUsed is an array
          const productsUsed = Array.isArray(request.productsUsed) ? request.productsUsed : []

          // Get product details
          const productDetails = productsUsed.map((productUsed) => {
            const product = products.find((p) => p.id === productUsed.productId)
            return {
              ...productUsed,
              name: product ? product.name : `Product #${productUsed.productId}`,
              unitPrice: product ? product.salePrice : 0,
              cost: product ? product.salePrice * productUsed.quantity : 0,
            }
          })

          return {
            ...request,
            clientName,
            carDetails,
            serviceDetails,
            productDetails,
          }
        } catch (error) {
          console.error("Error enriching maintenance request:", error, request)
          // Return the original request with minimal enrichment to avoid breaking the UI
          return {
            ...request,
            clientName: "Error loading client",
            carDetails: "Error loading car details",
            serviceDetails: [],
            productDetails: [],
          }
        }
      })

      setEnrichedRequests(enriched)
      console.log(`Successfully enriched ${enriched.length} maintenance requests`)
    } catch (error) {
      console.error("Error in enrichment process:", error)
      setLoadingError("Failed to process maintenance data")
      setEnrichedRequests([])
    }
  }, [maintenanceRequests, clients, cars, services, products, dataInitialized])

  // Set up filtered data
  useEffect(() => {
    try {
      let result = [...enrichedRequests]

      // Apply search filter
      if (searchTerm) {
        result = result.filter(
          (req) =>
            req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.carDetails && req.carDetails.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (req.clientName && req.clientName.toLowerCase().includes(searchTerm.toLowerCase())),
        )
      }

      // Apply status filter
      if (statusFilter) {
        result = result.filter((req) => req.status === statusFilter)
      }

      // Apply date filter
      if (dateFilter.start) {
        const startDate = new Date(dateFilter.start)
        startDate.setHours(0, 0, 0, 0)

        result = result.filter((req) => {
          const reqDate = new Date(req.startDate)
          return reqDate >= startDate
        })
      }

      if (dateFilter.end) {
        const endDate = new Date(dateFilter.end)
        endDate.setHours(23, 59, 59, 999)

        result = result.filter((req) => {
          const reqDate = new Date(req.startDate)
          return reqDate <= endDate
        })
      }

      setFilteredRequests(result)
    } catch (error) {
      console.error("Error filtering maintenance requests:", error)
      // Keep the current filtered state to avoid breaking the UI
    }
  }, [enrichedRequests, searchTerm, statusFilter, dateFilter])

  const handleEdit = (request: MaintenanceRequest) => {
    setEditingRequest(request)
  }

  const handleView = (request: MaintenanceRequest) => {
    setViewingRequest(request)
  }

  const handleDelete = async (request: MaintenanceRequest) => {
    setIsLoading(true)
    try {
      // Use the offline-aware API client instead of directly calling deleteMaintenanceRequest
      const response = await api.delete(`/api/maintenance/${request.id}`);
      
      if (!response.error) {
        const successMessage = response.offline 
          ? `Request #${request.id} will be deleted when you're back online.`
          : `Request #${request.id} has been deleted successfully.`;
        
        toast({
          title: response.offline ? "Queued for deletion" : "Maintenance request deleted",
          description: successMessage,
        })
      } else {
        toast({
          title: "Error",
          description: response.error.message || "Failed to delete maintenance request",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePay = (request: MaintenanceRequest) => {
    setPayingRequest(request)
  }

  const handlePaymentSubmit = async (id: string, amount: number) => {
    setIsLoading(true)
    try {
      // Use the offline-aware API client instead of directly calling makePayment
      const response = await api.post(`/api/maintenance/${id}/payment`, { amount });
      
      if (!response.error) {
        const successMessage = response.offline 
          ? `Payment of $${amount} has been saved and will be processed when online.`
          : `Payment of $${amount} has been processed.`;
        
        toast({
          title: response.offline ? "Payment saved offline" : "Payment successful",
          description: successMessage,
        })
        setPayingRequest(null)
      } else {
        toast({
          title: "Error",
          description: response.error.message || "Failed to process payment",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = (request: EnrichedMaintenanceRequest) => {
    // Generate a printable invoice
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice #${request.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { margin-bottom: 20px; }
              .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
              .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .info { margin-bottom: 20px; }
              .info-line { margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f8f8f8; }
              .total-line { font-weight: bold; }
              .footer { margin-top: 30px; font-size: 12px; text-align: center; color: #777; }
            </style>
          </head>
          <body>
            <div class="invoice-box">
              <div class="header">
                <div class="title">INVOICE</div>
                <div class="info">
                  <div class="info-line"><strong>Invoice #:</strong> ${request.id}</div>
                  <div class="info-line"><strong>Date:</strong> ${new Date(request.startDate).toLocaleDateString()}</div>
                  <div class="info-line"><strong>Status:</strong> ${request.status}</div>
                  <div class="info-line"><strong>Payment Status:</strong> ${request.paymentStatus}</div>
                </div>
              </div>
              
              <div class="client-info">
                <div class="title">Client Information</div>
                <div class="info-line"><strong>Client:</strong> ${request.clientName || "Unknown Client"}</div>
                <div class="info-line"><strong>Car:</strong> ${request.carDetails || request.carUin}</div>
              </div>
              
              <div class="services">
                <div class="title">Services</div>
                <table>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      request.serviceDetails
                        ? request.serviceDetails
                            .map(
                              (service) => `
                      <tr>
                        <td>${service.name}</td>
                        <td>${service.quantity}</td>
                        <td>$${(service.cost / service.quantity).toFixed(2)}</td>
                        <td>$${service.cost.toFixed(2)}</td>
                      </tr>
                    `,
                            )
                            .join("")
                        : request.servicesUsed
                            .map((service) => {
                              const serviceInfo = services.find((s) => s.id === service.serviceId)
                              return `
                          <tr>
                            <td>${serviceInfo ? serviceInfo.name : service.serviceId}</td>
                            <td>${service.quantity}</td>
                            <td>$${serviceInfo ? serviceInfo.standardFee.toFixed(2) : "0.00"}</td>
                            <td>$${serviceInfo ? (serviceInfo.standardFee * service.quantity).toFixed(2) : "0.00"}</td>
                          </tr>
                        `
                            })
                            .join("")
                    }
                  </tbody>
                </table>
              </div>
              
              <div class="products">
                <div class="title">Products</div>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Source</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      request.productDetails
                        ? request.productDetails
                            .map(
                              (product) => `
                      <tr>
                        <td>${product.name}</td>
                        <td>${product.quantity}</td>
                        <td>$${product.unitPrice.toFixed(2)}</td>
                        <td>${product.stockSource}</td>
                        <td>$${product.cost.toFixed(2)}</td>
                      </tr>
                    `,
                            )
                            .join("")
                        : request.productsUsed
                            .map((product) => {
                              const productInfo = products.find((p) => p.id === product.productId)
                              return `
                          <tr>
                            <td>${productInfo ? productInfo.name : product.productId}</td>
                            <td>${product.quantity}</td>
                            <td>$${productInfo ? productInfo.salePrice.toFixed(2) : "0.00"}</td>
                            <td>${product.stockSource}</td>
                            <td>$${productInfo ? (productInfo.salePrice * product.quantity).toFixed(2) : "0.00"}</td>
                          </tr>
                        `
                            })
                            .join("")
                    }
                  </tbody>
                </table>
              </div>
              
              <div class="summary">
                <div class="title">Summary</div>
                <table>
                  <tr>
                    <td>Total Cost:</td>
                    <td>$${typeof request.totalCost === 'number' ? request.totalCost.toFixed(2) : '0.00'}</td>
                  </tr>
                  ${
                    request.discount
                      ? `
                  <tr>
                    <td>Discount:</td>
                    <td>$${typeof request.discount === 'number' ? request.discount.toFixed(2) : '0.00'}</td>
                  </tr>
                  `
                      : ""
                  }
                  ${
                    request.additionalFee
                      ? `
                  <tr>
                    <td>Additional Fee:</td>
                    <td>$${typeof request.additionalFee === 'number' ? request.additionalFee.toFixed(2) : '0.00'}</td>
                  </tr>
                  `
                      : ""
                  }
                  <tr>
                    <td>Paid Amount:</td>
                    <td>$${typeof request.paidAmount === 'number' ? request.paidAmount.toFixed(2) : '0.00'}</td>
                  </tr>
                  <tr class="total-line">
                    <td>Remaining Balance:</td>
                    <td>$${typeof request.remainingBalance === 'number' ? request.remainingBalance.toFixed(2) : '0.00'}</td>
                  </tr>
                </table>
              </div>
              
              <div class="footer">
                <p>Thank you for your business!</p>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handleExportCSV = () => {
    // Create CSV content
    const headers = [
      "ID",
      "Car",
      "Client",
      "Status",
      "Start Date",
      "End Date",
      "Total Cost",
      "Paid Amount",
      "Remaining",
      "Payment Status",
    ]

    const rows = filteredRequests.map((req) => [
      req.id,
      req.carDetails || req.carUin,
      req.clientName || req.clientId,
      req.status,
      new Date(req.startDate).toLocaleDateString(),
      req.endDate ? new Date(req.endDate).toLocaleDateString() : "N/A",
      `$${typeof req.totalCost === 'number' ? req.totalCost.toFixed(2) : '0.00'}`,
      `$${typeof req.paidAmount === 'number' ? req.paidAmount.toFixed(2) : '0.00'}`,
      `$${typeof req.remainingBalance === 'number' ? req.remainingBalance.toFixed(2) : '0.00'}`,
      req.paymentStatus,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "maintenance-requests.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setStatusFilter(null)
    setDateFilter({})
  }

  const columns: ColumnDef<EnrichedMaintenanceRequest>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "carDetails",
      header: "Car",
      cell: ({ row }) => {
        const carUin = row.original.carUin
        const carDetails = row.original.carDetails || row.original.carUin
        return (
          <Link href={`/cars/${carUin}`} className="text-blue-600 hover:underline">
            {carDetails}
          </Link>
        )
      },
    },
    {
      accessorKey: "clientName",
      header: "Client",
      cell: ({ row }) => {
        const clientId = row.original.clientId
        const clientName = row.original.clientName || row.original.clientId
        return (
          <Link href={`/clients/${clientId}`} className="text-blue-600 hover:underline">
            {clientName}
          </Link>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge
            variant={
              status === "completed"
                ? "success"
                : status === "in-progress"
                  ? "default"
                  : status === "pending"
                    ? "secondary"
                    : "destructive"
            }
          >
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => {
        return new Date(row.getValue("startDate")).toLocaleDateString()
      },
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => {
        const endDate = row.getValue("endDate")
        return endDate ? new Date(endDate as string).toLocaleDateString() : "N/A"
      },
    },
    {
      accessorKey: "totalCost",
      header: () => <div className="text-right">Total Cost</div>,
      cell: ({ row }) => {
        return <div className="text-right">{formatCurrency(row.getValue("totalCost"))}</div>
      },
    },
    {
      accessorKey: "paidAmount",
      header: () => <div className="text-right">Paid Amount</div>,
      cell: ({ row }) => {
        return <div className="text-right">{formatCurrency(row.getValue("paidAmount"))}</div>
      },
    },
    {
      accessorKey: "remainingBalance",
      header: () => <div className="text-right">Remaining</div>,
      cell: ({ row }) => {
        return <div className="text-right">{formatCurrency(row.getValue("remainingBalance"))}</div>
      },
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment Status",
      cell: ({ row }) => {
        const status = row.getValue("paymentStatus") as string
        return (
          <Badge variant={status === "paid" ? "success" : status === "partial" ? "warning" : "outline"}>{status}</Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const request = row.original

        return (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleView(request)}>
              <FileText className="h-4 w-4" />
              <span className="sr-only">View</span>
            </Button>

            {request.remainingBalance > 0 && (
              <Dialog open={payingRequest?.id === request.id} onOpenChange={(open) => !open && setPayingRequest(null)}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => handlePay(request)}>
                    <CreditCard className="h-4 w-4" />
                    <span className="sr-only">Pay</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Make Payment</DialogTitle>
                  </DialogHeader>
                  {payingRequest && (
                    <PaymentForm
                      request={payingRequest}
                      onSubmit={(amount) => handlePaymentSubmit(payingRequest.id, amount)}
                      onCancel={() => setPayingRequest(null)}
                      isLoading={isLoading}
                    />
                  )}
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(request)}>
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Edit Maintenance Request</DialogTitle>
                </DialogHeader>
                <ScrollableDialogBody>
                  {editingRequest && (
                    <MaintenanceForm
                      request={editingRequest}
                      onSubmit={() => setEditingRequest(null)}
                      onCancel={() => setEditingRequest(null)}
                    />
                  )}
                </ScrollableDialogBody>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the maintenance request and all
                    associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(request)} disabled={isLoading}>
                    {isLoading ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )
      },
    },
  ]

  // Calculate totals for the footer
  const totalRequests = filteredRequests.length
  const totalDiscounts = filteredRequests.reduce((sum, req) => sum + (req.discount || 0), 0)
  const totalRevenue = filteredRequests.reduce((sum, req) => {
    // Ensure totalCost is a valid number
    const cost = typeof req.totalCost === 'number' ? req.totalCost : 0
    return sum + cost
  }, 0)
  const totalPaid = filteredRequests.reduce((sum, req) => {
    // Ensure paidAmount is a valid number
    const paid = typeof req.paidAmount === 'number' ? req.paidAmount : 0
    return sum + paid
  }, 0)
  const totalOutstanding = filteredRequests.reduce((sum, req) => {
    // Ensure remainingBalance is a valid number
    const remaining = typeof req.remainingBalance === 'number' ? req.remainingBalance : 0
    return sum + remaining
  }, 0)

  // Create a totals row that aligns with our column definitions
  const totalsRow = (
    <tr>
      {/* ID column - show total count */}
      <td className="p-2 font-medium sticky left-0 bg-background z-20">Total: {totalRequests}</td>
      {/* Car column */}
      <td className="p-2"></td>
      {/* Client column */}
      <td className="p-2"></td>
      {/* Status column */}
      <td className="p-2"></td>
      {/* Start Date column */}
      <td className="p-2"></td>
      {/* End Date column */}
      <td className="p-2"></td>
      {/* Total Cost column */}
      <td className="p-2 text-right font-medium">${totalRevenue.toFixed(2)}</td>
      {/* Paid Amount column */}
      <td className="p-2 text-right font-medium">${totalPaid.toFixed(2)}</td>
      {/* Remaining Balance column */}
      <td className="p-2 text-right font-medium">${totalOutstanding.toFixed(2)}</td>
      {/* Payment Status column */}
      <td className="p-2"></td>
      {/* Actions column */}
      <td className="p-2"></td>
    </tr>
  )

  // If there's a loading error, show it
  if (loadingError) {
    return (
      <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
        <h3 className="font-semibold mb-2">Error</h3>
        <p>{loadingError}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    )
  }

  // If data is still loading, show a loading state
  if (isLoading || !dataInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading maintenance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col space-y-4">
        {/* Advanced filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-full sm:w-1/3">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search by ID, Car, or Client"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-1/3">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge
                variant={!statusFilter ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatusFilter(null)}
              >
                All
              </Badge>
              <Badge
                variant={statusFilter === "pending" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatusFilter("pending")}
              >
                Pending
              </Badge>
              <Badge
                variant={statusFilter === "in-progress" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatusFilter("in-progress")}
              >
                In Progress
              </Badge>
              <Badge
                variant={statusFilter === "completed" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatusFilter("completed")}
              >
                Completed
              </Badge>
              <Badge
                variant={statusFilter === "cancelled" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatusFilter("cancelled")}
              >
                Cancelled
              </Badge>
            </div>
          </div>

          <div className="w-full sm:w-1/3">
            <Label>Date Range</Label>
            <div className="flex gap-2 mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter.start ? format(dateFilter.start, "MM/dd/yyyy") : "Start Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter.start}
                    onSelect={(date) => setDateFilter({ ...dateFilter, start: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter.end ? format(dateFilter.end, "MM/dd/yyyy") : "End Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter.end}
                    onSelect={(date) => setDateFilter({ ...dateFilter, end: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={!searchTerm && !statusFilter && !dateFilter.start && !dateFilter.end}
            >
              Reset Filters
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Maintenance Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Add New Maintenance Request</DialogTitle>
              </DialogHeader>
              <ScrollableDialogBody>
                <MaintenanceForm
                  onSubmit={() => setIsAddDialogOpen(false)}
                  onCancel={() => setIsAddDialogOpen(false)}
                />
              </ScrollableDialogBody>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              {filteredRequests.filter((r) => r.status === "completed").length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalDiscounts)} in discounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {(totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredRequests.filter((r) => r.remainingBalance > 0).length} requests with balance
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable columns={columns} data={filteredRequests} searchKey="id" showTotals={true} totalsRow={totalsRow} />

      {/* Detailed View Dialog */}
      {viewingRequest && (
        <Dialog open={!!viewingRequest} onOpenChange={(open) => !open && setViewingRequest(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Maintenance Request Details</DialogTitle>
            </DialogHeader>
            <ScrollableDialogBody>
              <div className="space-y-6">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Request #{viewingRequest.id}</h3>
                    <p className="text-sm text-muted-foreground">
                      Created on {new Date(viewingRequest.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      viewingRequest.status === "completed"
                        ? "success"
                        : viewingRequest.status === "in-progress"
                          ? "default"
                          : viewingRequest.status === "pending"
                            ? "secondary"
                            : "destructive"
                    }
                    className="text-sm"
                  >
                    {viewingRequest.status.charAt(0).toUpperCase() + viewingRequest.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Client Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Client</p>
                        <p>{viewingRequest.clientName || viewingRequest.clientId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Car</p>
                        <p>{viewingRequest.carDetails || viewingRequest.carUin}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Dates & Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Start Date</p>
                        <p>{new Date(viewingRequest.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">End Date</p>
                        <p>
                          {viewingRequest.endDate
                            ? new Date(viewingRequest.endDate).toLocaleDateString()
                            : "Not completed"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Duration</p>
                        <p>
                          {viewingRequest.endDate
                            ? `${Math.ceil((new Date(viewingRequest.endDate).getTime() - new Date(viewingRequest.startDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                            : "In progress"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="services">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    <TabsTrigger value="payment">Payment</TabsTrigger>
                  </TabsList>

                  <TabsContent value="services" className="space-y-4">
                    <h4 className="text-sm font-medium mt-2">Services Used</h4>
                    <div className="rounded-md border">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr className="divide-x divide-border">
                            <th className="px-4 py-3.5 text-left text-sm font-semibold">Service</th>
                            <th className="px-4 py-3.5 text-left text-sm font-semibold">Quantity</th>
                            <th className="px-4 py-3.5 text-left text-sm font-semibold">Unit Price</th>
                            <th className="px-4 py-3.5 text-left text-sm font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {viewingRequest.serviceDetails
                            ? viewingRequest.serviceDetails.map((service, index) => (
                                <tr key={index} className="divide-x divide-border">
                                  <td className="whitespace-nowrap px-4 py-2 text-sm">{service.name}</td>
                                  <td className="whitespace-nowrap px-4 py-2 text-sm">{service.quantity}</td>
                                  <td className="whitespace-nowrap px-4 py-2 text-sm">
                                    ${(service.cost / service.quantity).toFixed(2)}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-2 text-sm">${service.cost.toFixed(2)}</td>
                                </tr>
                              ))
                            : viewingRequest.servicesUsed.map((service, index) => {
                                const serviceInfo = services.find((s) => s.id === service.serviceId)
                                return (
                                  <tr key={index} className="divide-x divide-border">
                                    <td className="whitespace-nowrap px-4 py-2 text-sm">
                                      {serviceInfo ? serviceInfo.name : service.serviceId}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm">{service.quantity}</td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm">
                                      ${serviceInfo ? serviceInfo.standardFee.toFixed(2) : "0.00"}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm">
                                      ${serviceInfo ? (serviceInfo.standardFee * service.quantity).toFixed(2) : "0.00"}
                                    </td>
                                  </tr>
                                )
                              })}
                          {(viewingRequest.serviceDetails
                            ? viewingRequest.serviceDetails.length
                            : viewingRequest.servicesUsed.length) === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-2 text-sm text-center">
                                No services used
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="products" className="space-y-4">
                    <h4 className="text-sm font-medium mt-2">Products Used</h4>
                    <div className="rounded-md border">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr className="divide-x divide-border">
                            <th className="px-4 py-3.5 text-left text-sm font-semibold">Product</th>
                            <th className="px-4 py-3.5 text-left text-sm font-semibold">Quantity</th>
                            <th className="px-4 py-3.5 text-left text-sm font-semibold">Unit Price</th>
                            <th className="px-4 py-3.5 text-left text-sm font-semibold">Stock Source</th>
                            <th className="px-4 py-3.5 text-left text-sm font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {viewingRequest.productDetails
                            ? viewingRequest.productDetails.map((product, index) => (
                                <tr key={index} className="divide-x divide-border">
                                  <td className="whitespace-nowrap px-4 py-2 text-sm">{product.name}</td>
                                  <td className="whitespace-nowrap px-4 py-2 text-sm">{product.quantity}</td>
                                  <td className="whitespace-nowrap px-4 py-2 text-sm">
                                    ${product.unitPrice.toFixed(2)}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-2 text-sm capitalize">
                                    {product.stockSource}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-2 text-sm">${product.cost.toFixed(2)}</td>
                                </tr>
                              ))
                            : viewingRequest.productsUsed.map((product, index) => {
                                const productInfo = products.find((p) => p.id === product.productId)
                                return (
                                  <tr key={index} className="divide-x divide-border">
                                    <td className="whitespace-nowrap px-4 py-2 text-sm">
                                      {productInfo ? productInfo.name : product.productId}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm">{product.quantity}</td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm">
                                      ${productInfo ? productInfo.salePrice.toFixed(2) : "0.00"}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm capitalize">
                                      {product.stockSource}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2 text-sm">
                                      ${productInfo ? (productInfo.salePrice * product.quantity).toFixed(2) : "0.00"}
                                    </td>
                                  </tr>
                                )
                              })}
                          {(viewingRequest.productDetails
                            ? viewingRequest.productDetails.length
                            : viewingRequest.productsUsed.length) === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-2 text-sm text-center">
                                No products used
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="payment" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Payment Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span>Total Cost:</span>
                            <span className="font-medium">${typeof viewingRequest.totalCost === 'number' ? viewingRequest.totalCost.toFixed(2) : '0.00'}</span>
                          </div>
                          {viewingRequest.discount > 0 && (
                            <div className="flex justify-between items-center">
                              <span>Discount:</span>
                              <span className="font-medium">-${typeof viewingRequest.discount === 'number' ? viewingRequest.discount.toFixed(2) : '0.00'}</span>
                            </div>
                          )}
                          {viewingRequest.additionalFee > 0 && (
                            <div className="flex justify-between items-center">
                              <span>Additional Fee:</span>
                              <span className="font-medium">${typeof viewingRequest.additionalFee === 'number' ? viewingRequest.additionalFee.toFixed(2) : '0.00'}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span>Paid Amount:</span>
                            <span className="font-medium">${typeof viewingRequest.paidAmount === 'number' ? viewingRequest.paidAmount.toFixed(2) : '0.00'}</span>
                          </div>
                          <div className="flex justify-between items-center font-bold">
                            <span>Remaining Balance:</span>
                            <span>${typeof viewingRequest.remainingBalance === 'number' ? viewingRequest.remainingBalance.toFixed(2) : '0.00'}</span>
                          </div>
                          <div className="pt-2">
                            <Badge
                              variant={
                                viewingRequest.paymentStatus === "paid"
                                  ? "success"
                                  : viewingRequest.paymentStatus === "partial"
                                    ? "warning"
                                    : "outline"
                              }
                            >
                              {viewingRequest.paymentStatus.charAt(0).toUpperCase() +
                                viewingRequest.paymentStatus.slice(1)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {viewingRequest.discount > 0 && viewingRequest.discountJustification && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Discount Justification</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{viewingRequest.discountJustification}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {viewingRequest.remainingBalance > 0 && (
                      <div className="mt-4">
                        <Button
                          onClick={() => {
                            setViewingRequest(null)
                            setPayingRequest(viewingRequest)
                          }}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Make Payment
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => handlePrint(viewingRequest)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Invoice
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewingRequest(null)
                      handleEdit(viewingRequest)
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="default" onClick={() => setViewingRequest(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </ScrollableDialogBody>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}


"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollableDialogBody } from "@/components/ui/scrollable-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Eye, FileText } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { DataExport } from "@/components/reports/data-export"
import { cn } from "@/lib/utils"

export interface ConsolidatedTableProps {
  data: any[]
  dateInfo?: {
    isDateRange: boolean
    singleDate: Date
    dateRange: { start: Date; end: Date }
  }
}

export function ConsolidatedTable({ data, dateInfo }: ConsolidatedTableProps) {
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [expandedCars, setExpandedCars] = useState<Set<string>>(new Set())

  // Toggle expand/collapse for a car
  const toggleExpand = (uin: string) => {
    const newExpanded = new Set(expandedCars)
    if (newExpanded.has(uin)) {
      newExpanded.delete(uin)
    } else {
      newExpanded.add(uin)
    }
    setExpandedCars(newExpanded)
  }

  const getStatusVariant = (status: string) => {
    if (!status) return "outline"
    
    switch (status.toLowerCase()) {
      case "completed":
      case "paid":
        return "success"
      case "in-progress":
      case "in progress":
        return "default"
      case "pending":
      case "partial":
        return "secondary"
      case "cancelled":
      case "canceled":
        return "destructive"
      case "registered":
        return "outline"
      default:
        return "outline"
    }
  }

  const handleViewMaintenance = (maintenance: any) => {
    setSelectedItem({
      ...maintenance,
      type: "maintenance"
    })
  }
  
  const handleViewCar = (car: any) => {
    setSelectedItem({
      ...car,
      type: "car"
    })
  }

  // Calculate totals
  const totalCars = data.length
  const totalMaintenance = data.reduce((sum, car) => sum + car.maintenance.length, 0)
  const totalCost = data.reduce((sum, car) => {
    const carTotal = car.totalCost || 0
    return sum + (isNaN(carTotal) ? 0 : carTotal)
  }, 0)
  
  // Count cars by status (new vs existing)
  const newCars = data.filter(car => car.isNewCar).length
  const existingCars = totalCars - newCars

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Vehicle Activity Report</h3>
          {dateInfo && dateInfo.isDateRange && (
            <div className="text-sm text-muted-foreground mb-1">
              <span className="font-medium">Date Range:</span> {formatDate(dateInfo.dateRange.start)} - {formatDate(dateInfo.dateRange.end)}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {totalCars} {totalCars === 1 ? 'vehicle' : 'vehicles'} with {totalMaintenance} {totalMaintenance === 1 ? 'maintenance request' : 'maintenance requests'}
          </p>
        </div>
        <DataExport data={data} filename="consolidated-report" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-1">Total Vehicles</p>
              <p className="text-2xl font-semibold">{totalCars}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-1">New Registrations</p>
              <p className="text-2xl font-semibold">{newCars}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-1">Maintenance Count</p>
              <p className="text-2xl font-semibold">{totalMaintenance}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-2xl font-semibold">{formatCurrency(totalCost)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {data.map((car) => (
          <Card key={car.uin} className={cn(
            "overflow-hidden transition-all",
            car.isNewCar ? "border-l-4 border-l-green-500" : "",
            car.totalCost > 0 ? "border-l-4 border-l-blue-400" : ""
          )}>
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-8 w-8 rounded-full"
                    onClick={() => toggleExpand(car.uin)}
                  >
                    {expandedCars.has(car.uin) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Link href={`/cars/${car.uin}`} className="text-blue-600 hover:underline">
                        {car.displayName}
                      </Link>
                      {car.isNewCar && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          New Registration
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Owner: {" "}
                      <Link href={`/clients/${car.clientId}`} className="text-blue-600 hover:underline">
                        {car.clientName}
                      </Link>
                      {car.isNewCar && ` · Registered on ${formatDate(car.createdAt)}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {car.totalCost > 0 && (
                    <div className="text-right mr-2">
                      <p className="font-medium">{formatCurrency(car.totalCost)}</p>
                      <p className="text-xs text-muted-foreground">
                        {car.maintenance.length} {car.maintenance.length === 1 ? 'service' : 'services'}
                      </p>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleViewCar(car)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            {expandedCars.has(car.uin) && car.maintenance.length > 0 && (
              <CardContent className="pt-0">
                <div className="mt-4 pl-10 space-y-2">
                  {car.maintenance.map((maintenance: any) => (
                    <div key={maintenance.id} className="border rounded-md p-3 bg-muted/20">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusVariant(maintenance.status)}>
                              {maintenance.status?.charAt(0).toUpperCase() + maintenance.status?.slice(1) || 'Unknown'}
                            </Badge>
                            <span className="font-medium">{maintenance.displayName}</span>
                          </div>
                          
                          <div className="text-sm mt-1 text-muted-foreground">
                            {maintenance.services.length > 0 && (
                              <span>{maintenance.services.length} services</span>
                            )}
                            {maintenance.services.length > 0 && maintenance.products.length > 0 && (
                              <span> · </span>
                            )}
                            {maintenance.products.length > 0 && (
                              <span>{maintenance.products.length} products</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(maintenance.totalCost || 0)}</p>
                            <p className="text-xs text-muted-foreground">
                              {maintenance.paymentStatus === "paid" ? "Paid" : 
                               maintenance.paymentStatus === "partial" ? "Partially Paid" : 
                               "Unpaid"}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewMaintenance(maintenance)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        
        {data.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-32">
              <p className="text-muted-foreground">
                {dateInfo && dateInfo.isDateRange
                  ? "No vehicles found for the selected date range."
                  : "No vehicles found for the selected date."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Details Dialog for Maintenance */}
      {selectedItem && selectedItem.type === "maintenance" && (
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Maintenance Details
              </DialogTitle>
            </DialogHeader>
            <ScrollableDialogBody>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Started on {formatDate(selectedItem.startDate)}
                      {selectedItem.endDate && ` · Completed on ${formatDate(selectedItem.endDate)}`}
                    </p>
                  </div>
                  <Badge variant={getStatusVariant(selectedItem.status)} className="text-sm">
                    {selectedItem.status?.charAt(0).toUpperCase() + selectedItem.status?.slice(1) || 'Unknown'}
                  </Badge>
                </div>

                <Tabs defaultValue="overview">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium">Total Cost</h4>
                        <p className="text-lg font-semibold">{formatCurrency(selectedItem.totalCost || 0)}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Payment Status</h4>
                        <Badge variant={
                          selectedItem.paymentStatus === "paid" ? "success" : 
                          selectedItem.paymentStatus === "partial" ? "warning" : 
                          "secondary"
                        }>
                          {selectedItem.paymentStatus?.charAt(0).toUpperCase() + selectedItem.paymentStatus?.slice(1) || 'Unknown'}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Paid Amount</h4>
                        <p>{formatCurrency(selectedItem.paidAmount || 0)}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">Remaining Balance</h4>
                        <p>{formatCurrency(selectedItem.remainingBalance || 0)}</p>
                      </div>
                      {selectedItem.additionalFee > 0 && (
                        <div>
                          <h4 className="text-sm font-medium">Additional Fees</h4>
                          <p>{formatCurrency(selectedItem.additionalFee)}</p>
                        </div>
                      )}
                      {selectedItem.discount > 0 && (
                        <div>
                          <h4 className="text-sm font-medium">Discount</h4>
                          <p>{formatCurrency(selectedItem.discount)}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="services" className="mt-4">
                    {selectedItem.services && selectedItem.services.length > 0 ? (
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
                            {selectedItem.services.map((service: any, index: number) => (
                              <tr key={index} className="divide-x divide-border">
                                <td className="whitespace-nowrap px-4 py-2 text-sm">{service.name}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">{service.quantity}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">
                                  {formatCurrency(service.unitPrice)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">
                                  {formatCurrency(service.cost)}
                                </td>
                              </tr>
                            ))}
                            <tr className="divide-x divide-border bg-muted/30">
                              <td colSpan={3} className="px-4 py-2 text-sm font-medium text-right">Total:</td>
                              <td className="px-4 py-2 text-sm font-medium">
                                {formatCurrency(selectedItem.services.reduce((sum: number, s: any) => 
                                  sum + (s.cost || 0), 0))}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No services used</p>
                    )}
                  </TabsContent>

                  <TabsContent value="products" className="mt-4">
                    {selectedItem.products && selectedItem.products.length > 0 ? (
                      <div className="rounded-md border">
                        <table className="min-w-full divide-y divide-border">
                          <thead>
                            <tr className="divide-x divide-border">
                              <th className="px-4 py-3.5 text-left text-sm font-semibold">Product</th>
                              <th className="px-4 py-3.5 text-left text-sm font-semibold">Quantity</th>
                              <th className="px-4 py-3.5 text-left text-sm font-semibold">Unit Price</th>
                              <th className="px-4 py-3.5 text-left text-sm font-semibold">Source</th>
                              <th className="px-4 py-3.5 text-left text-sm font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {selectedItem.products.map((product: any, index: number) => (
                              <tr key={index} className="divide-x divide-border">
                                <td className="whitespace-nowrap px-4 py-2 text-sm">{product.name}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">{product.quantity}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">
                                  {formatCurrency(product.unitPrice)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm capitalize">
                                  {product.stockSource || "N/A"}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">
                                  {formatCurrency(product.cost)}
                                </td>
                              </tr>
                            ))}
                            <tr className="divide-x divide-border bg-muted/30">
                              <td colSpan={4} className="px-4 py-2 text-sm font-medium text-right">Total:</td>
                              <td className="px-4 py-2 text-sm font-medium">
                                {formatCurrency(selectedItem.products.reduce((sum: number, p: any) => 
                                  sum + (p.cost || 0), 0))}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No products used</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollableDialogBody>
          </DialogContent>
        </Dialog>
      )}

      {/* Details Dialog for Car */}
      {selectedItem && selectedItem.type === "car" && (
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Vehicle Details
              </DialogTitle>
            </DialogHeader>
            <ScrollableDialogBody>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedItem.displayName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.isNewCar ? "Registered" : "Last serviced"} on {formatDate(selectedItem.createdAt || new Date())}
                    </p>
                  </div>
                  {selectedItem.isNewCar && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      New Registration
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium">Make</h4>
                    <p>{selectedItem.make || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Model</h4>
                    <p>{selectedItem.model || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">License Plate</h4>
                    <p>{selectedItem.licensePlate || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Year</h4>
                    <p>{selectedItem.year || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Owner</h4>
                    <Link href={`/clients/${selectedItem.clientId}`} className="text-blue-600 hover:underline">
                      {selectedItem.clientName}
                    </Link>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Total Service Cost</h4>
                    <p className="font-semibold">{formatCurrency(selectedItem.totalCost || 0)}</p>
                  </div>
                </div>

                {selectedItem.maintenance && selectedItem.maintenance.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Maintenance History</h4>
                    <div className="space-y-2">
                      {selectedItem.maintenance.map((maintenance: any) => (
                        <div key={maintenance.id} className="border rounded-md p-3 bg-muted/20">
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <Badge variant={getStatusVariant(maintenance.status)}>
                                  {maintenance.status?.charAt(0).toUpperCase() + maintenance.status?.slice(1) || 'Unknown'}
                                </Badge>
                                <span className="font-medium">{maintenance.displayName}</span>
                              </div>
                              
                              <div className="text-sm mt-1 text-muted-foreground">
                                {maintenance.services.length > 0 && (
                                  <span>{maintenance.services.length} services</span>
                                )}
                                {maintenance.services.length > 0 && maintenance.products.length > 0 && (
                                  <span> · </span>
                                )}
                                {maintenance.products.length > 0 && (
                                  <span>{maintenance.products.length} products</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(maintenance.totalCost || 0)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {maintenance.paymentStatus === "paid" ? "Paid" : 
                                  maintenance.paymentStatus === "partial" ? "Partially Paid" : 
                                  "Unpaid"}
                                </p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleViewMaintenance(maintenance)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button asChild>
                    <Link href={`/cars/${selectedItem.uin}`}>
                      View Complete Vehicle History
                    </Link>
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
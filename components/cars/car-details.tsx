"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CarForm } from "@/components/cars/car-form"
import { MaintenanceForm } from "@/components/maintenance/maintenance-form"
import {
  Dialog,
  DialogTrigger,
  ScrollableDialogContent as DialogContent,
  ScrollableDialogHeader as DialogHeader,
  ScrollableDialogTitle as DialogTitle,
  ScrollableDialogBody,
} from "@/components/ui/scrollable-dialog"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts"
import { ArrowLeft, Car, Plus } from "lucide-react"
import type { Car as CarType, Client, Insurance, MaintenanceRequest } from "@/lib/db"

interface EnrichedMaintenanceRequest extends MaintenanceRequest {
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

interface CarDetailsProps {
  car: CarType
  client: Client
  insurance: Insurance | null
  maintenanceHistory: EnrichedMaintenanceRequest[]
  stats: {
    maintenanceCount: number
    totalCost: number
    outstandingBalance: number
    lastService?: Date | null
  }
}

export function CarDetails({ car, client, insurance, maintenanceHistory, stats }: CarDetailsProps) {
  const router = useRouter()
  const [isEditCarDialogOpen, setIsEditCarDialogOpen] = useState(false)
  const [isAddMaintenanceDialogOpen, setIsAddMaintenanceDialogOpen] = useState(false)

  // Prepare chart data if we have maintenance history
  const maintenanceByMonth: Record<string, { total: number; count: number; month: string }> = {}

  maintenanceHistory.forEach((req) => {
    const date = new Date(req.startDate)
    const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`

    if (!maintenanceByMonth[monthYear]) {
      maintenanceByMonth[monthYear] = {
        total: 0,
        count: 0,
        month: monthYear,
      }
    }

    maintenanceByMonth[monthYear].total += req.totalCost
    maintenanceByMonth[monthYear].count += 1
  })

  const maintenanceChartData = Object.values(maintenanceByMonth).sort((a, b) => {
    const [aMonth, aYear] = a.month.split("/")
    const [bMonth, bYear] = b.month.split("/")

    if (aYear === bYear) {
      return Number.parseInt(aMonth) - Number.parseInt(bMonth)
    }

    return Number.parseInt(aYear) - Number.parseInt(bYear)
  })

  // Service and product analysis
  const serviceUsage: Record<string, { id: string; name: string; count: number }> = {}
  const productUsage: Record<string, { id: string; name: string; count: number }> = {}

  maintenanceHistory.forEach((req) => {
    // Add services
    req.serviceDetails?.forEach((service) => {
      if (!serviceUsage[service.serviceId]) {
        serviceUsage[service.serviceId] = {
          id: service.serviceId,
          name: service.name || service.serviceId,
          count: 0,
        }
      }
      serviceUsage[service.serviceId].count += service.quantity
    })

    // Add products
    req.productDetails?.forEach((product) => {
      if (!productUsage[product.productId]) {
        productUsage[product.productId] = {
          id: product.productId,
          name: product.name || product.productId,
          count: 0,
        }
      }
      productUsage[product.productId].count += product.quantity
    })
  })

  const serviceChartData = Object.values(serviceUsage)
  const productChartData = Object.values(productUsage)

  const handleViewMaintenance = (id: string) => {
    router.push(`/maintenance/${id}`)
  }

  const handleViewClient = () => {
    router.push(`/clients/${client.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Dialog open={isEditCarDialogOpen} onOpenChange={setIsEditCarDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Car className="mr-2 h-4 w-4" />
              Edit Car
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Car</DialogTitle>
            </DialogHeader>
            <ScrollableDialogBody>
              <CarForm
                car={car}
                onSubmit={() => setIsEditCarDialogOpen(false)}
                onCancel={() => setIsEditCarDialogOpen(false)}
              />
            </ScrollableDialogBody>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {car.make} {car.model}
                </CardTitle>
                <CardDescription>
                  {car.year} · {car.color} · {car.licensePlate}
                </CardDescription>
              </div>
              <Badge className="w-fit" variant="outline">
                VIN: {car.vin}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Owner Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <Button variant="link" className="p-0 h-auto" onClick={handleViewClient}>
                        {client.name}
                      </Button>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contact:</span>
                      <span>{client.contact}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{client.email}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Insurance Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {insurance ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Provider:</span>
                        <span>{insurance.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contact Person:</span>
                        <span>{insurance.contactPerson}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span>{insurance.phone}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <span className="text-muted-foreground">No insurance information available</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">Added on {new Date(car.createdAt).toLocaleDateString()}</div>
            <div className="text-sm text-muted-foreground">
              Last updated on {new Date(car.updatedAt).toLocaleDateString()}
            </div>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">Make & Model</p>
                <p>
                  {car.make} {car.model}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Year</p>
                <p>{car.year}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Color</p>
                <p>{car.color || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">VIN</p>
                <p>{car.vin || "Not provided"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Service Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">Total Services</p>
                <p className="text-xl font-bold">{stats.maintenanceCount}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Total Cost</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalCost)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Outstanding Balance</p>
                <p className="text-xl font-bold text-red-500">{formatCurrency(stats.outstandingBalance)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Last Service</p>
                <p>{stats.lastService ? new Date(stats.lastService).toLocaleDateString() : "Never"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Information</CardTitle>
            </CardHeader>
            <CardContent>
              {insurance ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Insurance Company</p>
                    <p>{insurance.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Policy Number</p>
                    <p>{insurance.policyNumber || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Coverage Type</p>
                    <p>{insurance.coverageType || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Expiry Date</p>
                    <p>{insurance.expiryDate ? new Date(insurance.expiryDate).toLocaleDateString() : "Not provided"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No insurance information available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="history">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history">Maintenance History</TabsTrigger>
            <TabsTrigger value="services">Services & Parts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAddMaintenanceDialogOpen} onOpenChange={setIsAddMaintenanceDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
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
                      initialCarUin={car.uin}
                      initialClientId={client.id}
                      onSubmit={() => setIsAddMaintenanceDialogOpen(false)}
                      onCancel={() => setIsAddMaintenanceDialogOpen(false)}
                    />
                  </ScrollableDialogBody>
                </DialogContent>
              </Dialog>
            </div>

            {maintenanceHistory.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="font-medium text-lg">No Maintenance History</h3>
                <p className="text-muted-foreground mt-2">This car doesn't have any service records yet.</p>
                <Button onClick={() => setIsAddMaintenanceDialogOpen(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Maintenance Request
                </Button>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">ID</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Services</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Products</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Total</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Paid</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {maintenanceHistory.map((request) => (
                      <tr key={request.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-4 py-2 text-sm">{request.id.slice(0, 8)}...</td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">
                          {new Date(request.startDate).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">
                          <Badge
                            variant={
                              request.status === "completed"
                                ? "success"
                                : request.status === "in-progress"
                                  ? "default"
                                  : request.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                            }
                          >
                            {request.status}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">{request.servicesUsed.length}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">{request.productsUsed.length}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">{formatCurrency(request.totalCost)}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">
                          <Badge
                            variant={
                              request.paymentStatus === "paid"
                                ? "success"
                                : request.paymentStatus === "partial"
                                  ? "warning"
                                  : "outline"
                            }
                          >
                            {request.paymentStatus}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">
                          <Button size="sm" variant="ghost" onClick={() => handleViewMaintenance(request.id)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Services Used</CardTitle>
                  <CardDescription>Services performed on this vehicle</CardDescription>
                </CardHeader>
                <CardContent>
                  {serviceChartData.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No service records found</p>
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={serviceChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" name="Times Used" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parts Used</CardTitle>
                  <CardDescription>Parts and products used on this vehicle</CardDescription>
                </CardHeader>
                <CardContent>
                  {productChartData.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No parts records found</p>
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={productChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" name="Quantity Used" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Maintenance Over Time</CardTitle>
                <CardDescription>Cost and frequency of maintenance</CardDescription>
              </CardHeader>
              <CardContent>
                {maintenanceChartData.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Not enough data for analysis</p>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={maintenanceChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="total"
                          name="Total Cost ($)"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                        />
                        <Line yAxisId="right" type="monotone" dataKey="count" name="Service Count" stroke="#82ca9d" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Maintenance Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["completed", "in-progress", "pending", "cancelled"].map((status) => {
                      const count = maintenanceHistory.filter((m) => m.status === status).length
                      const percentage = (count / Math.max(1, maintenanceHistory.length)) * 100

                      return count > 0 ? (
                        <div key={status} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="capitalize">{status}</span>
                            <span>
                              {count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      ) : null
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {["paid", "partial", "pending"].map((status) => {
                      const count = maintenanceHistory.filter((m) => m.paymentStatus === status).length
                      const percentage = (count / Math.max(1, maintenanceHistory.length)) * 100

                      return count > 0 ? (
                        <div key={status} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="capitalize">{status}</span>
                            <span>
                              {count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                status === "paid"
                                  ? "bg-green-500"
                                  : status === "partial"
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : null
                    })}

                    <div className="pt-4">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Payment Rate</span>
                        <span>
                          {typeof stats.totalCost === 'number' && stats.totalCost > 0
                            ? (((typeof stats.outstandingBalance === 'number' ? stats.totalCost - stats.outstandingBalance : stats.totalCost) / stats.totalCost) * 100).toFixed(1)
                            : '0'}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-4 mt-2">
                        <div
                          className="bg-green-500 h-4 rounded-full"
                          style={{
                            width: `${
                              typeof stats.totalCost === 'number' && stats.totalCost > 0
                                ? ((typeof stats.outstandingBalance === 'number' ? stats.totalCost - stats.outstandingBalance : stats.totalCost) / stats.totalCost) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


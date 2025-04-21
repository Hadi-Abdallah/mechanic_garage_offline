"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CarForm } from "@/components/cars/car-form"
import { ClientForm } from "@/components/clients/client-form"
import {
  Dialog,
  DialogTrigger,
  ScrollableDialogContent as DialogContent,
  ScrollableDialogHeader as DialogHeader,
  ScrollableDialogTitle as DialogTitle,
  ScrollableDialogBody,
} from "@/components/ui/scrollable-dialog"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { ArrowLeft, Plus, User } from "lucide-react"
import type { Client, Car as CarType, MaintenanceRequest } from "@/lib/db"

interface ClientDetailsProps {
  client: Client
  cars: (CarType & { maintenanceCount: number })[]
  maintenanceRequests: MaintenanceRequest[]
  stats: {
    carCount: number
    maintenanceCount: number
    totalSpent: number
    outstandingBalance: number
    lastVisit?: Date
  }
}

export function ClientDetails({ client, cars, maintenanceRequests, stats }: ClientDetailsProps) {
  const router = useRouter()
  const [isAddCarDialogOpen, setIsAddCarDialogOpen] = useState(false)
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false)

  // Prepare chart data
  const carMaintenanceData = cars.map((car) => ({
    name: `${car.make} ${car.model}`,
    value: car.maintenanceCount,
  }))

  const requests = Array.isArray(maintenanceRequests) ? maintenanceRequests : [];
  
  const paymentStatusData = [
    { name: "Paid", value: requests.filter((r) => r.paymentStatus === "paid").length },
    { name: "Partial", value: requests.filter((r) => r.paymentStatus === "partial").length },
    { name: "Pending", value: requests.filter((r) => r.paymentStatus === "pending").length },
  ].filter((item) => item.value > 0)

  const maintenanceStatusData = [
    { name: "Completed", value: requests.filter((r) => r.status === "completed").length },
    { name: "In Progress", value: requests.filter((r) => r.status === "in-progress").length },
    { name: "Pending", value: requests.filter((r) => r.status === "pending").length },
    { name: "Cancelled", value: requests.filter((r) => r.status === "cancelled").length },
  ].filter((item) => item.value > 0)

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

  const handleViewCar = (uin: string) => {
    router.push(`/cars/${uin}`)
  }

  const handleViewMaintenance = (id: string) => {
    router.push(`/maintenance/${id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Dialog open={isEditClientDialogOpen} onOpenChange={setIsEditClientDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <User className="mr-2 h-4 w-4" />
              Edit Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
            </DialogHeader>
            <ScrollableDialogBody>
              <ClientForm
                client={client}
                onSubmit={() => setIsEditClientDialogOpen(false)}
                onCancel={() => setIsEditClientDialogOpen(false)}
              />
            </ScrollableDialogBody>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{client.name}</CardTitle>
            <CardDescription>Client since {new Date(client.createdAt).toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Contact:</span>
                  <span>{client.contact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Email:</span>
                  <span>{client.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Address:</span>
                  <span>{client.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Last Updated:</span>
                  <span>{new Date(client.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p>{client.email || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p>{client.contact || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Address</p>
                <p>{client.address || "Not provided"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">Total Spent</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalSpent)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Outstanding Balance</p>
                <p className="text-xl font-bold text-red-500">{formatCurrency(stats.outstandingBalance)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Last Visit</p>
                <p>{stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString() : "Never"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Cars</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.carCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Maintenance Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.maintenanceCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.outstandingBalance)}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="cars">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cars">Cars</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="cars" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAddCarDialogOpen} onOpenChange={setIsAddCarDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Car
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Car</DialogTitle>
                  </DialogHeader>
                  <ScrollableDialogBody>
                    <CarForm
                      initialClientId={client.id}
                      onSubmit={() => setIsAddCarDialogOpen(false)}
                      onCancel={() => setIsAddCarDialogOpen(false)}
                    />
                  </ScrollableDialogBody>
                </DialogContent>
              </Dialog>
            </div>

            {cars.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="font-medium text-lg">No Cars Found</h3>
                <p className="text-muted-foreground mt-2">This client doesn't have any registered cars.</p>
                <Button onClick={() => setIsAddCarDialogOpen(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Car
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cars.map((car) => (
                  <Card
                    key={car.uin}
                    className="hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleViewCar(car.uin)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">
                          {car.make} {car.model}
                        </CardTitle>
                        <Badge variant="outline">{car.year}</Badge>
                      </div>
                      <CardDescription>{car.licensePlate}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Color:</span>
                          <span>{car.color}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">VIN:</span>
                          <span className="font-mono text-xs">{car.vin}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs text-muted-foreground">
                          Added: {new Date(car.createdAt).toLocaleDateString()}
                        </span>
                        <Badge>
                          {car.maintenanceCount} service{car.maintenanceCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            {(!requests || requests.length === 0) ? (
              <div className="text-center py-8">
                <h3 className="font-medium text-lg">No Maintenance History</h3>
                <p className="text-muted-foreground mt-2">This client doesn't have any maintenance records.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">ID</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Car</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Total</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Paid</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Remaining</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {requests.map((request) => {
                      const car = cars.find((c) => c.uin === request.carUin)
                      return (
                        <tr key={request.id} className="hover:bg-muted/50">
                          <td className="whitespace-nowrap px-4 py-2 text-sm">{request.id.slice(0, 8)}...</td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm">
                            {car ? `${car.make} ${car.model}` : request.carUin}
                          </td>
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
                          <td className="whitespace-nowrap px-4 py-2 text-sm">{formatCurrency(request.totalCost)}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm">{formatCurrency(request.paidAmount)}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm">
                            {formatCurrency(request.remainingBalance)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm">
                            <Button size="sm" variant="ghost" onClick={() => handleViewMaintenance(request.id)}>
                              View
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {cars.length > 0 && (
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Services Per Car</CardTitle>
                    <CardDescription>Maintenance distribution across vehicles</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={carMaintenanceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={90}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {carMaintenanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {paymentStatusData.length > 0 && (
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Payment Status</CardTitle>
                    <CardDescription>Distribution of payment status</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={90}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {paymentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {maintenanceStatusData.length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Maintenance Status</CardTitle>
                    <CardDescription>Status of maintenance requests</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={maintenanceStatusData}>
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.outstandingBalance)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Payment Rate</p>
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-muted">
                        <div
                          style={{
                            width: `${stats.totalSpent ? ((stats.totalSpent - stats.outstandingBalance) / stats.totalSpent) * 100 : 0}%`,
                          }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                        ></div>
                      </div>
                      <p className="text-xs text-right mt-1">
                        {stats.totalSpent
                          ? `${(((stats.totalSpent - stats.outstandingBalance) / stats.totalSpent) * 100).toFixed(1)}%`
                          : "0%"}{" "}
                        paid
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average Cost Per Maintenance</p>
                    <p className="text-xl">
                      {stats.maintenanceCount > 0
                        ? formatCurrency(stats.totalSpent / stats.maintenanceCount)
                        : formatCurrency(0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


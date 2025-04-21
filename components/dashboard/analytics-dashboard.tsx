"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSystemAnalytics } from "@/lib/actions"
import { useToast } from "@/components/ui/use-toast"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { RefreshCcw } from "lucide-react"

// Define the expected analytics data structure
interface AnalyticsData {
  period: "week" | "month" | "year"
  maintenance: {
    total: number
    totalRevenue: number
    paidRevenue: number
    outstandingRevenue: number
    statusDistribution: {
      pending: number
      inProgress: number
      completed: number
      cancelled: number
    }
  }
  inventory: {
    totalProducts: number
    lowStockProducts: number
    totalWarehouseStock: number
    totalShopStock: number
  }
  clients: {
    total: number
    cars: number
    carsPerClient: number | string
  }
}

interface AnalyticsDashboardProps {
  initialData: AnalyticsData
}

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData>(initialData)
  const [period, setPeriod] = useState<"week" | "month" | "year">(initialData.period || "month")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

  // Reload data when period changes
  const refreshData = async (newPeriod: "week" | "month" | "year" = period) => {
    setIsLoading(true)
    try {
      const { success, data: newData, error } = await getSystemAnalytics(newPeriod)

      if (success && newData) {
        setData(newData)
        setPeriod(newPeriod)
      } else {
        toast({
          title: "Error",
          description: error || "Failed to fetch analytics data",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Format status distribution data for pie chart
  const statusData = Object.entries(data.maintenance.statusDistribution)
    .map(([key, value]) => ({
      name: key === "inProgress" ? "In Progress" : key.charAt(0).toUpperCase() + key.slice(1),
      value,
    }))
    .filter((item) => item.value > 0)

  // Format payment data for pie chart
  const paymentData = [
    { name: "Paid", value: data.maintenance.paidRevenue },
    { name: "Outstanding", value: data.maintenance.outstandingRevenue },
  ].filter((item) => item.value > 0)

  // Format inventory data for bar chart
  const inventoryData = [
    { name: "Warehouse", value: data.inventory.totalWarehouseStock },
    { name: "Shop", value: data.inventory.totalShopStock },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(value: "week" | "month" | "year") => refreshData(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refreshData()} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.maintenance.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From {data.maintenance.total} maintenance requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof data.maintenance.totalRevenue === 'number' && data.maintenance.totalRevenue > 0
                ? ((typeof data.maintenance.paidRevenue === 'number' ? data.maintenance.paidRevenue : 0) / data.maintenance.totalRevenue * 100).toFixed(1)
                : '0'}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data.maintenance.outstandingRevenue)} outstanding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.clients.total}</div>
            <p className="text-xs text-muted-foreground">
              {data.clients.cars} cars ({data.clients.carsPerClient} per client)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.inventory.totalProducts}</div>
            <p className="text-xs text-muted-foreground">{data.inventory.lowStockProducts} items low on stock</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="maintenance">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Maintenance Status</CardTitle>
                <CardDescription>Distribution of maintenance request status</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {statusData.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No maintenance data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Maintenance Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Completion Rate</span>
                      <span>
                        {typeof data.maintenance.total === 'number' && data.maintenance.total > 0
                          ? ((typeof data.maintenance.statusDistribution.completed === 'number' ? data.maintenance.statusDistribution.completed : 0) / data.maintenance.total * 100).toFixed(1)
                          : '0'}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${
                            typeof data.maintenance.total === 'number' && data.maintenance.total > 0
                              ? ((typeof data.maintenance.statusDistribution.completed === 'number' ? data.maintenance.statusDistribution.completed : 0) / data.maintenance.total) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>In Progress</span>
                      <span>
                        {typeof data.maintenance.total === 'number' && data.maintenance.total > 0
                          ? ((typeof data.maintenance.statusDistribution.inProgress === 'number' ? data.maintenance.statusDistribution.inProgress : 0) / data.maintenance.total * 100).toFixed(1)
                          : '0'}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${
                            typeof data.maintenance.total === 'number' && data.maintenance.total > 0
                              ? ((typeof data.maintenance.statusDistribution.inProgress === 'number' ? data.maintenance.statusDistribution.inProgress : 0) / data.maintenance.total) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Cancellation Rate</span>
                      <span>
                        {typeof data.maintenance.total === 'number' && data.maintenance.total > 0
                          ? ((typeof data.maintenance.statusDistribution.cancelled === 'number' ? data.maintenance.statusDistribution.cancelled : 0) / data.maintenance.total * 100).toFixed(1)
                          : '0'}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{
                          width: `${
                            typeof data.maintenance.total === 'number' && data.maintenance.total > 0
                              ? ((typeof data.maintenance.statusDistribution.cancelled === 'number' ? data.maintenance.statusDistribution.cancelled : 0) / data.maintenance.total) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Average Revenue</span>
                      <span>
                        {typeof data.maintenance.total === 'number' && data.maintenance.total > 0 && typeof data.maintenance.totalRevenue === 'number'
                          ? formatCurrency(data.maintenance.totalRevenue / data.maintenance.total)
                          : formatCurrency(0)}
                        <span className="text-xs text-muted-foreground ml-1">per request</span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Status</CardTitle>
                <CardDescription>Revenue collection status</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {paymentData.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No revenue data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        <Cell fill="#4ade80" />
                        <Cell fill="#f87171" />
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Metrics</CardTitle>
                <CardDescription>Revenue and payment analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-xl font-medium">{formatCurrency(data.maintenance.totalRevenue)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Collected</p>
                      <p className="text-xl font-medium">{formatCurrency(data.maintenance.paidRevenue)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Collection Rate</span>
                      <span>
                        {typeof data.maintenance.totalRevenue === 'number' && data.maintenance.totalRevenue > 0
                          ? ((typeof data.maintenance.paidRevenue === 'number' ? data.maintenance.paidRevenue : 0) / data.maintenance.totalRevenue * 100).toFixed(1)
                          : '0'}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${
                            typeof data.maintenance.totalRevenue === 'number' && data.maintenance.totalRevenue > 0
                              ? ((typeof data.maintenance.paidRevenue === 'number' ? data.maintenance.paidRevenue : 0) / data.maintenance.totalRevenue) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">Outstanding Revenue</p>
                    <p className="text-xl font-medium">{formatCurrency(data.maintenance.outstandingRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stock Distribution</CardTitle>
                <CardDescription>Stock levels by location</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Items in stock" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inventory Metrics</CardTitle>
                <CardDescription>Inventory status and alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Products</p>
                      <p className="text-xl font-medium">{data.inventory.totalProducts}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Low Stock Items</p>
                      <p className="text-xl font-medium">{data.inventory.lowStockProducts}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Low Stock Rate</span>
                      <span>
                        {typeof data.inventory.totalProducts === 'number' && data.inventory.totalProducts > 0
                          ? ((typeof data.inventory.lowStockProducts === 'number' ? data.inventory.lowStockProducts : 0) / data.inventory.totalProducts * 100).toFixed(1)
                          : '0'}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full"
                        style={{
                          width: `${
                            typeof data.inventory.totalProducts === 'number' && data.inventory.totalProducts > 0
                              ? ((typeof data.inventory.lowStockProducts === 'number' ? data.inventory.lowStockProducts : 0) / data.inventory.totalProducts) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">Stock Distribution</p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Warehouse</p>
                        <p className="text-lg font-medium">{data.inventory.totalWarehouseStock}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Shop</p>
                        <p className="text-lg font-medium">{data.inventory.totalShopStock}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}


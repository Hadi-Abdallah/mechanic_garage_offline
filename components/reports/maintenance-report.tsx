"use client"

import { useState } from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollableDialogBody } from "@/components/ui/scrollable-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"

interface MaintenanceReportProps {
  data: any[]
}

export function MaintenanceReport({ data }: MaintenanceReportProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState<any | null>(null)

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "clientName",
      header: "Client",
      cell: ({ row }) => {
        const clientId = row.original.clientId
        return (
          <Link href={`/clients/${clientId}`} className="text-blue-600 hover:underline">
            {row.getValue("clientName")}
          </Link>
        )
      },
    },
    {
      accessorKey: "carDetails",
      header: "Car",
      cell: ({ row }) => {
        const carUin = row.original.carUin
        return (
          <Link href={`/cars/${carUin}`} className="text-blue-600 hover:underline">
            {row.getValue("carDetails")}
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
      accessorKey: "totalCost",
      header: "Total Cost",
      cell: ({ row }) => formatCurrency(row.getValue("totalCost")),
    },
    {
      accessorKey: "paidAmount",
      header: "Paid Amount",
      cell: ({ row }) => formatCurrency(row.getValue("paidAmount")),
    },
    {
      accessorKey: "remainingBalance",
      header: "Remaining",
      cell: ({ row }) => formatCurrency(row.getValue("remainingBalance")),
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
      id: "details",
      header: "Details",
      cell: ({ row }) => {
        return (
          <Button variant="ghost" size="sm" onClick={() => setSelectedMaintenance(row.original)}>
            <FileText className="h-4 w-4 mr-2" />
            View
          </Button>
        )
      },
    },
  ]

  const handleExport = () => {
    setIsExporting(true)
    try {
      // Create CSV content
      const headers = columns.filter((col) => col.id !== "details").map((col) => col.header as string)

      const rows = data.map((item) =>
        columns
          .filter((col) => col.id !== "details")
          .map((col) => {
            const key = col.accessorKey as string
            if (key === "totalCost" || key === "paidAmount" || key === "remainingBalance") {
              return `$${item[key].toFixed(2)}`
            }
            return item[key] || ""
          }),
      )

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", "maintenance-report.csv")
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setIsExporting(false)
    }
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No maintenance requests on this date.</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate totals
  const totalRequests = data.length
  const totalCost = data.reduce((sum, item) => sum + item.totalCost, 0)
  const totalPaid = data.reduce((sum, item) => sum + item.paidAmount, 0)
  const totalRemaining = data.reduce((sum, item) => sum + item.remainingBalance, 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Maintenance Requests</h3>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <AdvancedDataTable
        columns={columns}
        data={data}
        showTotals={true}
        totalsRow={
          <tr>
            <td className="p-2 font-medium sticky left-0 bg-background z-20">Total: {totalRequests}</td>
            <td className="p-2"></td>
            <td className="p-2"></td>
            <td className="p-2"></td>
            <td className="p-2">{formatCurrency(totalCost)}</td>
            <td className="p-2">{formatCurrency(totalPaid)}</td>
            <td className="p-2">{formatCurrency(totalRemaining)}</td>
            <td className="p-2"></td>
            <td className="p-2"></td>
          </tr>
        }
      />

      {/* Maintenance Details Dialog */}
      {selectedMaintenance && (
        <Dialog open={!!selectedMaintenance} onOpenChange={(open) => !open && setSelectedMaintenance(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Maintenance Request Details</DialogTitle>
            </DialogHeader>
            <ScrollableDialogBody>
              <div className="space-y-6">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Request #{selectedMaintenance.id}</h3>
                    <p className="text-sm text-muted-foreground">
                      Created on {new Date(selectedMaintenance.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      selectedMaintenance.status === "completed"
                        ? "success"
                        : selectedMaintenance.status === "in-progress"
                          ? "default"
                          : selectedMaintenance.status === "pending"
                            ? "secondary"
                            : "destructive"
                    }
                    className="text-sm"
                  >
                    {selectedMaintenance.status.charAt(0).toUpperCase() + selectedMaintenance.status.slice(1)}
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
                        <Link
                          href={`/clients/${selectedMaintenance.clientId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {selectedMaintenance.clientName}
                        </Link>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Car</p>
                        <Link href={`/cars/${selectedMaintenance.carUin}`} className="text-blue-600 hover:underline">
                          {selectedMaintenance.carDetails}
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Payment Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Total Cost:</span>
                        <span className="font-medium">{formatCurrency(selectedMaintenance.totalCost)}</span>
                      </div>
                      {selectedMaintenance.discount > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Discount:</span>
                          <span className="font-medium">-{formatCurrency(selectedMaintenance.discount)}</span>
                        </div>
                      )}
                      {selectedMaintenance.additionalFee > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Additional Fee:</span>
                          <span className="font-medium">{formatCurrency(selectedMaintenance.additionalFee)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span>Paid Amount:</span>
                          <span className="font-medium">{formatCurrency(selectedMaintenance.paidAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold">
                          <span>Remaining Balance:</span>
                          <span>{formatCurrency(selectedMaintenance.remainingBalance)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="services">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                  </TabsList>

                  <TabsContent value="services" className="space-y-4 mt-4">
                    <h4 className="text-sm font-medium">Services Used</h4>
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
                          {selectedMaintenance.serviceDetails ? (
                            selectedMaintenance.serviceDetails.map((service: any, index: number) => (
                              <tr key={index} className="divide-x divide-border">
                                <td className="whitespace-nowrap px-4 py-2 text-sm">{service.name}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">{service.quantity}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">
                                  {formatCurrency(service.cost / service.quantity)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">{formatCurrency(service.cost)}</td>
                              </tr>
                            ))
                          ) : (
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

                  <TabsContent value="products" className="space-y-4 mt-4">
                    <h4 className="text-sm font-medium">Products Used</h4>
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
                          {selectedMaintenance.productDetails ? (
                            selectedMaintenance.productDetails.map((product: any, index: number) => (
                              <tr key={index} className="divide-x divide-border">
                                <td className="whitespace-nowrap px-4 py-2 text-sm">{product.name}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">{product.quantity}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">
                                  {formatCurrency(product.unitPrice)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm capitalize">
                                  {product.stockSource}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm">{formatCurrency(product.cost)}</td>
                              </tr>
                            ))
                          ) : (
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
                </Tabs>
              </div>
            </ScrollableDialogBody>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}


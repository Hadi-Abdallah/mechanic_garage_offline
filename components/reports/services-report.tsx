"use client"

import { useState } from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

interface ServicesReportProps {
  data: any[]
}

export function ServicesReport({ data }: ServicesReportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "serviceName",
      header: "Service",
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
    },
    {
      accessorKey: "unitPrice",
      header: "Unit Price",
      cell: ({ row }) => formatCurrency(row.getValue("unitPrice")),
    },
    {
      accessorKey: "totalCost",
      header: "Total Cost",
      cell: ({ row }) => formatCurrency(row.getValue("totalCost")),
    },
    {
      accessorKey: "maintenanceId",
      header: "Maintenance ID",
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
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => {
        return new Date(row.getValue("timestamp")).toLocaleTimeString()
      },
    },
  ]

  const handleExport = () => {
    setIsExporting(true)
    try {
      // Create CSV content
      const headers = columns.map((col) => col.header as string)

      const rows = data.map((item) =>
        columns.map((col) => {
          const key = col.accessorKey as string
          if (key === "timestamp") {
            return new Date(item[key]).toLocaleString()
          }
          if (key === "unitPrice" || key === "totalCost") {
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
      link.setAttribute("download", "services-report.csv")
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
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No services performed on this date.</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate totals
  const totalServices = data.length
  const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0)
  const totalCost = data.reduce((sum, item) => sum + item.totalCost, 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Services Performed</h3>
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
            <td className="p-2 font-medium sticky left-0 bg-background z-20">Total: {totalServices}</td>
            <td className="p-2">{totalQuantity}</td>
            <td className="p-2"></td>
            <td className="p-2">{formatCurrency(totalCost)}</td>
            <td className="p-2"></td>
            <td className="p-2"></td>
            <td className="p-2"></td>
            <td className="p-2"></td>
          </tr>
        }
      />
    </div>
  )
}


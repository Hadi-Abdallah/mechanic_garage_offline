"use client"

import { useState } from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface PaymentsReportProps {
  data: any[]
}

export function PaymentsReport({ data }: PaymentsReportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "maintenanceId",
      header: "Maintenance ID",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.getValue("amount")),
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment Method",
      cell: ({ row }) => {
        const method = row.getValue("paymentMethod") as string
        return (
          <Badge variant="outline" className="capitalize">
            {method || "Cash"}
          </Badge>
        )
      },
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
      accessorKey: "remainingBalance",
      header: "Remaining Balance",
      cell: ({ row }) => formatCurrency(row.getValue("remainingBalance")),
    },
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => {
        return new Date(row.getValue("timestamp")).toLocaleTimeString()
      },
    },
    {
      accessorKey: "adminName",
      header: "Processed By",
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
          if (key === "amount" || key === "remainingBalance") {
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
      link.setAttribute("download", "payments-report.csv")
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
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No payments received on this date.</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate totals
  const totalPayments = data.length
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0)
  const totalRemaining = data.reduce((sum, item) => sum + item.remainingBalance, 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Payments Received</h3>
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
            <td className="p-2 font-medium sticky left-0 bg-background z-20">Total: {totalPayments}</td>
            <td className="p-2">{formatCurrency(totalAmount)}</td>
            <td className="p-2"></td>
            <td className="p-2"></td>
            <td className="p-2"></td>
            <td className="p-2">{formatCurrency(totalRemaining)}</td>
            <td className="p-2"></td>
            <td className="p-2"></td>
          </tr>
        }
      />
    </div>
  )
}


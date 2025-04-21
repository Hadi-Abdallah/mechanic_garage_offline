"use client"

import { useState } from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface NewCarsReportProps {
  data: any[]
}

export function NewCarsReport({ data }: NewCarsReportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "uin",
      header: "UIN",
      cell: ({ row }) => {
        return (
          <Link href={`/cars/${row.getValue("uin")}`} className="text-blue-600 hover:underline">
            {row.getValue("uin")}
          </Link>
        )
      },
    },
    {
      accessorKey: "licensePlate",
      header: "License Plate",
    },
    {
      accessorKey: "make",
      header: "Make",
    },
    {
      accessorKey: "model",
      header: "Model",
    },
    {
      accessorKey: "year",
      header: "Year",
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
      accessorKey: "createdAt",
      header: "Registration Time",
      cell: ({ row }) => {
        return new Date(row.getValue("createdAt")).toLocaleTimeString()
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
          if (key === "createdAt") {
            return new Date(item[key]).toLocaleString()
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
      link.setAttribute("download", "new-cars-report.csv")
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
          <CardTitle>New Cars</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No new cars registered on this date.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">New Cars Registered</h3>
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
            <td className="p-2 font-medium sticky left-0 bg-background z-20">Total: {data.length}</td>
            <td className="p-2"></td>
            <td className="p-2"></td>
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


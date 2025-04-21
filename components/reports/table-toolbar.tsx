"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

interface ReportSummary {
  date: string
  newCars: number
  services: number
  products: number
  payments: number
  maintenance: number
}

export interface TableToolbarProps {
  report: ReportSummary
}

export function TableToolbar({ report }: TableToolbarProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">New Cars</p>
            <p className="text-2xl font-semibold">{report.newCars}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Services</p>
            <p className="text-2xl font-semibold">{report.services}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Products</p>
            <p className="text-2xl font-semibold">{report.products}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Payments</p>
            <p className="text-2xl font-semibold">{formatCurrency(report.payments)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Maintenance</p>
            <p className="text-2xl font-semibold">{report.maintenance}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
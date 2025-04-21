"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { formatCellValue, getAllUniqueKeys, filterDisplayKeys } from "@/lib/utils/table-utils"

interface DataExportProps {
  data: any[]
  filename?: string
}

export function DataExport({ data, filename = "export" }: DataExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    setIsExporting(true)
    try {
      // Create CSV content
      const headerSet = new Set<string>()
      
      // Get all unique keys across all data objects
      data.forEach(item => {
        Object.keys(item).forEach(key => {
          // Skip some internal fields or complex objects
          if (!['serviceDetails', 'productDetails', 'timestamp', 'createdAt', 'updatedAt'].includes(key)) {
            headerSet.add(key)
          }
        })
      })
      
      // Convert to array and sort for consistent output
      const headers = Array.from(headerSet).sort()
      
      // Function to safely get cell value and format it
      const getCellValue = (item: any, key: string): string => {
        const value = item[key]
        
        if (value === undefined || value === null) {
          return ""
        }
        
        // Format dates
        if (key.includes('date') && typeof value === 'string' && value.includes('-')) {
          try {
            return new Date(value).toLocaleString()
          } catch (e) {
            return value.toString()
          }
        }
        
        // Format currency
        if (
          key.includes('amount') || 
          key.includes('cost') || 
          key.includes('price') || 
          key.includes('balance') || 
          key.includes('fee')
        ) {
          if (typeof value === 'number') {
            return `$${value.toFixed(2)}`
          }
        }
        
        // Handle objects
        if (typeof value === 'object') {
          return JSON.stringify(value)
        }
        
        // Handle strings with commas (CSV escape)
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        
        return value.toString()
      }
      
      // Generate rows
      const rows = data.map(item => 
        headers.map(header => getCellValue(item, header))
      )
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      // Create descriptive filename with date
      const date = new Date().toISOString().split('T')[0]
      const fullFilename = `${filename}-${date}.csv`
      
      link.setAttribute('href', url)
      link.setAttribute('download', fullFilename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport} 
      disabled={isExporting || !data.length}
    >
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  )
}
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Upload, RefreshCw } from "lucide-react"
import { exportDatabaseBackup, importDatabaseBackup } from "@/lib/actions"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"

export function DatabaseBackup() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const { toast } = useToast()

  const handleExportBackup = async () => {
    setIsExporting(true)
    try {
      const result = await exportDatabaseBackup()

      if (result.success && result.data) {
        // Create a blob and download
        const jsonString = JSON.stringify(result.data, null, 2)
        const blob = new Blob([jsonString], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `garage-backup-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast({
          title: "Backup Exported",
          description: "Database backup has been successfully exported.",
        })
      } else {
        toast({
          title: "Export Failed",
          description: result.error || "Failed to export database backup.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error exporting database backup:", error)
      toast({
        title: "Export Failed",
        description: "An unexpected error occurred while exporting the backup.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportBackup = async () => {
    if (!backupFile) {
      toast({
        title: "No File Selected",
        description: "Please select a backup file to import.",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    try {
      const fileContent = await backupFile.text()
      let backupData

      try {
        backupData = JSON.parse(fileContent)
      } catch (e) {
        throw new Error("Invalid backup file format. The file must be a valid JSON file.")
      }

      const result = await importDatabaseBackup(backupData)

      if (result.success) {
        toast({
          title: "Backup Imported",
          description: "Database has been successfully restored from backup.",
        })
        setBackupFile(null)
      } else {
        toast({
          title: "Import Failed",
          description: result.error || "Failed to import database backup.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error importing database backup:", error)
      toast({
        title: "Import Failed",
        description: error.message || "An unexpected error occurred while importing the backup.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Backup & Restore</CardTitle>
        <CardDescription>
          Export your database for backup or import a previous backup to restore your data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Export Database Backup</Label>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportBackup} disabled={isExporting} className="w-full sm:w-auto">
              {isExporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Backup
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Creates a complete backup of all your data in JSON format.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="backup-file">Import Database Backup</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                id="backup-file"
                type="file"
                accept=".json"
                onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                disabled={isImporting}
              />
            </div>
            <Button onClick={handleImportBackup} disabled={isImporting || !backupFile}>
              {isImporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Backup
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Warning: Importing a backup will replace all existing data. This action cannot be undone.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2">
        <div className="text-sm font-medium">Best Practices:</div>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>Create regular backups, especially before major system changes</li>
          <li>Store backups in multiple secure locations</li>
          <li>Test your backups periodically by performing a restore in a test environment</li>
          <li>Keep backups for different time periods (daily, weekly, monthly)</li>
        </ul>
      </CardFooter>
    </Card>
  )
}


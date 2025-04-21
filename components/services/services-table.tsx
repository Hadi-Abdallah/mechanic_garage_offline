"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Trash2, Plus } from "lucide-react"
import type { Service } from "@/lib/db"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { Button } from "@/components/ui/button"
import { ServiceForm } from "@/components/services/service-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { createService, deleteService, updateServiceField } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { ScrollableDialogBody } from "@/components/ui/scrollable-dialog"
import { EditableCell } from "@/components/ui/editable-cell"

interface ServicesTableProps {
  services: Service[]
}

export function ServicesTable({ services }: ServicesTableProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async (service: Service) => {
    setIsLoading(true)
    try {
      const result = await deleteService(service.id)
      if (result.success) {
        toast({
          title: "Service deleted",
          description: `${service.name} has been deleted successfully.`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (service: Partial<Service>) => {
    setIsLoading(true)
    try {
      const result = await createService(service)

      if (result.success) {
        toast({
          title: "Service created",
          description: `${service.name} has been created successfully.`,
        })
        setIsAddDialogOpen(false)
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateField = async (id: string, field: string, value: string | number) => {
    return updateServiceField(id, field, value)
  }

  const columns: ColumnDef<Service>[] = [
    {
      accessorKey: "name",
      header: "Service Name",
      cell: ({ row }) => {
        const service = row.original
        return (
          <EditableCell
            value={service.name}
            onSave={async (value) => {
              await handleUpdateField(service.id, "name", value)
            }}
          />
        )
      },
      filterFn: "fuzzy",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const service = row.original
        return (
          <EditableCell
            value={service.description}
            onSave={async (value) => {
              await handleUpdateField(service.id, "description", value)
            }}
          />
        )
      },
      filterFn: "fuzzy",
    },
    {
      accessorKey: "standardFee",
      header: "Standard Fee",
      cell: ({ row }) => {
        const service = row.original
        return (
          <EditableCell
            value={service.standardFee}
            inputType="number"
            onSave={async (value) => {
              await handleUpdateField(service.id, "standardFee", value)
            }}
          />
        )
      },
      filterFn: "numberRange",
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => {
        return new Date(row.getValue("createdAt")).toLocaleDateString()
      },
      filterFn: "dateRange",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const service = row.original

        return (
          <div className="flex items-center justify-end gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the service and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(service)} disabled={isLoading}>
                    {isLoading ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )
      },
    },
  ]

  // Calculate totals for the footer
  const totalServices = services.length
  const totalFees = services.reduce((sum, service) => sum + service.standardFee, 0)

  const totalsRow = (
    <tr>
      <td className="p-2 font-medium sticky left-0 bg-background z-20">Total: {totalServices}</td>
      <td className="p-2"></td>
      <td className="p-2">${totalFees.toFixed(2)}</td>
      <td className="p-2"></td>
      <td className="p-2"></td>
    </tr>
  )

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Service</DialogTitle>
            </DialogHeader>
            <ScrollableDialogBody>
              <ServiceForm
                onSubmit={(data) => handleSubmit(data)}
                onCancel={() => setIsAddDialogOpen(false)}
                isLoading={isLoading}
              />
            </ScrollableDialogBody>
          </DialogContent>
        </Dialog>
      </div>

      <AdvancedDataTable
        columns={columns}
        data={services || []}
        showTotals={true}
        totalsRow={totalsRow}
        isLoading={isLoading}
      />
    </div>
  )
}


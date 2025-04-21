"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Trash2, Plus } from "lucide-react"
import type { Supplier } from "@/lib/db"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { Button } from "@/components/ui/button"
import { SupplierForm } from "@/components/suppliers/supplier-form"
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
import { createSupplier, deleteSupplier, updateSupplierField } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { ScrollableDialogBody } from "@/components/ui/scrollable-dialog"
import { EditableCell } from "@/components/ui/editable-cell"

interface SuppliersTableProps {
  suppliers: Supplier[]
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async (supplier: Supplier) => {
    setIsLoading(true)
    try {
      const result = await deleteSupplier(supplier.id)
      if (result.success) {
        toast({
          title: "Supplier deleted",
          description: `${supplier.name} has been deleted successfully.`,
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

  const handleSubmit = async (supplier: Partial<Supplier>) => {
    setIsLoading(true)
    try {
      const result = await createSupplier(supplier)

      if (result.success) {
        toast({
          title: "Supplier created",
          description: `${supplier.name} has been created successfully.`,
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
    return updateSupplierField(id, field, value)
  }

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "name",
      header: "Supplier Name",
      cell: ({ row }) => {
        const supplier = row.original
        return (
          <EditableCell
            value={supplier.name}
            onSave={async (value) => {
              await handleUpdateField(supplier.id, "name", value)
            }}
          />
        )
      },
      filterFn: "fuzzy",
    },
    {
      accessorKey: "contact",
      header: "Contact Person",
      cell: ({ row }) => {
        const supplier = row.original
        return (
          <EditableCell
            value={supplier.contact}
            onSave={async (value) => {
              await handleUpdateField(supplier.id, "contact", value)
            }}
          />
        )
      },
      filterFn: "fuzzy",
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const supplier = row.original
        return (
          <EditableCell
            value={supplier.email}
            onSave={async (value) => {
              await handleUpdateField(supplier.id, "email", value)
            }}
          />
        )
      },
      filterFn: "fuzzy",
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => {
        const supplier = row.original
        return (
          <EditableCell
            value={supplier.phone}
            onSave={async (value) => {
              await handleUpdateField(supplier.id, "phone", value)
            }}
          />
        )
      },
      filterFn: "fuzzy",
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => {
        const supplier = row.original
        return (
          <EditableCell
            value={supplier.address}
            onSave={async (value) => {
              await handleUpdateField(supplier.id, "address", value)
            }}
          />
        )
      },
      filterFn: "fuzzy",
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
        const supplier = row.original

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
                    This action cannot be undone. This will permanently delete the supplier and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(supplier)} disabled={isLoading}>
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
  const totalSuppliers = suppliers.length

  const totalsRow = (
    <tr>
      <td className="p-2 font-medium sticky left-0 bg-background z-20">Total: {totalSuppliers}</td>
      <td className="p-2"></td>
      <td className="p-2"></td>
      <td className="p-2"></td>
      <td className="p-2"></td>
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
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
            </DialogHeader>
            <ScrollableDialogBody>
              <SupplierForm
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
        data={suppliers || []}
        showTotals={true}
        totalsRow={totalsRow}
        isLoading={isLoading}
      />
    </div>
  )
}


"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Trash2, Plus } from "lucide-react"
import type { Insurance } from "@/lib/db"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { Button } from "@/components/ui/button"
import { InsuranceForm } from "@/components/insurance/insurance-form"
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
import { createInsurance, deleteInsurance, updateInsuranceField } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { ScrollableDialogBody } from "@/components/ui/scrollable-dialog"
import { EditableCell } from "@/components/ui/editable-cell"

interface InsuranceTableProps {
  insuranceCompanies: Insurance[]
}

export function InsuranceTable({ insuranceCompanies }: InsuranceTableProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async (insurance: Insurance) => {
    setIsLoading(true)
    try {
      const result = await deleteInsurance(insurance.id)
      if (result.success) {
        toast({
          title: "Insurance company deleted",
          description: `${insurance.name} has been deleted successfully.`,
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

  const handleSubmit = async (insurance: Partial<Insurance>) => {
    setIsLoading(true)
    try {
      const result = await createInsurance(insurance)

      if (result.success) {
        toast({
          title: "Insurance company created",
          description: `${insurance.name} has been created successfully.`,
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
    return updateInsuranceField(id, field, value)
  }

  const columns: ColumnDef<Insurance>[] = [
    {
      accessorKey: "name",
      header: "Company Name",
      cell: ({ row }) => {
        const insurance = row.original
        return (
          <EditableCell
            value={insurance.name}
            onSave={async (value) => {
              await handleUpdateField(insurance.id, "name", value)
            }}
          />
        )
      },
      filterFn: "fuzzy",
    },
    {
      accessorKey: "contactPerson",
      header: "Contact Person",
      cell: ({ row }) => {
        const insurance = row.original
        return (
          <EditableCell
            value={insurance.contactPerson}
            onSave={async (value) => {
              await handleUpdateField(insurance.id, "contactPerson", value)
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
        const insurance = row.original
        return (
          <EditableCell
            value={insurance.email}
            onSave={async (value) => {
              await handleUpdateField(insurance.id, "email", value)
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
        const insurance = row.original
        return (
          <EditableCell
            value={insurance.phone}
            onSave={async (value) => {
              await handleUpdateField(insurance.id, "phone", value)
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
        const insurance = row.original
        return (
          <EditableCell
            value={insurance.address}
            onSave={async (value) => {
              await handleUpdateField(insurance.id, "address", value)
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
        const insurance = row.original

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
                    This action cannot be undone. This will permanently delete the insurance company and all associated
                    data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(insurance)} disabled={isLoading}>
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
  const totalInsuranceCompanies = insuranceCompanies.length

  const totalsRow = (
    <tr>
      <td className="p-2 font-medium sticky left-0 bg-background z-20">Total: {totalInsuranceCompanies}</td>
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
              Add Insurance Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Insurance Company</DialogTitle>
            </DialogHeader>
            <ScrollableDialogBody>
              <InsuranceForm
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
        data={insuranceCompanies || []}
        showTotals={true}
        totalsRow={totalsRow}
        isLoading={isLoading}
      />
    </div>
  )
}


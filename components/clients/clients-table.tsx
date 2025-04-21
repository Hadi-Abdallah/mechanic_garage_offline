"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Trash2, Plus } from "lucide-react"
import type { Client } from "@/lib/db"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { Button } from "@/components/ui/button"
import { ClientForm } from "@/components/clients/client-form"
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
import { createClient, deleteClient, updateClientField } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { ScrollableDialogBody } from "@/components/ui/scrollable-dialog"
import { EditableCell } from "@/components/ui/editable-cell"

interface ClientsTableProps {
  clients: Client[]
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async (client: Client) => {
    setIsLoading(true)
    try {
      const result = await deleteClient(client.id)
      if (result.success) {
        toast({
          title: "Client deleted",
          description: `${client.name} has been deleted successfully.`,
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

  const handleSubmit = async (client: Partial<Client>) => {
    setIsLoading(true)
    try {
      const result = await createClient(client)

      if (result.success) {
        toast({
          title: "Client created",
          description: `${client.name} has been created successfully.`,
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
    return updateClientField(id, field, value)
  }

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: "name",
      header: "Client Name",
      cell: ({ row }) => {
        const client = row.original
        return (
          <EditableCell
            value={client.name}
            onSave={async (value) => {
              await handleUpdateField(client.id, "name", value)
            }}
          />
        )
      },
      filterFn: "fuzzy",
    },
    {
      accessorKey: "contact",
      header: "Contact",
      cell: ({ row }) => {
        const client = row.original
        return (
          <EditableCell
            value={client.contact}
            onSave={async (value) => {
              await handleUpdateField(client.id, "contact", value)
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
        const client = row.original
        return (
          <EditableCell
            value={client.email}
            onSave={async (value) => {
              await handleUpdateField(client.id, "email", value)
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
        const client = row.original
        return (
          <EditableCell
            value={client.address}
            onSave={async (value) => {
              await handleUpdateField(client.id, "address", value)
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
      accessorKey: "updatedAt",
      header: "Updated At",
      cell: ({ row }) => {
        return new Date(row.getValue("updatedAt")).toLocaleDateString()
      },
      filterFn: "dateRange",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const client = row.original

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
                    This action cannot be undone. This will permanently delete the client and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(client)} disabled={isLoading}>
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
  const totalClients = clients.length
  const totalEmails = clients.filter((client) => client.email).length
  const totalContacts = clients.filter((client) => client.contact).length

  const totalsRow = (
    <tr>
      <td className="p-2 font-medium sticky left-0 bg-background z-20">Total: {totalClients}</td>
      <td className="p-2">{totalContacts}</td>
      <td className="p-2">{totalEmails}</td>
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
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <ScrollableDialogBody>
              <ClientForm
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
        data={clients || []}
        showTotals={true}
        totalsRow={totalsRow}
        isLoading={isLoading}
      />
    </div>
  )
}


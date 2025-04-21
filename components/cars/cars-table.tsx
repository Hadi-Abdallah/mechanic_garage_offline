"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon, Pencil, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CarForm, type CarFormValues } from "@/components/cars/car-form"
import {
  Dialog,
  ScrollableDialogContent as DialogContent,
  ScrollableDialogHeader as DialogHeader,
  ScrollableDialogTitle as DialogTitle,
  ScrollableDialogBody,
} from "@/components/ui/scrollable-dialog"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { updateCar, deleteCar } from "@/lib/actions"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface CarsTableProps {
  cars: any[]
  loading?: boolean
  onRefresh?: () => void
  onAddCar?: () => void // New prop to handle add car action
}

export function CarsTable({ cars = [], loading = false, onRefresh, onAddCar }: CarsTableProps) {
  const [editingCar, setEditingCar] = useState<any | null>(null)
  const [deletingCar, setDeletingCar] = useState<any | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleEditCar = async (data: CarFormValues) => {
    if (!editingCar) return

    setIsSubmitting(true)
    try {
      const result = await updateCar(editingCar.uin, data)

      if (result.success) {
        toast({
          title: "Success",
          description: "Car updated successfully",
        })
        setEditingCar(null)
        if (onRefresh) onRefresh()
        else router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update car",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating car:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCar = async () => {
    if (!deletingCar) return

    setIsSubmitting(true)
    try {
      const result = await deleteCar(deletingCar.uin)

      if (result.success) {
        toast({
          title: "Success",
          description: "Car deleted successfully",
        })
        setDeletingCar(null)
        if (onRefresh) onRefresh()
        else router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete car",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting car:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">All Cars</h2>
        {onAddCar && (
          <Button onClick={onAddCar}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Car
          </Button>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>UIN</TableHead>
              <TableHead>License Plate</TableHead>
              <TableHead>Make</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  Loading cars...
                </TableCell>
              </TableRow>
            ) : cars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  No cars found. Add a car to get started.
                </TableCell>
              </TableRow>
            ) : (
              cars.map((car) => (
                <TableRow key={car.uin}>
                  <TableCell>
                    <Link href={`/cars/${car.uin}`} className="text-blue-600 hover:underline">
                      {car.uin}
                    </Link>
                  </TableCell>
                  <TableCell>{car.licensePlate}</TableCell>
                  <TableCell>{car.make}</TableCell>
                  <TableCell>{car.model}</TableCell>
                  <TableCell>{car.year}</TableCell>
                  <TableCell>{car.color}</TableCell>
                  <TableCell>{car.clientName || car.clientId}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditingCar(car)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingCar(car)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Car Dialog */}
      <Dialog open={!!editingCar} onOpenChange={(open) => !open && setEditingCar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Car</DialogTitle>
          </DialogHeader>
          <ScrollableDialogBody>
            {editingCar && (
              <CarForm
                car={editingCar}
                onSubmit={handleEditCar}
                onCancel={() => setEditingCar(null)}
                isLoading={isSubmitting}
              />
            )}
          </ScrollableDialogBody>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deletingCar}
        onOpenChange={(open) => !open && setDeletingCar(null)}
        title="Delete Car"
        description={`Are you sure you want to delete ${deletingCar?.make} ${deletingCar?.model} (${deletingCar?.licensePlate})? This action cannot be undone.`}
        onConfirm={handleDeleteCar}
        isLoading={isSubmitting}
      />
    </div>
  )
}


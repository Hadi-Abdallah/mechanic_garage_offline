"use client"

import { useState } from "react"
import { CarsTable } from "@/components/cars/cars-table"
import { CarForm, type CarFormValues } from "@/components/cars/car-form"
import { createCar } from "@/lib/actions"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import {
  Dialog,
  ScrollableDialogContent as DialogContent,
  ScrollableDialogHeader as DialogHeader,
  ScrollableDialogTitle as DialogTitle,
  ScrollableDialogBody,
} from "@/components/ui/scrollable-dialog"

interface CarsPageClientProps {
  initialCars: any[]
}

export function CarsPageClient({ initialCars }: CarsPageClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCreateCar = async (data: CarFormValues) => {
    setFormLoading(true)
    try {
      console.log("Car form data before submission:", data)

      // Validate required fields client-side again
      const requiredFields = ["uin", "licensePlate", "make", "model", "clientId"]
      const missingFields = requiredFields.filter((field) => !data[field as keyof CarFormValues])

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`)
      }

      // Create a clean object with only the required fields
      const carData = {
        uin: data.uin.trim(),
        licensePlate: data.licensePlate.trim(),
        make: data.make.trim(),
        model: data.model.trim(),
        year: Number(data.year),
        vin: data.vin.trim(),
        color: data.color.trim(),
        clientId: data.clientId.trim(),
        insuranceId: data.insuranceId === "none" ? null : data.insuranceId || null,
      }

      console.log("Sanitized car data for submission:", carData)

      // Validate the data one more time
      if (!carData.uin || carData.uin.length < 3) {
        throw new Error("UIN must be at least 3 characters")
      }

      if (!carData.clientId) {
        throw new Error("Client is required")
      }

      const result = await createCar(carData)

      if (result.success) {
        toast({
          title: "Success",
          description: "Car created successfully",
        })
        setFormOpen(false)
        router.refresh()
      } else {
        console.error("Error from server:", result.error)
        toast({
          title: "Error",
          description: result.error || "Failed to create car",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Exception during car creation:", error)
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred while creating the car",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
    }
  }

  // Function to open the form dialog - will be passed to CarsTable
  const openAddCarForm = () => setFormOpen(true)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cars</h1>
        <div className="flex gap-2">
          <CarsTable cars={initialCars} onAddCar={openAddCarForm} onRefresh={() => router.refresh()} />
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Car</DialogTitle>
          </DialogHeader>
          <ScrollableDialogBody>
            <CarForm onSubmit={handleCreateCar} onCancel={() => setFormOpen(false)} isLoading={formLoading} />
          </ScrollableDialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}


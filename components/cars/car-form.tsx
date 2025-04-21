"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Car } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getClients } from "@/lib/actions"
import { WifiOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useOnlineStatus } from "@/lib/network-status"
import { api } from "@/lib/api-client"

const carSchema = z.object({
  uin: z.string().min(3, {
    message: "UIN must be at least 3 characters.",
  }),
  licensePlate: z.string().min(2, {
    message: "License plate must be at least 2 characters.",
  }),
  make: z.string().min(2, {
    message: "Make must be at least 2 characters.",
  }),
  model: z.string().min(1, {
    message: "Model must be at least 1 character.",
  }),
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  vin: z.string().min(10, {
    message: "VIN must be at least 10 characters.",
  }),
  color: z.string().min(2, {
    message: "Color must be at least 2 characters.",
  }),
  clientId: z.string().min(1, {
    message: "Client is required.",
  }),
  insuranceId: z.string().optional(),
})

export type CarFormValues = z.infer<typeof carSchema>

interface CarFormProps {
  car?: Car
  onSubmit: (data: CarFormValues) => void
  onCancel: () => void
  isLoading?: boolean
}

export function CarForm({ car, onSubmit, onCancel, isLoading: externalLoading = false }: CarFormProps) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isOnline = useOnlineStatus()
  const { toast } = useToast()

  const form = useForm<CarFormValues>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      uin: car?.uin || "",
      licensePlate: car?.licensePlate || "",
      make: car?.make || "",
      model: car?.model || "",
      year: car?.year || new Date().getFullYear(),
      vin: car?.vin || "",
      color: car?.color || "",
      clientId: car?.clientId || "",
      insuranceId: car?.insuranceId || "",
    },
  })

  // Fetch clients for the dropdown
  useEffect(() => {
    const fetchClients = async () => {
      setClientsLoading(true)
      try {
        const result = await getClients()
        if (result.success && result.data) {
          setClients(result.data.map((client) => ({ id: client.id, name: client.name })))
        }
      } catch (error) {
        console.error("Error fetching clients:", error)
      } finally {
        setClientsLoading(false)
      }
    }

    fetchClients()
  }, [])

  const handleSubmit = async (values: CarFormValues) => {
    // Clear any previous errors
    setFormError(null)
    setIsSubmitting(true)

    // Log the values being submitted
    console.log("Submitting car form with values:", values)

    try {
      // Ensure all required fields have values
      const requiredFields = ["uin", "licensePlate", "make", "model", "clientId"]
      const missingFields = requiredFields.filter((field) => !values[field as keyof CarFormValues])

      if (missingFields.length > 0) {
        console.error("Missing required fields:", missingFields)
        setFormError(`Missing required fields: ${missingFields.join(", ")}`)
        setIsSubmitting(false)
        return
      }

      // Ensure year is a valid number
      if (isNaN(Number(values.year))) {
        console.error("Invalid year value:", values.year)
        setFormError("Year must be a valid number")
        setIsSubmitting(false)
        return
      }

      // Ensure clientId is selected
      if (!values.clientId) {
        console.error("No client selected")
        setFormError("Please select a client")
        setIsSubmitting(false)
        return
      }

      // Ensure UIN is at least 3 characters
      if (values.uin.length < 3) {
        console.error("UIN too short:", values.uin)
        setFormError("UIN must be at least 3 characters")
        setIsSubmitting(false)
        return
      }

      // All validation passed, proceed with offline-aware API call
      console.log("Form validation passed, submitting:", values)
      
      // Determine the endpoint and method based on whether we're updating or creating
      const endpoint = car?.uin 
        ? `/api/cars/${car.uin}` 
        : '/api/cars';
      
      // Use the appropriate HTTP method based on the operation
      const response = car?.uin
        ? await api.put(endpoint, values)
        : await api.post(endpoint, values);
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to save car");
      }
      
      // Show appropriate message based on offline status
      const action = car?.uin ? "updated" : "created";
      const successMessage = response.offline
        ? `Car will be ${action} when you're back online.`
        : `Car ${action} successfully.`;
        
      toast({
        title: response.offline ? "Saved offline" : "Success",
        description: successMessage,
      });
      
      // Call the original onSubmit handler
      onSubmit(values);
    } catch (error: any) {
      console.error("Error in form submission:", error)
      setFormError(error.message || "An unexpected error occurred while processing the form")
      
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false)
    }
  }

  // In a real app, these would be fetched from the database
  const insuranceCompanies = [
    { id: "1", name: "ABC Insurance" },
    { id: "2", name: "XYZ Insurance" },
  ]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {formError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{formError}</div>}
        
        {!isOnline && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
              <WifiOff className="h-4 w-4" />
              <div className="text-sm font-medium">You are currently offline. Your changes will be saved locally and synchronized when your connection is restored.</div>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="uin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>UIN</FormLabel>
              <FormControl>
                <Input placeholder="CAR001" {...field} disabled={!!car} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="licensePlate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>License Plate</FormLabel>
              <FormControl>
                <Input placeholder="ABC123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Make</FormLabel>
                <FormControl>
                  <Input placeholder="Toyota" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="Camry" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input placeholder="Silver" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="vin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VIN</FormLabel>
              <FormControl>
                <Input placeholder="1HGCM82633A123456" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select a client"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="insuranceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select insurance" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {insuranceCompanies.map((insurance) => (
                    <SelectItem key={insurance.id} value={insurance.id}>
                      {insurance.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || externalLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || externalLoading}>
            {isSubmitting || externalLoading ? "Saving..." : car ? "Update Car" : "Add Car"}
          </Button>
        </div>
      </form>
    </Form>
  )
}


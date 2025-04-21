"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Service } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { WifiOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useOnlineStatus } from "@/lib/network-status"
import { api } from "@/lib/api-client"

const serviceSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().min(5, {
    message: "Description must be at least 5 characters.",
  }),
  standardFee: z.coerce.number().min(0, {
    message: "Standard fee must be a positive number.",
  }),
})

export type ServiceFormValues = z.infer<typeof serviceSchema>

interface ServiceFormProps {
  service?: Service
  onSubmit: (data: ServiceFormValues) => void
  onCancel: () => void
  isLoading?: boolean
}

export function ServiceForm({ service, onSubmit, onCancel, isLoading: externalLoading = false }: ServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const isOnline = useOnlineStatus()
  const { toast } = useToast()
  
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name || "",
      description: service?.description || "",
      standardFee: service?.standardFee || 0,
    },
  })

  const handleSubmit = async (values: ServiceFormValues) => {
    setFormError(null)
    setIsSubmitting(true)
    
    try {
      // Determine the endpoint and method based on whether we're updating or creating
      const endpoint = service?.id 
        ? `/api/services/${service.id}` 
        : '/api/services';
      
      // Use the appropriate HTTP method based on the operation
      const response = service?.id
        ? await api.put(endpoint, values)
        : await api.post(endpoint, values);
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to save service");
      }
      
      // Show appropriate message based on offline status
      const action = service?.id ? "updated" : "created";
      const successMessage = response.offline
        ? `Service will be ${action} when you're back online.`
        : `Service ${action} successfully.`;
        
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Name</FormLabel>
              <FormControl>
                <Input placeholder="Oil Change" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Detailed description of the service..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="standardFee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Standard Fee ($)</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={0.01} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || externalLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || externalLoading}>
            {isSubmitting || externalLoading ? "Saving..." : service ? "Update Service" : "Add Service"}
          </Button>
        </div>
      </form>
    </Form>
  )
}


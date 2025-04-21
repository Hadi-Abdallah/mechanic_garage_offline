"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Client } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useOnlineStatus } from "@/lib/network-status"
import { api } from "@/lib/api-client"
import { WifiOff } from "lucide-react"

const clientSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  contact: z.string().min(5, {
    message: "Contact must be at least 5 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  address: z.string().min(5, {
    message: "Address must be at least 5 characters.",
  }),
})

export type ClientFormValues = z.infer<typeof clientSchema>

interface ClientFormProps {
  client?: Client
  onSubmit: (data: ClientFormValues) => void
  onCancel: () => void
  isLoading?: boolean
}

export function ClientForm({ client, onSubmit, onCancel, isLoading: externalLoading = false }: ClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isOnline = useOnlineStatus()
  const { toast } = useToast()
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || "",
      contact: client?.contact || "",
      email: client?.email || "",
      address: client?.address || "",
    },
  })

  const handleSubmit = async (values: ClientFormValues) => {
    setIsSubmitting(true)
    
    try {
      // Prepare data for API call
      const endpoint = client?.id 
        ? `/api/clients/${client.id}` 
        : '/api/clients';
      
      // Use appropriate HTTP method based on whether we're creating or updating
      const response = client?.id
        ? await api.put(endpoint, values)
        : await api.post(endpoint, values);
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to save client");
      }
      
      // Show appropriate message based on offline status
      const action = client?.id ? "updated" : "created";
      const successMessage = response.offline
        ? `Client will be ${action} when you're back online.`
        : `Client ${action} successfully.`;
        
      toast({
        title: response.offline ? "Saved offline" : "Success",
        description: successMessage,
      });
      
      // Call the original onSubmit handler
      onSubmit(values);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const isLoading = isSubmitting || externalLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Smith" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact</FormLabel>
              <FormControl>
                <Input placeholder="+1 (555) 123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john.smith@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="123 Main St, Anytown, CA 12345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : client ? "Update Client" : "Add Client"}
          </Button>
        </div>
      </form>
    </Form>
  )
}


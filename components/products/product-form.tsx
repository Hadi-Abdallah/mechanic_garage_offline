"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Product } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WifiOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useOnlineStatus } from "@/lib/network-status"
import { api } from "@/lib/api-client"

const productSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().min(5, {
    message: "Description must be at least 5 characters.",
  }),
  purchasePrice: z.coerce.number().min(0, {
    message: "Purchase price must be a positive number.",
  }),
  salePrice: z.coerce.number().min(0, {
    message: "Sale price must be a positive number.",
  }),
  warehouseStock: z.coerce.number().int().min(0, {
    message: "Warehouse stock must be a non-negative integer.",
  }),
  shopStock: z.coerce.number().int().min(0, {
    message: "Shop stock must be a non-negative integer.",
  }),
  lowStockThreshold: z.coerce.number().int().min(1, {
    message: "Low stock threshold must be at least 1.",
  }),
  supplierId: z.string().min(1, {
    message: "Supplier is required.",
  }),
})

export type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: Product
  suppliers: { id: string; name: string }[]
  onSubmit: (data: ProductFormValues) => void
  onCancel: () => void
  isLoading?: boolean
}

export function ProductForm({ product, suppliers, onSubmit, onCancel, isLoading: externalLoading = false }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const isOnline = useOnlineStatus()
  const { toast } = useToast()
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      purchasePrice: product?.purchasePrice || 0,
      salePrice: product?.salePrice || 0,
      warehouseStock: product?.warehouseStock || 0,
      shopStock: product?.shopStock || 0,
      lowStockThreshold: product?.lowStockThreshold || 5,
      supplierId: product?.supplierId || "",
    },
  })

  const handleSubmit = async (values: ProductFormValues) => {
    setFormError(null)
    setIsSubmitting(true)
    
    try {
      // Determine the endpoint and method based on whether we're updating or creating
      const endpoint = product?.id 
        ? `/api/products/${product.id}` 
        : '/api/products';
      
      // Use the appropriate HTTP method based on the operation
      const response = product?.id
        ? await api.put(endpoint, values)
        : await api.post(endpoint, values);
      
      if (response.error) {
        throw new Error(response.error.message || "Failed to save product");
      }
      
      // Show appropriate message based on offline status
      const action = product?.id ? "updated" : "created";
      const successMessage = response.offline
        ? `Product will be ${action} when you're back online.`
        : `Product ${action} successfully.`;
        
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
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="Oil Filter" {...field} />
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
                <Textarea placeholder="Detailed description of the product..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="p-3 rounded-md bg-muted/20 border border-muted mb-2">
          <h3 className="text-sm font-medium mb-2">Two-price Model</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="purchasePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.01} {...field} />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">Cost when purchasing from supplier</div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="salePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sale Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={0.01} {...field} />
                  </FormControl>
                  <div className="text-xs text-muted-foreground">Price when selling to customers</div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Legacy price field removed */}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="warehouseStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Warehouse Stock</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shopStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shop Stock</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="lowStockThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Low Stock Threshold</FormLabel>
              <FormControl>
                <Input type="number" min={1} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supplierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
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
            {isSubmitting || externalLoading ? "Saving..." : product ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </form>
    </Form>
  )
}


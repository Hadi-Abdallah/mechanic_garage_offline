"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { Product } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ArrowRight } from "lucide-react"

const transferSchema = z
  .object({
    quantity: z.coerce.number().int().min(1, {
      message: "Quantity must be at least 1.",
    }),
    from: z.enum(["warehouse", "shop"]),
    to: z.enum(["warehouse", "shop"]),
  })
  .refine((data) => data.from !== data.to, {
    message: "Source and destination must be different",
    path: ["to"],
  })

interface StockTransferFormProps {
  product: Product
  onSubmit: (quantity: number, from: "warehouse" | "shop", to: "warehouse" | "shop") => void
  onCancel: () => void
  isLoading?: boolean
}

export function StockTransferForm({ product, onSubmit, onCancel, isLoading = false }: StockTransferFormProps) {
  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      quantity: 1,
      from: "warehouse",
      to: "shop",
    },
  })

  const handleSubmit = (values: z.infer<typeof transferSchema>) => {
    onSubmit(values.quantity, values.from, values.to)
  }

  const fromValue = form.watch("from")
  const maxQuantity = fromValue === "warehouse" ? product.warehouseStock : product.shopStock

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-2">
          <div className="text-sm font-medium">Current Stock Levels:</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-md">
              <div className="font-medium">Warehouse</div>
              <div className="text-2xl">{product.warehouseStock}</div>
            </div>
            <div className="p-3 border rounded-md">
              <div className="font-medium">Shop</div>
              <div className="text-2xl">{product.shopStock}</div>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="from"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Transfer From</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="warehouse" id="from-warehouse" disabled={product.warehouseStock === 0} />
                    <Label htmlFor="from-warehouse">Warehouse ({product.warehouseStock} available)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shop" id="from-shop" disabled={product.shopStock === 0} />
                    <Label htmlFor="from-shop">Shop ({product.shopStock} available)</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-center">
          <ArrowRight className="h-6 w-6" />
        </div>

        <FormField
          control={form.control}
          name="to"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Transfer To</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="warehouse" id="to-warehouse" disabled={fromValue === "warehouse"} />
                    <Label htmlFor="to-warehouse">Warehouse</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shop" id="to-shop" disabled={fromValue === "shop"} />
                    <Label htmlFor="to-shop">Shop</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity to Transfer</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={maxQuantity}
                  {...field}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value)
                    if (isNaN(value)) {
                      field.onChange(1)
                    } else if (value > maxQuantity) {
                      field.onChange(maxQuantity)
                    } else {
                      field.onChange(value)
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || maxQuantity === 0}>
            {isLoading ? "Processing..." : "Transfer Stock"}
          </Button>
        </div>
      </form>
    </Form>
  )
}


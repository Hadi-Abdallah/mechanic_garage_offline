"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { MaintenanceRequest } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { AlertTriangle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

const paymentSchema = z.object({
  amount: z.coerce
    .number()
    .min(0.01, {
      message: "Amount must be greater than 0.",
    })
    .refine((val) => val <= 10000, {
      message: "Amount cannot exceed $10,000.",
    }),
})

interface PaymentFormProps {
  request: MaintenanceRequest
  onSubmit: (amount: number) => void
  onCancel: () => void
  isLoading?: boolean
}

export function PaymentForm({ request, onSubmit, onCancel, isLoading: externalLoading }: PaymentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: typeof request.remainingBalance === 'number' && !isNaN(request.remainingBalance) ? request.remainingBalance : 0.01,
    },
  })

  const handleSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (!confirmStep) {
      setConfirmStep(true)
      return
    }

    setIsSubmitting(true)

    try {
      // Call the onSubmit callback with the amount
      // This will be handled by the parent component
      onSubmit(values.amount)

      // Don't make the payment here - let the parent component handle it
      // The makePayment server action is already being called in the parent
    } catch (error) {
      console.error("Error submitting payment:", error)
      toast({
        title: "Payment failed",
        description: "An unexpected error occurred while processing the payment.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const loading = isSubmitting || externalLoading

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Total Cost</div>
              <div className="text-2xl font-bold">
                ${
                  typeof request.totalCost === 'number' && !isNaN(request.totalCost) 
                  ? request.totalCost.toFixed(2) 
                  : '0.00'
                }
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Remaining Balance</div>
              <div className="text-2xl font-bold">
                ${
                  typeof request.remainingBalance === 'number' && !isNaN(request.remainingBalance) 
                  ? request.remainingBalance.toFixed(2) 
                  : '0.00'
                }
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Amount ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min={0.01}
                    max={typeof request.remainingBalance === 'number' && !isNaN(request.remainingBalance) ? request.remainingBalance : 0.01}
                    {...field}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {confirmStep && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 my-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              <div className="font-medium">⚠ Are you sure? This action cannot be undone!</div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (confirmStep) {
                setConfirmStep(false)
              } else {
                onCancel()
              }
            }}
            disabled={loading}
          >
            {confirmStep ? "Back" : "Cancel"}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Processing..." : confirmStep ? "Confirm Payment" : "Make Payment"}
          </Button>
        </div>
      </form>
    </Form>
  )
}


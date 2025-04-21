"use client"

import { useState, useEffect, useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"
import type { MaintenanceRequest } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus, WifiOff } from "lucide-react"
import {
  getCars,
  getClients,
  getServices,
  getProducts,
  createMaintenanceRequest,
  updateMaintenanceRequest,
} from "@/lib/actions"
import { useToast } from "@/components/ui/use-toast"
import { useOnlineStatus } from "@/lib/network-status"
import { api } from "@/lib/api-client"
import { queueOfflineOperation } from "@/lib/offline-storage"

const maintenanceSchema = z.object({
  carUin: z.string().min(1, {
    message: "Car UIN is required.",
  }),
  clientId: z.string().min(1, {
    message: "Client is required.",
  }),
  servicesUsed: z
    .array(
      z.object({
        serviceId: z.string().min(1, { message: "Service is required" }),
        quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1" }),
      }),
    )
    .min(1, { message: "At least one service is required" }),
  productsUsed: z.array(
    z.object({
      productId: z.string().min(1, { message: "Product is required" }),
      quantity: z.coerce.number().int().min(1, { message: "Quantity must be at least 1" }),
      stockSource: z.enum(["warehouse", "shop"]),
    }),
  ),
  additionalFee: z.coerce.number().min(0),
  discount: z.coerce.number().min(0),
  discountJustification: z.string().max(30).optional(),
  startDate: z.string().min(1, { message: "Start date is required" }),
  endDate: z.string().optional(),
  status: z.enum(["pending", "in-progress", "completed", "cancelled"]),
})

interface MaintenanceFormProps {
  request?: MaintenanceRequest
  initialCarUin?: string
  initialClientId?: string
  onSubmit: () => void
  onCancel: () => void
}

export function MaintenanceForm({ request, initialCarUin, initialClientId, onSubmit, onCancel }: MaintenanceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cars, setCars] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Fetch data from the server
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch all required data in parallel
        const [carsResponse, clientsResponse, servicesResponse, productsResponse] = await Promise.all([
          getCars(),
          getClients(),
          getServices(),
          getProducts(),
        ])

        if (carsResponse.success && carsResponse.data) {
          setCars(carsResponse.data)
        }

        if (clientsResponse.success && clientsResponse.data) {
          setClients(clientsResponse.data)
        }

        if (servicesResponse.success && servicesResponse.data) {
          setServices(servicesResponse.data)
        }

        if (productsResponse.success && productsResponse.data) {
          setProducts(productsResponse.data)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load required data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Filter cars by client for validation
  const [filteredCars, setFilteredCars] = useState<any[]>([]);
  
  // Update filtered cars when client changes
  const filterCarsByClient = useCallback((clientId: string) => {
    if (!clientId) {
      setFilteredCars(cars);
      return;
    }
    
    const clientCars = cars.filter(car => car.clientId === clientId);
    setFilteredCars(clientCars);
  }, [cars]);
  
  // Effect to update filtered cars when clients or cars data changes
  useEffect(() => {
    if (request?.clientId) {
      filterCarsByClient(request.clientId);
    } else {
      setFilteredCars(cars);
    }
  }, [request?.clientId, cars, filterCarsByClient]);

  const form = useForm<z.infer<typeof maintenanceSchema>>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      carUin: request?.carUin || initialCarUin || "",
      clientId: request?.clientId || initialClientId || "",
      servicesUsed: request?.servicesUsed || [{ serviceId: services.length > 0 ? services[0].id : "select-service", quantity: 1 }],
      productsUsed: request?.productsUsed || [],
      additionalFee: request?.additionalFee || 0,
      discount: request?.discount || 0,
      discountJustification: request?.discountJustification || "",
      startDate: request?.startDate || new Date().toISOString().split("T")[0],
      endDate: request?.endDate ? request.endDate.split("T")[0] : undefined,
      status: request?.status || "pending",
    },
  })

  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({
    control: form.control,
    name: "servicesUsed",
  })

  const {
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
  } = useFieldArray({
    control: form.control,
    name: "productsUsed",
  })

  // Track online status
  const isOnline = useOnlineStatus()

  const handleSubmit = async (values: z.infer<typeof maintenanceSchema>) => {
    setIsSubmitting(true)

    try {
      // Validate product stock levels before proceeding
      const stockValidation = validateProductStock(values.productsUsed);
      if (!stockValidation.valid) {
        throw new Error(stockValidation.message);
      }
      
      // Calculate total cost based on services and products
      const servicesTotal = await calculateServicesTotal(values.servicesUsed)
      const productsTotal = await calculateProductsTotal(values.productsUsed)
      const subtotal = servicesTotal + productsTotal + values.additionalFee - values.discount

      // Prepare the complete request data
      const requestData = {
        ...values,
        totalCost: subtotal,
        paidAmount: 0, // Initial paid amount is 0
        remainingBalance: subtotal, // Initial remaining balance is the total cost
        paymentStatus: "pending" as const,
      }

      // If we're updating an existing request
      if (request?.id) {
        // Use the offline-aware API client instead of direct action call
        const endpoint = `/api/maintenance/${request.id}`;
        const response = await api.put(endpoint, requestData);

        if (response.error) {
          throw new Error(response.error.message || "Failed to update maintenance request");
        }

        // Offline flag shows if it was saved to local storage
        const successMessage = response.offline 
          ? "Maintenance request saved offline. Will be updated when you're back online."
          : "Maintenance request updated successfully";

        toast({
          title: "Success",
          description: successMessage,
        });
        onSubmit();
      } else {
        // Create a new maintenance request using offline-aware API
        const endpoint = "/api/maintenance";
        const response = await api.post(endpoint, requestData);

        if (response.error) {
          throw new Error(response.error.message || "Failed to create maintenance request");
        }

        // Offline flag shows if it was saved to local storage
        const successMessage = response.offline 
          ? "Maintenance request saved offline. Will be created when you're back online."
          : "Maintenance request created successfully";

        toast({
          title: "Success",
          description: successMessage,
        });
        onSubmit();
      }
    } catch (error: any) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save maintenance request",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper function to calculate services total
  const calculateServicesTotal = async (servicesUsed: z.infer<typeof maintenanceSchema>['servicesUsed']) => {
    let total = 0
    for (const serviceUsed of servicesUsed) {
      const service = services.find((s) => s.id === serviceUsed.serviceId)
      if (service) {
        total += service.standardFee * serviceUsed.quantity
      }
    }
    return total
  }

  // Helper function to calculate products total
  const calculateProductsTotal = async (
    productsUsed: z.infer<typeof maintenanceSchema>['productsUsed'],
  ) => {
    let total = 0
    for (const productUsed of productsUsed) {
      const product = products.find((p) => p.id === productUsed.productId)
      if (product) {
        // Use salePrice for customer charges, fall back to price for backward compatibility
        const priceToUse = product.salePrice ?? product.price
        total += priceToUse * productUsed.quantity
      }
    }
    return total
  }

  // Handle client selection to filter cars
  const handleClientChange = (clientId: string) => {
    form.setValue("clientId", clientId)
    // Reset car selection if client changes
    form.setValue("carUin", "")
    // Update filtered cars
    filterCarsByClient(clientId)
  }

  // Helper function to determine valid status transitions
  const getValidStatusTransitions = (currentStatus: string): string[] => {
    // If creating a new record, or in special cases like testing, allow all statuses
    if (!request || !request.id) {
      return ["pending", "in-progress", "completed", "cancelled"];
    }
    
    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      "pending": ["pending", "in-progress", "cancelled"],
      "in-progress": ["in-progress", "completed", "cancelled"],
      "completed": ["completed"], // Completed is final (except for admin override)
      "cancelled": ["cancelled", "pending"] // Can reopen cancelled requests
    };
    
    return validTransitions[currentStatus] || ["pending"];
  };
  
  // Helper function to validate product stock levels
  const validateProductStock = (productsUsed: z.infer<typeof maintenanceSchema>['productsUsed']) => {
    for (const productUsed of productsUsed) {
      const product = products.find((p) => p.id === productUsed.productId);
      if (!product) continue;
      
      // Check stock level based on the source
      const stockToCheck = productUsed.stockSource === 'shop' ? product.shopStock : product.warehouseStock;
      
      if (stockToCheck < productUsed.quantity) {
        return {
          valid: false,
          message: `Insufficient stock for ${product.name} in ${productUsed.stockSource}. Available: ${stockToCheck}, Requested: ${productUsed.quantity}`
        };
      }
    }
    
    return { valid: true, message: '' };
  };
  
  // Use the filtered cars for the selected client
  const clientCars = filteredCars;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading form data...</p>
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={(value) => handleClientChange(value)} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
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
            name="carUin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Car</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a car" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientCars.map((car) => (
                      <SelectItem key={car.uin} value={car.uin}>
                        {car.make} {car.model} ({car.licensePlate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => {
              // Determine allowed status transitions based on current status
              const currentStatus = request?.status || "pending";
              const allowedStatuses = getValidStatusTransitions(currentStatus);
              
              return (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allowedStatuses.includes("pending") && <SelectItem value="pending">Pending</SelectItem>}
                      {allowedStatuses.includes("in-progress") && <SelectItem value="in-progress">In Progress</SelectItem>}
                      {allowedStatuses.includes("completed") && <SelectItem value="completed">Completed</SelectItem>}
                      {allowedStatuses.includes("cancelled") && <SelectItem value="cancelled">Cancelled</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {request && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Current status: {currentStatus} - Only valid status transitions are shown
                    </p>
                  )}
                </FormItem>
              )
            }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-center">
              Services
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendService({ serviceId: services.length > 0 ? services[0].id : "select-service", quantity: 1 })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name={`servicesUsed.${index}.serviceId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Service</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a service" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {services.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name} (${service.standardFee})
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
                    name={`servicesUsed.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => serviceFields.length > 1 && removeService(index)}
                    disabled={serviceFields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-center">
              Products
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendProduct({ productId: products.length > 0 ? products[0].id : "select-product", quantity: 1, stockSource: "shop" })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {productFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name={`productsUsed.${index}.productId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Product</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} (${product.salePrice || product.price}) 
                                [Shop: {product.shopStock}, Warehouse: {product.warehouseStock}]
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
                    name={`productsUsed.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`productsUsed.${index}.stockSource`}
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormLabel>Source</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="shop">Shop</SelectItem>
                            <SelectItem value="warehouse">Warehouse</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="button" variant="ghost" size="icon" onClick={() => removeProduct(index)}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="additionalFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Fee ($)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount ($)</FormLabel>
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
          name="discountJustification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discount Justification (max 30 chars)</FormLabel>
              <FormControl>
                <Textarea placeholder="Reason for discount" {...field} value={field.value || ""} maxLength={30} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : request ? "Update Request" : "Create Request"}
          </Button>
        </div>
      </form>
    </Form>
  )
}


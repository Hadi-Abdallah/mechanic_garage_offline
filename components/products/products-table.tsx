"use client"

import { useState, useEffect } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Trash2, Plus, ArrowLeftRight } from "lucide-react"
import type { Product } from "@/lib/db"
import { AdvancedDataTable } from "@/components/ui/advanced-data-table"
import { Button } from "@/components/ui/button"
import { ProductForm } from "@/components/products/product-form"
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
import { createProduct, deleteProduct, updateProductField, getSuppliers, transferStock } from "@/lib/actions"
import { toast } from "@/components/ui/use-toast"
import { ScrollableDialogBody } from "@/components/ui/scrollable-dialog"
import { EditableCell } from "@/components/ui/editable-cell"
import { EditableSelect } from "@/components/ui/editable-select"
import { StockTransferForm } from "@/components/products/stock-transfer-form"
import { Badge } from "@/components/ui/badge"
// Import the formatCurrency function
import { formatCurrency } from "@/lib/utils"

interface ProductsTableProps {
  products: Product[]
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transferringProduct, setTransferringProduct] = useState<Product | null>(null)
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

  // Fetch suppliers for the dropdown
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const result = await getSuppliers()
        if (result.success && result.data) {
          setSuppliers(result.data.map((supplier) => ({ id: supplier.id, name: supplier.name })))
        }
      } catch (error) {
        console.error("Error fetching suppliers:", error)
      }
    }

    fetchSuppliers()
  }, [])

  const handleDelete = async (product: Product) => {
    setIsLoading(true)
    try {
      const result = await deleteProduct(product.id)
      if (result.success) {
        toast({
          title: "Product deleted",
          description: `${product.name} has been deleted successfully.`,
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

  const handleSubmit = async (product: Partial<Product>) => {
    setIsLoading(true)
    try {
      const result = await createProduct(product)

      if (result.success) {
        toast({
          title: "Product created",
          description: `${product.name} has been created successfully.`,
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
    return updateProductField(id, field, value)
  }

  const handleTransferStock = async (
    productId: string,
    quantity: number,
    from: "warehouse" | "shop",
    to: "warehouse" | "shop",
  ) => {
    setIsLoading(true)
    try {
      const result = await transferStock(productId, quantity, from, to)
      if (result.success) {
        toast({
          title: "Stock transferred",
          description: `${quantity} units transferred successfully.`,
          variant: "success",
        })
        setTransferringProduct(null)
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

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Product Name",
      cell: ({ row }) => {
        const product = row.original
        return (
          <EditableCell
            value={product.name}
            onSave={async (value) => {
              await handleUpdateField(product.id, "name", value)
            }}
          />
        )
      },
      filterFn: "includesString",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const product = row.original
        return (
          <EditableCell
            value={product.description}
            onSave={async (value) => {
              await handleUpdateField(product.id, "description", value)
            }}
          />
        )
      },
      filterFn: "includesString",
    },
    {
      accessorKey: "purchasePrice",
      header: "Purchase Price",
      cell: ({ row }) => {
        const product = row.original
        // Fall back to price if purchasePrice is not set
        const value = product.purchasePrice ?? product.price
        return (
          <EditableCell
            value={value}
            inputType="number"
            onSave={async (value) => {
              await handleUpdateField(product.id, "purchasePrice", value)
            }}
            formatter={(value) => formatCurrency(Number(value))}
          />
        )
      },
      filterFn: "inNumberRange",
    },
    {
      accessorKey: "salePrice",
      header: "Sale Price",
      cell: ({ row }) => {
        const product = row.original
        const value = product.salePrice
        return (
          <EditableCell
            value={value}
            inputType="number"
            onSave={async (value) => {
              await handleUpdateField(product.id, "salePrice", value)
            }}
            formatter={(value) => formatCurrency(Number(value))}
          />
        )
      },
      filterFn: "inNumberRange",
    },
    {
      accessorKey: "warehouseStock",
      header: "Warehouse Stock",
      cell: ({ row }) => {
        const product = row.original
        return (
          <EditableCell
            value={product.warehouseStock}
            inputType="number"
            onSave={async (value) => {
              await handleUpdateField(product.id, "warehouseStock", value)
            }}
          />
        )
      },
      filterFn: "inNumberRange",
    },
    {
      accessorKey: "shopStock",
      header: "Shop Stock",
      cell: ({ row }) => {
        const product = row.original
        return (
          <EditableCell
            value={product.shopStock}
            inputType="number"
            onSave={async (value) => {
              await handleUpdateField(product.id, "shopStock", value)
            }}
          />
        )
      },
      filterFn: "inNumberRange",
    },
    {
      accessorKey: "lowStockThreshold",
      header: "Low Stock Threshold",
      cell: ({ row }) => {
        const product = row.original
        return (
          <EditableCell
            value={product.lowStockThreshold}
            inputType="number"
            onSave={async (value) => {
              await handleUpdateField(product.id, "lowStockThreshold", value)
            }}
          />
        )
      },
      filterFn: "inNumberRange",
    },
    {
      accessorKey: "stockStatus",
      header: "Stock Status",
      cell: ({ row }) => {
        const product = row.original
        const totalStock = product.warehouseStock + product.shopStock

        if (totalStock <= 0) {
          return <Badge variant="destructive">Out of Stock</Badge>
        } else if (totalStock <= product.lowStockThreshold) {
          return <Badge variant="warning">Low Stock</Badge>
        } else {
          return <Badge variant="success">In Stock</Badge>
        }
      },
    },
    {
      accessorKey: "supplierId",
      header: "Supplier",
      cell: ({ row }) => {
        const product = row.original
        const supplierOptions = suppliers.map((supplier) => ({
          value: supplier.id,
          label: supplier.name,
        }))

        return (
          <EditableSelect
            value={product.supplierId}
            options={supplierOptions}
            onSave={async (value) => {
              await handleUpdateField(product.id, "supplierId", value)
            }}
            placeholder="Select supplier"
          />
        )
      },
      filterFn: "includesString",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const product = row.original

        return (
          <div className="flex items-center justify-end gap-2">
            <Dialog
              open={transferringProduct?.id === product.id}
              onOpenChange={(open) => !open && setTransferringProduct(null)}
            >
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setTransferringProduct(product)}>
                  <ArrowLeftRight className="h-4 w-4" />
                  <span className="sr-only">Transfer Stock</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer Stock - {product.name}</DialogTitle>
                </DialogHeader>
                <ScrollableDialogBody>
                  {transferringProduct && (
                    <StockTransferForm
                      product={transferringProduct}
                      onSubmit={(quantity, from, to) => handleTransferStock(product.id, quantity, from, to)}
                      onCancel={() => setTransferringProduct(null)}
                      isLoading={isLoading}
                    />
                  )}
                </ScrollableDialogBody>
              </DialogContent>
            </Dialog>

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
                    This action cannot be undone. This will permanently delete the product and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(product)} disabled={isLoading}>
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
  const totalProducts = products.length
  const totalWarehouseStock = products.reduce((sum, product) => sum + product.warehouseStock, 0)
  const totalShopStock = products.reduce((sum, product) => sum + product.shopStock, 0)
  const lowStockProducts = products.filter(
    (product) => product.warehouseStock + product.shopStock <= product.lowStockThreshold,
  ).length

  // Update the totals row to match our column structure with the new pricing model
  const totalsRow = (
    <tr>
      <td className="p-2 font-medium sticky left-0 bg-background z-20">Total: {totalProducts}</td>
      <td className="p-2"></td> {/* Description */}
      <td className="p-2"></td> {/* Purchase Price */}
      <td className="p-2"></td> {/* Sale Price */}
      {/* Legacy Price column removed */}
      <td className="p-2">{totalWarehouseStock}</td> {/* Warehouse Stock */}
      <td className="p-2">{totalShopStock}</td> {/* Shop Stock */}
      <td className="p-2"></td> {/* Low Stock Threshold */}
      <td className="p-2">{lowStockProducts} low stock</td> {/* Stock Status */}
      <td className="p-2"></td> {/* Supplier */}
      <td className="p-2"></td> {/* Actions */}
    </tr>
  )

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <ScrollableDialogBody>
              <ProductForm
                suppliers={suppliers}
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
        data={products || []}
        showTotals={true}
        totalsRow={totalsRow}
        isLoading={isLoading}
      />
    </div>
  )
}
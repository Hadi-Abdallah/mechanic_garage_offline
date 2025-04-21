import { getProducts } from "@/lib/actions"
import { ProductsTable } from "@/components/products/products-table"
import { RefreshButton } from "@/components/refresh-button"

export default async function ProductsPage() {
  // Fetch products from the database
  const { success, data: products, error } = await getProducts()

  if (!success) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Products</h1>
          <RefreshButton />
        </div>
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
          Error loading products: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <RefreshButton />
      </div>
      <ProductsTable products={products || []} />
    </div>
  )
}


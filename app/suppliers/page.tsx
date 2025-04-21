import { getSuppliers } from "@/lib/actions"
import { SuppliersTable } from "@/components/suppliers/suppliers-table"
import { RefreshButton } from "@/components/refresh-button"

export default async function SuppliersPage() {
  // Fetch suppliers from the database
  const { success, data: suppliers, error } = await getSuppliers()

  if (!success) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <RefreshButton />
        </div>
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
          Error loading suppliers: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Suppliers</h1>
        <RefreshButton />
      </div>
      <SuppliersTable suppliers={suppliers || []} />
    </div>
  )
}


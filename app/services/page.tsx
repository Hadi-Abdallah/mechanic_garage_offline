import { getServices } from "@/lib/actions"
import { ServicesTable } from "@/components/services/services-table"
import { RefreshButton } from "@/components/refresh-button"

export default async function ServicesPage() {
  // Fetch services from the database
  const { success, data: services, error } = await getServices()

  if (!success) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Services</h1>
          <RefreshButton />
        </div>
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
          Error loading services: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Services</h1>
        <RefreshButton />
      </div>
      <ServicesTable services={services || []} />
    </div>
  )
}


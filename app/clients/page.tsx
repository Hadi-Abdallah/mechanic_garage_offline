import { getClients } from "@/lib/actions"
import { ClientsTable } from "@/components/clients/clients-table"
import { RefreshButton } from "@/components/refresh-button"

export default async function ClientsPage() {
  // Fetch clients from the database
  const { success, data: clients, error } = await getClients()

  if (!success) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Clients</h1>
          <RefreshButton />
        </div>
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
          Error loading clients: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        <RefreshButton />
      </div>
      <ClientsTable clients={clients || []} />
    </div>
  )
}


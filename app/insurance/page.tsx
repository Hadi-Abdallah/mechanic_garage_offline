import { getInsuranceCompanies } from "@/lib/actions"
import { InsuranceTable } from "@/components/insurance/insurance-table"
import { RefreshButton } from "@/components/refresh-button"

export default async function InsurancePage() {
  // Fetch insurance companies from the database
  const { success, data: insuranceCompanies, error } = await getInsuranceCompanies()

  if (!success) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Insurance Companies</h1>
          <RefreshButton />
        </div>
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
          Error loading insurance companies: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Insurance Companies</h1>
        <RefreshButton />
      </div>
      <InsuranceTable insuranceCompanies={insuranceCompanies || []} />
    </div>
  )
}


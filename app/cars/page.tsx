import { getCars } from "@/lib/actions"
import { CarsPageClient } from "@/components/cars/cars-page-client"

export default async function CarsPage() {
  // Fetch cars from the database
  const { success, data: cars, error } = await getCars()

  if (!success) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Cars</h1>
        </div>
        <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive">
          Error loading cars: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Cars</h1>
      <CarsPageClient initialCars={cars || []} />
    </div>
  )
}


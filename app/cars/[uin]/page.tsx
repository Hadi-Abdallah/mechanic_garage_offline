import { notFound } from "next/navigation"
import { getCarWithMaintenanceHistory } from "@/lib/actions"
import { CarDetails } from "@/components/cars/car-details"

export default async function CarDetailPage({
  params,
}: {
  params: { uin: string }
}) {
  const { uin } = params
  const { success, data, error } = await getCarWithMaintenanceHistory(uin)

  if (!success || !data) {
    return notFound()
  }

  return (
    <CarDetails
      car={data.car}
      client={data.client}
      insurance={data.insurance}
      maintenanceHistory={data.maintenanceHistory}
      stats={data.stats}
    />
  )
}


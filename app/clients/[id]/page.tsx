import { notFound } from "next/navigation";
import { getClientWithCars, getClientWithRequests } from "@/lib/actions";
import { ClientDetails } from "@/components/clients/client-details";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { success, data, error } = await getClientWithCars(id);

  if (!success || !data) {
    return notFound();
  }

  const { success: maintenanceSuccess, data: maintenanceData, error: maintenanceError } = await getClientWithRequests(id);

  const maintenanceRequests = maintenanceSuccess && maintenanceData ? maintenanceData : [];

  return (
    <ClientDetails
      client={data.client}
      cars={data.cars}
      maintenanceRequests={maintenanceData} // Pass maintenance data to ClientDetails
      stats={data.stats}
    />
  );
}
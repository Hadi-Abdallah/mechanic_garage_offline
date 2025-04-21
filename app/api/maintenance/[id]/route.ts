import { getMaintenanceById, updateMaintenanceRequest, deleteMaintenanceRequest } from "@/lib/actions";
import { NextResponse } from "next/server";

// Interface for route params
interface RouteParams {
  params: {
    id: string;
  };
}

// GET handler to retrieve a specific maintenance request
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const response = await getMaintenanceById(id);
    
    if (response.success) {
      return NextResponse.json({ success: true, data: response.data });
    } else {
      return NextResponse.json(
        { success: false, error: response.error || "Failed to fetch maintenance request" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching maintenance request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT handler to update a specific maintenance request
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const data = await request.json();
    const response = await updateMaintenanceRequest(id, data);
    
    if (response.success) {
      return NextResponse.json({ success: true, data: response.data });
    } else {
      return NextResponse.json(
        { success: false, error: response.error || "Failed to update maintenance request" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error updating maintenance request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE handler to delete a specific maintenance request
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const response = await deleteMaintenanceRequest(id);
    
    if (response.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: response.error || "Failed to delete maintenance request" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error deleting maintenance request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
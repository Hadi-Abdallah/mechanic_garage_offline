import { getMaintenanceRequests, createMaintenanceRequest } from "@/lib/actions";
import { NextResponse } from "next/server";

// GET handler to retrieve all maintenance requests
export async function GET() {
  try {
    const response = await getMaintenanceRequests();
    
    if (response.success) {
      return NextResponse.json({ success: true, data: response.data });
    } else {
      return NextResponse.json(
        { success: false, error: response.error || "Failed to fetch maintenance requests" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching maintenance requests:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST handler to create a new maintenance request
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const response = await createMaintenanceRequest(data);
    
    if (response.success) {
      return NextResponse.json({ success: true, data: response.data });
    } else {
      return NextResponse.json(
        { success: false, error: response.error || "Failed to create maintenance request" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error creating maintenance request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";

// Simple ping endpoint to check server connectivity
export async function GET() {
  return NextResponse.json({ 
    success: true, 
    timestamp: new Date().toISOString() 
  });
}

// HEAD method for efficient connection testing
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
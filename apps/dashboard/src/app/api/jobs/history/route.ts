import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:8080";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const githubUsername = searchParams.get('githubUsername');
    
    if (!githubUsername) {
      return NextResponse.json(
        { error: "githubUsername is required" },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_URL}/jobs/history?githubUsername=${encodeURIComponent(githubUsername)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json(
        { error: "API request failed", details: error },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to connect to API", details: message },
      { status: 502 }
    );
  }
}

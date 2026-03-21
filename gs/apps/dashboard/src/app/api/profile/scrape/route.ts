import { NextResponse } from 'next/server';

// API_URL is server-side only — no NEXT_PUBLIC_ needed for API routes
const API_URL = process.env.API_URL || 'http://localhost:8080';

export async function POST(request: Request) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    console.log(`[ScrapeProxy] Proxying ${urls.length} URLs → ${API_URL}/profile/scrape`);

    const response = await fetch(`${API_URL}/profile/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[ScrapeProxy] Backend error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to process URL scraping' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[ScrapeProxy] Unexpected error:', error.message);
    return NextResponse.json(
      { error: `Scrape proxy failed: ${error.message}` },
      { status: 500 }
    );
  }
}

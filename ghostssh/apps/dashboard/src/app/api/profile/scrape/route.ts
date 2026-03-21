import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    console.log(`Proxying Jina URL scrape to ${backendUrl}/profile/scrape`);

    const response = await fetch(`${backendUrl}/profile/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Fastify scrape error details:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to process URL scraping' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Scrape proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error during scrape proxy' },
      { status: 500 }
    );
  }
}

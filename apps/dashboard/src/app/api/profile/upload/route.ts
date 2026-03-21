import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Proxy the exact same FormData to the Fastify backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    console.log(`Proxying LinkedIn ZIP upload to ${backendUrl}/profile/upload`);

    const response = await fetch(`${backendUrl}/profile/upload`, {
      method: 'POST',
      body: backendFormData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Fastify upload error details:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to process LinkedIn upload' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('LinkedIn upload proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error during upload proxy' },
      { status: 500 }
    );
  }
}

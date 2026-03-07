import { NextResponse } from 'next/server';
import { addListing, getListingById, getListings } from '@/lib/registryStore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const listing = getListingById(id);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    return NextResponse.json({ listing });
  }

  return NextResponse.json({ listings: getListings() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const agentName = String(body?.agentName ?? '').trim();
    const service = String(body?.service ?? '').trim();
    const price = String(body?.price ?? '').trim();
    const currency = String(body?.currency ?? 'USDC').trim().toUpperCase();
    const endpointRaw = String(body?.endpoint ?? '').trim();
    const descriptionRaw = String(body?.description ?? '').trim();
    const capabilities = Array.isArray(body?.capabilities)
      ? body.capabilities.map((item: unknown) => String(item)).filter(Boolean)
      : undefined;

    if (!agentName || !service || !price) {
      return NextResponse.json(
        { error: 'agentName, service, and price are required' },
        { status: 400 }
      );
    }

    const listing = addListing({
      agentName,
      service,
      price,
      currency,
      endpoint: endpointRaw || undefined,
      description: descriptionRaw || undefined,
      capabilities,
    });

    return NextResponse.json({ status: 'LISTED', listing });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create listing' },
      { status: 500 }
    );
  }
}

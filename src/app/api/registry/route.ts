import { NextResponse } from 'next/server';
import { addListing, applyListingReview, getListingById, getListings } from '@/lib/registryStore';

const DEFAULT_WORKER = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const listing = await getListingById(id);

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    return NextResponse.json({ listing });
  }

  return NextResponse.json({ listings: await getListings() });

}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body?.action === 'REVIEW') {
      const listingId = body?.listingId ? String(body.listingId) : undefined;
      const workerAddress = body?.workerAddress ? (String(body.workerAddress).trim() as `0x${string}`) : undefined;
      const service = body?.service ? String(body.service).trim() : undefined;
      const reviewer = body?.reviewer ? (String(body.reviewer).trim() as `0x${string}`) : undefined;
      const rating = Number(body?.rating);
      const feedback = String(body?.feedback ?? '').trim();

      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400 });
      }

      if (!feedback) {
        return NextResponse.json({ error: 'feedback is required' }, { status: 400 });
      }

      const listing = await applyListingReview({

        listingId,
        workerAddress,
        service,
        rating,
        feedback,
        reviewer,
      });

      if (!listing) {
        return NextResponse.json({ error: 'Listing not found for review' }, { status: 404 });
      }

      return NextResponse.json({ status: 'REVIEW_SAVED', listing });
    }

    const agentName = String(body?.agentName ?? '').trim();
    const service = String(body?.service ?? '').trim();
    const price = String(body?.price ?? '').trim();
    const currency = String(body?.currency ?? 'ETH').trim().toUpperCase();
    const workerAddress = String(body?.workerAddress ?? DEFAULT_WORKER).trim() as `0x${string}`;
    const endpointRaw = String(body?.endpoint ?? '').trim();
    const descriptionRaw = String(body?.description ?? '').trim();
    const capabilities = Array.isArray(body?.capabilities)
      ? body.capabilities.map((item: unknown) => String(item)).filter(Boolean)
      : undefined;

    const completedJobsRaw = body?.completedJobs;
    const completedJobs =
      completedJobsRaw === undefined || completedJobsRaw === null || completedJobsRaw === ''
        ? 0
        : Number(completedJobsRaw);

    const ratingRaw = body?.rating;
    const rating =
      ratingRaw === undefined || ratingRaw === null || ratingRaw === '' || ratingRaw === 'N/A'
        ? null
        : Number(ratingRaw);

    if (!agentName || !service || !price) {
      return NextResponse.json(
        { error: 'agentName, service, and price are required' },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(workerAddress)) {
      return NextResponse.json({ error: 'workerAddress must be a valid EVM address' }, { status: 400 });
    }

    if (!Number.isFinite(completedJobs) || completedJobs < 0) {
      return NextResponse.json({ error: 'completedJobs must be a non-negative integer' }, { status: 400 });
    }

    if (rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'rating must be between 1 and 5 or omitted' }, { status: 400 });
    }

    const listing = await addListing({
      agentName,
      service,
      price,
      currency,
      workerAddress,
      endpoint: endpointRaw || undefined,
      description: descriptionRaw || undefined,
      capabilities,
      completedJobs: Math.floor(completedJobs),
      rating,
    });

    return NextResponse.json({ status: 'LISTED', listing });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create listing' },
      { status: 500 }
    );
  }
}

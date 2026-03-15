import { NextResponse } from 'next/server';
import { getListingById, getGenesisMeta } from '@/lib/registryStore';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const listing = await getListingById(id);

    if (!listing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const genesis = getGenesisMeta(listing);

    return NextResponse.json({
      agentId: listing.id,
      agentName: listing.agentName,
      completedJobs: listing.completedJobs,
      rating: listing.rating,
      reviewCount: listing.reviewCount,
      platformFee: genesis.platformFee,
      hasGenesisBadge: genesis.hasGenesisBadge,
      feeFreeUntil: genesis.feeFreeUntil,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reputation' },
      { status: 500 }
    );
  }
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { findRegistryListingById, type RegistryListing } from '@/lib/registry';

type Listing = RegistryListing;

export default function AgentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setListing(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const found = findRegistryListingById(id);
    setListing(found);
    setLoading(false);
  }, [id]);

  const hireHref = useMemo(() => {
    if (!listing) return '/dashboard';
    return `/dashboard?worker=${encodeURIComponent(listing.workerAddress)}&service=${encodeURIComponent(
      listing.service
    )}&price=${encodeURIComponent(listing.price)}&currency=${encodeURIComponent(listing.currency)}`;
  }, [listing]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-6 py-14 text-[#ededed]">
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-800 bg-[#0d0d14] p-8">
          Loading agent profile...
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-6 py-14 text-[#ededed]">
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-800 bg-[#0d0d14] p-8">
          <h1 className="text-2xl font-semibold">Agent not found</h1>
          <p className="mt-2 text-gray-400">This listing does not exist in local registry storage.</p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:text-white"
          >
            Back to Marketplace
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-6 py-14 text-[#ededed]">
      <div className="mx-auto max-w-4xl rounded-2xl border border-gray-800 bg-[#0d0d14] p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Agent Profile</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{listing.agentName}</h1>
            <p className="mt-2 text-gray-400">{listing.service}</p>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-300">
                {listing.rating === null ? 'No Ratings' : `Rating: ${Number(listing.rating).toFixed(1)}`}
              </span>
              <span className="rounded border border-green-500/30 bg-green-500/10 px-3 py-1 text-green-300">
                Jobs Done: {listing.completedJobs ?? 0}
              </span>
            </div>
          </div>
          <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-300">
            {listing.price} ETH
          </span>
        </div>

        {listing.description && (
          <p className="mb-6 rounded-lg border border-gray-800 bg-black p-4 text-sm text-gray-300">
            {listing.description}
          </p>
        )}

        {listing.capabilities && listing.capabilities.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-gray-500">Capabilities</p>
            <div className="flex flex-wrap gap-2">
              {listing.capabilities.map((capability) => (
                <span
                  key={capability}
                  className="rounded border border-gray-700 bg-black px-3 py-1 text-xs text-gray-300"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 rounded-lg border border-gray-800 bg-black p-4 text-sm text-gray-300">
          <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Worker Wallet</p>
          <p className="mt-1 break-all font-mono text-xs text-indigo-400">{listing.workerAddress}</p>
        </div>

        {listing.endpoint && (
          <div className="mb-8">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-gray-500">Agent Endpoint</p>
            <a
              href={listing.endpoint}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm text-indigo-400 underline"
            >
              {listing.endpoint}
            </a>
          </div>
        )}

        <div className="rounded-lg border border-gray-800 bg-black p-4 text-sm text-gray-300">
          Hire flow: Agent A discovers this profile in local registry, opens dashboard with prefilled
          job + price + worker, creates vault, then Agent B submits proof via <code>/api/verify</code>
          for settlement.
        </div>

        <div className="mt-8 flex gap-3">
          <Link
            href={hireHref}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Hire via Dashboard
          </Link>
          <Link
            href="/marketplace"
            className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:text-white"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    </main>
  );
}


import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getListingById } from '@/lib/registryStore';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AgentProfilePage({ params }: Props) {
  const { id } = await params;
  const listing = getListingById(id);

  if (!listing) {
    notFound();
  }

  const hireHref = `/dashboard?worker=${encodeURIComponent(listing.workerAddress)}&service=${encodeURIComponent(
    listing.service
  )}&price=${encodeURIComponent(listing.price)}&currency=${encodeURIComponent(listing.currency)}`;

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-6 py-14 text-[#ededed]">
      <div className="mx-auto max-w-4xl rounded-2xl border border-gray-800 bg-[#0d0d14] p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Agent Profile</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{listing.agentName}</h1>
            <p className="mt-2 text-gray-400">{listing.service}</p>
          </div>
          <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-300">
            {listing.price} {listing.currency}
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
          Hire flow: Agent A discovers this profile via <code>/api/registry</code>, opens dashboard
          with prefilled job + price + worker, creates vault, then Agent B submits proof via
          <code>/api/verify</code> for settlement.
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

'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getGenesisMeta,
  type RegistryListing,
} from '@/lib/registry';

type Listing = RegistryListing;

type LiveVault = {
  vaultAddress: `0x${string}`;
  status: 'ACTIVE' | 'SETTLED';
  completedMilestones: number;
  milestonesCount: number;
  explorerUrl: string;
};

type LiveAgentJobBoardProps = {
  mode?: 'featured' | 'full';
};

export default function LiveAgentJobBoard({ mode = 'featured' }: LiveAgentJobBoardProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [vaults, setVaults] = useState<LiveVault[]>([]);
  const [form, setForm] = useState({
    agentName: '',
    service: '',
    description: '',
    payoutWallet: '',
    price: '',
    endpoint: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const visibleListings = useMemo(
    () => (mode === 'featured' ? listings.slice(0, 4) : listings),
    [listings, mode]
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const listingsRes = await fetch('/api/registry', { cache: 'no-store' });
        const listingsJson = await listingsRes.json();
        const vaultsRes = await fetch('/api/live-vaults', { cache: 'no-store' });
        const vaultsJson = await vaultsRes.json();

        if (!mounted) return;

        setListings(Array.isArray(listingsJson?.listings) ? listingsJson.listings : []);
        setVaults(Array.isArray(vaultsJson?.jobs) ? vaultsJson.jobs : []);
      } catch {
        if (mounted) setMessage('Unable to refresh live feeds right now.');
      }
    };

    load();
    const timer = setInterval(load, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!form.agentName.trim() || !form.service.trim() || !form.price.trim()) {
      setMessage('agentName, service, and price are required');
      return;
    }

    if (!form.description.trim()) {
      setMessage('Service description is required');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(form.payoutWallet.trim())) {
      setMessage('Payout wallet address must be a valid EVM address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: form.agentName.trim(),
          service: form.service.trim(),
          description: form.description.trim(),
          price: form.price.trim(),
          currency: 'ETH',
          endpoint: form.endpoint.trim() || undefined,
          capabilities: [],
          workerAddress: form.payoutWallet.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok || payload?.status !== 'LISTED' || !payload?.listing) {
        throw new Error(payload?.error ?? 'Listing failed');
      }

      const listing = payload.listing as Listing;

      setListings((prev) => [listing, ...prev]);
      setForm({
        agentName: '',
        service: '',
        description: '',
        payoutWallet: '',
        price: '',
        endpoint: '',
      });
      setMessage('Service listed on the machine marketplace.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Listing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="marketplace" className="mb-16 w-full rounded-2xl border border-gray-800 bg-[#0d0d14] p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Live Agent Job Board</h2>
        <span className="text-xs uppercase tracking-[0.16em] text-gray-500">refresh: 10s</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-gray-400">
            Marketplace Listings {mode === 'featured' ? '(Top 4)' : '(All)'}
          </h3>
          <div className="space-y-2">
            {visibleListings.length === 0 ? (
              <div className="rounded-lg border border-gray-800 bg-black p-4 text-sm text-gray-500">
                No listings yet.
              </div>
            ) : (
              visibleListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/marketplace/agent/${listing.id}`}
                  className="block rounded-lg border border-gray-800 bg-black p-4 transition-colors hover:border-indigo-500/60"
                >
                  {(() => {
                    const genesis = getGenesisMeta(listing);
                    return (
                      <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-white">{listing.service}</p>
                    <span className="text-xs text-indigo-400">{listing.price} ETH</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                    <span>by {listing.agentName}</span>
                    {genesis.hasGenesisBadge && (
                      <span className="genesis-badge" data-tooltip="Genesis Agent: 0% Platform Fees for 30 Days">
                        <span className="genesis-badge__star" aria-hidden="true">
                          G
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-semibold">
                    <span className="text-amber-300">
                      {listing.rating === null ? 'No Ratings' : `Rating: ${Number(listing.rating).toFixed(1)}`}
                    </span>
                    <span className="text-green-300">Completed Jobs: {listing.completedJobs ?? 0}</span>
                    <span className="text-indigo-300">Platform Fee: {genesis.platformFee}%</span>
                  </div>
                  {listing.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{listing.description}</p>
                  )}
                  <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-indigo-400 underline">
                    Open agent profile
                  </p>
                      </>
                    );
                  })()}
                </Link>
              ))
            )}
          </div>

          {mode === 'featured' && (
            <div className="mt-4 text-center">
              <Link
                href="/marketplace"
                className="inline-flex w-full justify-center rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/20 sm:w-auto"
              >
                View All Agents
              </Link>
            </div>
          )}

          {mode === 'full' && (
            <form onSubmit={onSubmit} className="mt-5 space-y-2 rounded-lg border border-gray-800 bg-black p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500">List Service</p>
              <input
                value={form.agentName}
                onChange={(e) => setForm((f) => ({ ...f, agentName: e.target.value }))}
                placeholder="Agent name"
                className="w-full rounded border border-gray-700 bg-[#0a0a0f] px-3 py-2 text-sm"
              />
              <input
                value={form.service}
                onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                placeholder="Service (e.g. Python Debugging)"
                className="w-full rounded border border-gray-700 bg-[#0a0a0f] px-3 py-2 text-sm"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Service description"
                rows={3}
                className="w-full rounded border border-gray-700 bg-[#0a0a0f] px-3 py-2 text-sm"
              />
              <input
                value={form.payoutWallet}
                onChange={(e) => setForm((f) => ({ ...f, payoutWallet: e.target.value }))}
                placeholder="Payout Wallet Address (0x...)"
                className="w-full rounded border border-gray-700 bg-[#0a0a0f] px-3 py-2 text-sm"
                required
              />
              <input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="Price in ETH (e.g. 0.001)"
                className="w-full rounded border border-gray-700 bg-[#0a0a0f] px-3 py-2 text-sm"
              />
              <input
                value={form.endpoint}
                onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
                placeholder="Callback endpoint (optional)"
                className="w-full rounded border border-gray-700 bg-[#0a0a0f] px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500">Currency: ETH only. New agents start with: No Ratings, 0 Jobs.</p>
              <button
                disabled={loading}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Listing...' : 'List on Registry'}
              </button>
              {message && <p className="text-xs text-gray-400">{message}</p>}
            </form>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-gray-400">
            On-chain Vault Activity
          </h3>
          <div className="space-y-2">
            {vaults.length === 0 ? (
              <div className="rounded-lg border border-gray-800 bg-black p-4 text-sm text-gray-500">
                No vaults observed.
              </div>
            ) : (
              vaults.map((job) => (
                <div key={job.vaultAddress} className="rounded-lg border border-gray-800 bg-black p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-indigo-400">
                      {job.vaultAddress.slice(0, 8)}...{job.vaultAddress.slice(-6)}
                    </span>
                    <span className={`text-xs ${job.status === 'SETTLED' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {job.completedMilestones}/{job.milestonesCount} milestones completed
                  </p>
                  <a href={job.explorerUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-indigo-400 underline">
                    View on BaseScan
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

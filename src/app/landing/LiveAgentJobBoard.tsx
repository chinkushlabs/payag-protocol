'use client';

import { FormEvent, useEffect, useState } from 'react';

type Listing = {
  id: string;
  agentName: string;
  service: string;
  price: string;
  currency: string;
  endpoint?: string;
  status: 'OPEN' | 'PAUSED';
  createdAt: string;
};

type LiveVault = {
  vaultAddress: `0x${string}`;
  status: 'ACTIVE' | 'SETTLED';
  completedMilestones: number;
  milestonesCount: number;
  explorerUrl: string;
};

export default function LiveAgentJobBoard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [vaults, setVaults] = useState<LiveVault[]>([]);
  const [form, setForm] = useState({
    agentName: '',
    service: '',
    price: '',
    currency: 'USDC',
    endpoint: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [registryRes, vaultsRes] = await Promise.all([
          fetch('/api/registry', { cache: 'no-store' }),
          fetch('/api/live-vaults', { cache: 'no-store' }),
        ]);

        const registryJson = await registryRes.json();
        const vaultsJson = await vaultsRes.json();

        if (!mounted) return;

        setListings(Array.isArray(registryJson?.listings) ? registryJson.listings : []);
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

    setLoading(true);
    try {
      const res = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: form.agentName,
          service: form.service,
          price: form.price,
          currency: form.currency,
          endpoint: form.endpoint,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Listing failed');

      setListings((prev) => [json.listing, ...prev]);
      setForm({ agentName: '', service: '', price: '', currency: 'USDC', endpoint: '' });
      setMessage('Service listed on the machine marketplace.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Listing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-16 rounded-2xl border border-gray-800 bg-[#0d0d14] p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Live Agent Job Board</h2>
        <span className="text-xs uppercase tracking-[0.16em] text-gray-500">refresh: 10s</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-gray-400">
            Marketplace Listings
          </h3>
          <div className="space-y-2">
            {listings.length === 0 ? (
              <div className="rounded-lg border border-gray-800 bg-black p-4 text-sm text-gray-500">
                No listings yet.
              </div>
            ) : (
              listings.map((listing) => (
                <div key={listing.id} className="rounded-lg border border-gray-800 bg-black p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">{listing.service}</p>
                    <span className="text-xs text-indigo-400">
                      {listing.price} {listing.currency}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">by {listing.agentName}</p>
                  {listing.endpoint && (
                    <p className="mt-1 truncate text-xs text-gray-500">{listing.endpoint}</p>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-2 rounded-lg border border-gray-800 bg-black p-4">
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
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="Price"
                className="w-full rounded border border-gray-700 bg-[#0a0a0f] px-3 py-2 text-sm"
              />
              <input
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                placeholder="Currency"
                className="w-full rounded border border-gray-700 bg-[#0a0a0f] px-3 py-2 text-sm"
              />
            </div>
            <input
              value={form.endpoint}
              onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
              placeholder="Callback endpoint (optional)"
              className="w-full rounded border border-gray-700 bg-[#0a0a0f] px-3 py-2 text-sm"
            />
            <button
              disabled={loading}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Listing...' : 'List on Registry'}
            </button>
            {message && <p className="text-xs text-gray-400">{message}</p>}
          </form>
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
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-indigo-400">
                      {job.vaultAddress.slice(0, 8)}...{job.vaultAddress.slice(-6)}
                    </span>
                    <span
                      className={`text-xs ${
                        job.status === 'SETTLED' ? 'text-green-400' : 'text-yellow-400'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {job.completedMilestones}/{job.milestonesCount} milestones completed
                  </p>
                  <a
                    href={job.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-indigo-400 underline"
                  >
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

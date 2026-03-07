'use client';

import { useEffect, useState } from 'react';

type ProtocolStatus = {
  factoryAddress: `0x${string}`;
  totalVaults: number;
  lockedVaults: number;
  releasedVaults: number;
  tvlEth: string;
};

export default function ProtocolStatusPanel({ initial }: { initial: ProtocolStatus }) {
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch('/api/protocol-status', { cache: 'no-store' });
        const json = await res.json();
        if (!mounted || !res.ok || !json?.status) return;
        setStatus(json.status as ProtocolStatus);
      } catch {
        // keep previous status
      }
    };

    const timer = setInterval(load, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <aside className="rounded-2xl border border-gray-800 bg-[#0d0d14] p-6">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
        Protocol Status
      </h2>
      <dl className="grid grid-cols-2 gap-y-4 text-sm">
        <dt className="text-gray-500">Factory</dt>
        <dd className="truncate text-right font-mono text-gray-200">{status.factoryAddress}</dd>

        <dt className="text-gray-500">Vaults</dt>
        <dd className="text-right text-gray-200">{status.totalVaults}</dd>

        <dt className="text-gray-500">Locked</dt>
        <dd className="text-right text-gray-200">{status.lockedVaults}</dd>

        <dt className="text-gray-500">Released</dt>
        <dd className="text-right text-gray-200">{status.releasedVaults}</dd>

        <dt className="text-gray-500">TVL</dt>
        <dd className="text-right text-indigo-400">{status.tvlEth} ETH</dd>
      </dl>
      <p className="mt-4 text-right text-[10px] uppercase tracking-[0.16em] text-gray-500">
        Auto-refresh: 10s
      </p>
    </aside>
  );
}

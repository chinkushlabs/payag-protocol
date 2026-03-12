'use client';

import { useEffect, useMemo, useState } from 'react';

type ActivityItem = {
  message: string;
  actor: 'SYSTEM' | 'WORKER' | 'ARBITER' | 'BUYER';
  createdAt: string;
};

type PendingSubmission = {
  id: string;
  vaultAddress: `0x${string}`;
  milestoneIndex: number;
  proofString: string;
  buyerTaskHash: `0x${string}` | null;
  createdAt: string;
  status: 'AWAITING_ARBITER_RELEASE' | 'DISPUTED';
  disputeReason?: string;
  buyer: `0x${string}` | null;
  workerAddress: `0x${string}` | null;
  service: string | null;
  activityLog: ActivityItem[];
};

export default function AdminVerifyPage() {
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [inFlightId, setInFlightId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPending = async () => {
    try {
      setLoadError(null);
      const res = await fetch(`/api/admin/verify?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Non-JSON response: ${text.slice(0, 180)}`);
      }

      if (!res.ok) {
        throw new Error(json?.error ?? `Admin API failed: ${res.status}`);
      }

      setPending(Array.isArray(json?.pending) ? json.pending : []);
    } catch (err) {
      setPending([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load pending submissions');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadPending();
    const timer = setInterval(loadPending, 10000);
    return () => clearInterval(timer);
  }, []);

  const pendingCount = useMemo(() => pending.length, [pending]);

  const runAction = async (submissionId: string, action: 'RELEASE' | 'REFUND') => {
    setInFlightId(submissionId);
    setMessage(null);

    try {
      const payload: Record<string, string> = { submissionId, action };
      if (action === 'REFUND') {
        const note = window.prompt('Refund note (reason):', 'Dispute accepted by arbiter') || '';
        payload.note = note;
      }

      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `${action} failed`);

      setMessage(
        action === 'RELEASE'
          ? `Released successfully. Tx: ${json?.txHash ?? 'n/a'}`
          : `Refund completed. Tx: ${json?.txHash ?? 'n/a'}`
      );
      await loadPending();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setInFlightId(null);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0a0a0f] px-4 py-8 text-[#ededed] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Arbiter Verification Console</h1>
        <p className="mt-2 text-sm text-gray-400">Pending reviews: {pendingCount}</p>

        {message && (
          <div className="mt-4 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
            {message}
          </div>
        )}
        {loadError && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {loadError}
          </div>
        )}

        <section className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4 text-sm text-gray-400">Loading pending submissions...</div>
          ) : pending.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4 text-sm text-gray-400">No submissions awaiting arbiter release.</div>
          ) : (
            pending.map((item) => (
              <article key={item.id} className="rounded-xl border border-gray-800 bg-[#0d0d14] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs text-indigo-400">
                    {item.vaultAddress.slice(0, 10)}...{item.vaultAddress.slice(-8)}
                  </p>
                  <span
                    className={`rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      item.status === 'DISPUTED'
                        ? 'border-red-500/40 bg-red-500/10 text-red-300'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {item.disputeReason && (
                  <p className="mt-2 rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
                    Dispute reason: {item.disputeReason}
                  </p>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-gray-800 bg-black p-3">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-gray-500">Buyer Task Hash</p>
                    <pre className="max-w-full overflow-x-auto text-xs text-gray-300">
                      <code>{item.buyerTaskHash ?? 'N/A'}</code>
                    </pre>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-black p-3">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-gray-500">Worker Proof Payload</p>
                    <pre className="max-h-36 max-w-full overflow-auto text-xs text-gray-300">
                      <code>{item.proofString}</code>
                    </pre>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  {item.service ? `Service: ${item.service} - ` : ''}
                  Milestone: {item.milestoneIndex} - Submitted: {new Date(item.createdAt).toLocaleString()}
                </div>

                <div className="mt-3 rounded-lg border border-gray-800 bg-black p-3">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-gray-500">Activity Log</p>
                  <div className="space-y-1">
                    {(item.activityLog ?? []).slice(0, 5).map((log, idx) => (
                      <p key={`${item.id}-log-${idx}`} className="text-xs text-gray-300">
                        [{new Date(log.createdAt).toLocaleTimeString()}] {log.actor}: {log.message}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => runAction(item.id, 'RELEASE')}
                    disabled={inFlightId === item.id}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 sm:w-auto"
                  >
                    {inFlightId === item.id ? 'Processing...' : 'Release Payout'}
                  </button>
                  <button
                    onClick={() => runAction(item.id, 'REFUND')}
                    disabled={inFlightId === item.id}
                    className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50 sm:w-auto"
                  >
                    {inFlightId === item.id ? 'Processing...' : 'Refund Buyer'}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

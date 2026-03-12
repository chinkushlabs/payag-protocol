import LiveAgentJobBoard from '@/app/landing/LiveAgentJobBoard';

export default function MarketplacePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0a0a0f] px-4 py-10 text-[#ededed] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-4xl font-semibold tracking-tight">Machine Marketplace</h1>
        <p className="mb-8 text-gray-400">Browse all registered agents with rating, completed jobs, pricing, and service details.</p>
        <LiveAgentJobBoard mode="full" />
      </div>
    </main>
  );
}


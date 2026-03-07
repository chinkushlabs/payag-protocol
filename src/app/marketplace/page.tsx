import LiveAgentJobBoard from '@/app/landing/LiveAgentJobBoard';

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] px-6 py-14 text-[#ededed]">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-4xl font-semibold tracking-tight">Machine Marketplace</h1>
        <LiveAgentJobBoard />
      </div>
    </main>
  );
}

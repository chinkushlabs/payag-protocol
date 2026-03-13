import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 py-6 text-[#f5efe6] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-7 inline-block text-[2rem] font-extrabold tracking-[-0.04em] text-white no-underline"
        >
          Pay<span className="text-indigo-500">AG</span>
        </Link>

        <section className="rounded-3xl border border-indigo-500/20 bg-[linear-gradient(180deg,rgba(13,13,20,0.98),rgba(9,11,18,0.98))] p-9 shadow-[0_22px_80px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/15 px-3 py-2 text-[0.78rem] uppercase tracking-[0.18em] text-[#c7cbff]">
            About
          </div>

          <h1 className="mb-4 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.06] tracking-[-0.04em]">
            The trust layer for AI commerce
          </h1>

          <p className="mb-4 text-base leading-8 text-[#9aa4bf]">
            PayAG is building the <span className="font-semibold text-white">trust layer for AI commerce</span> on Base,
            combining programmable escrow with human-reviewed settlement so buyers and worker agents can transact with less
            counterparty risk.
          </p>

          <p className="mb-4 text-base leading-8 text-[#9aa4bf]">
            As autonomous agents begin to buy services, outsource work, and coordinate across tools, trust becomes the missing
            infrastructure. PayAG fills that gap with escrow, dispute routing, and arbiter-reviewed settlement logic.
          </p>

          <p className="mb-0 text-base leading-8 text-[#9aa4bf]">
            Our goal is to make machine-to-machine commerce more reliable across compute, data, APIs, code execution, research,
            and specialized digital work. The current beta runs on{' '}
            <span className="font-semibold text-white">Base Sepolia</span> while the protocol matures toward broader autonomous
            settlement.
          </p>

          <div className="mt-7 flex flex-wrap gap-3 max-sm:flex-col">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-indigo-500/20 bg-indigo-500 px-[18px] font-bold text-white"
            >
              Back to Home
            </Link>
            <Link
              href="/docs"
              className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-indigo-500/20 bg-transparent px-[18px] font-bold text-[#d7dcff]"
            >
              Read Docs
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

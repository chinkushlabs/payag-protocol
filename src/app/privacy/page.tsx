import Link from 'next/link';

export default function PrivacyPage() {
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
            Privacy Policy
          </div>

          <h1 className="mb-4 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.06] tracking-[-0.04em]">
            Your data, handled minimally
          </h1>

          <section className="mb-6">
            <h2 className="mb-2 text-base uppercase tracking-[0.06em] text-[#d9ddff]">What we collect</h2>
            <p className="text-base leading-8 text-[#9aa4bf]">
              PayAG is designed to keep data collection narrow. We may store wallet addresses involved in escrow workflows,
              voluntary contact details, and the minimum operational metadata required to route jobs, disputes, and arbiter
              actions.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-base uppercase tracking-[0.06em] text-[#d9ddff]">What we do not collect</h2>
            <p className="text-base leading-8 text-[#9aa4bf]">
              We do not request or store private keys, seed phrases, or wallet credentials. Wallet security remains entirely under
              user control.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-base uppercase tracking-[0.06em] text-[#d9ddff]">How information is used</h2>
            <p className="text-base leading-8 text-[#9aa4bf]">
              Data is used only to operate the protocol, improve reliability, respond to support questions, and maintain
              arbiter-reviewed escrow state during beta.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-base uppercase tracking-[0.06em] text-[#d9ddff]">Third-party infrastructure</h2>
            <p className="text-base leading-8 text-[#9aa4bf]">
              PayAG relies on third-party wallets, blockchain networks, hosting providers, and communications tooling. Public
              blockchain activity is inherently transparent and may be visible to others.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base uppercase tracking-[0.06em] text-[#d9ddff]">Contact</h2>
            <p className="text-base leading-8 text-[#9aa4bf]">
              For privacy questions, contact{' '}
              <a href="mailto:info@payag.ai" className="text-[#c7cbff] hover:text-white hover:underline">
                info@payag.ai
              </a>
              .
            </p>
          </section>

          <div className="mt-7 flex flex-wrap gap-3 max-sm:flex-col">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-indigo-500/20 bg-indigo-500 px-[18px] font-bold text-white"
            >
              Back to Home
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-indigo-500/20 bg-transparent px-[18px] font-bold text-[#d7dcff]"
            >
              Contact
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

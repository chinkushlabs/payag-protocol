import Link from 'next/link';

export default function TermsPage() {
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
            Terms of Service
          </div>

          <h1 className="mb-4 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.06] tracking-[-0.04em]">
            Simple rules for using PayAG
          </h1>

          <section className="mb-6">
            <h2 className="mb-2 text-base uppercase tracking-[0.06em] text-[#d9ddff]">Neutral escrow infrastructure</h2>
            <p className="text-base leading-8 text-[#9aa4bf]">
              PayAG provides neutral escrow and settlement infrastructure for users and autonomous agents transacting on Base. We
              operate the rails that hold, route, release, or refund funds under platform logic and arbiter-reviewed workflow
              rules.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-base uppercase tracking-[0.06em] text-[#d9ddff]">User responsibility</h2>
            <p className="text-base leading-8 text-[#9aa4bf]">
              Users remain responsible for the prompts, listings, counterparties, and services they choose to engage. PayAG does
              not guarantee the quality, legality, or reliability of third-party work product.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-base uppercase tracking-[0.06em] text-[#d9ddff]">Fees and promotions</h2>
            <p className="text-base leading-8 text-[#9aa4bf]">
              Standard successful settlements carry the active platform fee. Genesis Agents may receive reduced or zero-fee
              treatment according to the promotional terms visible on their listing at the time of registration.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-base uppercase tracking-[0.06em] text-[#d9ddff]">Disputes and arbitration</h2>
            <p className="text-base leading-8 text-[#9aa4bf]">
              During the current beta phase, PayAG uses a human-in-the-loop arbiter model. Arbiter decisions determine whether a
              vault is released or refunded when disputes or proof review questions arise.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-base uppercase tracking-[0.06em] text-[#d9ddff]">Wallet security</h2>
            <p className="text-base leading-8 text-[#9aa4bf]">
              PayAG never requests private keys or seed phrases. You are solely responsible for wallet security, approvals, and
              the confirmation of on-chain transactions.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base uppercase tracking-[0.06em] text-[#d9ddff]">Changes</h2>
            <p className="text-base leading-8 text-[#9aa4bf]">
              These terms may change as the protocol evolves. Continued use of PayAG after updates constitutes acceptance of the
              revised terms.
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
              href="/privacy"
              className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-indigo-500/20 bg-transparent px-[18px] font-bold text-[#d7dcff]"
            >
              Privacy Policy
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

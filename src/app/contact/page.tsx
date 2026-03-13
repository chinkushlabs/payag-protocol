import Link from 'next/link';

export default function ContactPage() {
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
            Contact
          </div>

          <h1 className="mb-4 text-[clamp(2rem,4vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.04em]">
            Reach the PayAG team
          </h1>

          <p className="mb-6 max-w-[720px] text-[1.05rem] leading-8 text-[#9aa4bf]">
            For partnerships, support, protocol questions, or testnet coordination, use the channels below. PayAG runs on Base
            Sepolia testnet and never requests seed phrases or wallet private keys.
          </p>

          <div className="grid gap-3.5">
            {[
              { label: 'Email', href: 'mailto:info@payag.ai', text: 'info@payag.ai' },
              { label: 'X', href: 'https://x.com/PayAG_AI', text: 'https://x.com/PayAG_AI' },
              { label: 'Discord', href: 'https://discord.gg/58SP2jdpyb', text: 'https://discord.gg/58SP2jdpyb' },
              { label: 'Telegram', href: 'https://t.me/payag_ai', text: 'https://t.me/payag_ai' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[18px] border border-white/5 bg-white/2 px-5 py-[18px]"
              >
                <span className="mb-2 block text-[0.74rem] uppercase tracking-[0.16em] text-[#9aa4bf]">{item.label}</span>
                <a
                  href={item.href}
                  target={item.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel={item.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                  className="break-words font-semibold text-white hover:text-[#c7cbff]"
                >
                  {item.text}
                </a>
              </div>
            ))}
          </div>

          <p className="mt-[18px] text-[0.92rem] leading-7 text-[#9aa4bf]">
            If you are reporting a wallet warning or need help with testnet activity, include the wallet name, your public
            address, and the vault address involved so the team can trace the flow quickly.
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
              Open Docs
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

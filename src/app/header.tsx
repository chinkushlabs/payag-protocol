import Link from 'next/link';
import LandingWalletButton from './landing/LandingWalletButton';

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-[#0a0a0f] px-4 py-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="https://www.payag.ai"
          className="text-[1.8rem] font-bold tracking-tighter hover:opacity-90 sm:text-[2rem]"
        >
          Pay<span className="text-indigo-500">AG</span>
        </Link>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <span className="inline-flex max-w-full items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-300" />
            <span className="hidden sm:inline">Running on Base Sepolia Testnet</span>
            <span className="sm:hidden">Base Sepolia Testnet</span>
          </span>
          <LandingWalletButton />
        </div>
      </div>
    </header>
  );
}

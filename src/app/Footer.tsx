import Link from 'next/link';

const socialLinks = [
  {
    href: 'https://discord.gg/58SP2jdpyb',
    label: 'Discord',
    icon: (
      <path d="M19.73 5.34A16.8 16.8 0 0 0 15.6 4a11.6 11.6 0 0 0-.53 1.08 15.6 15.6 0 0 0-4.14 0A11.6 11.6 0 0 0 10.4 4a16.73 16.73 0 0 0-4.14 1.35C3.65 9.28 2.94 13.1 3.3 16.88a16.9 16.9 0 0 0 5.08 2.6c.41-.56.78-1.15 1.1-1.76-.61-.23-1.2-.51-1.74-.84.15-.11.3-.23.45-.35a12.17 12.17 0 0 0 10.62 0c.15.12.3.24.45.35-.55.33-1.13.61-1.75.84.32.61.69 1.2 1.1 1.76a16.83 16.83 0 0 0 5.08-2.6c.43-4.38-.73-8.17-2.96-11.54ZM9.9 14.56c-.99 0-1.8-.92-1.8-2.04 0-1.13.8-2.04 1.8-2.04.99 0 1.81.92 1.8 2.04 0 1.12-.8 2.04-1.8 2.04Zm4.2 0c-.99 0-1.8-.92-1.8-2.04 0-1.13.8-2.04 1.8-2.04.99 0 1.81.92 1.8 2.04 0 1.12-.8 2.04-1.8 2.04Z" />
    ),
  },
  {
    href: 'https://x.com/PayAG_AI',
    label: 'X',
    icon: (
      <path d="M18.9 3H21l-4.58 5.23L21.8 21h-4.22l-3.3-4.34L10.5 21H8.4l4.9-5.6L3 3h4.33l2.98 3.93L18.9 3Zm-.74 16.7h1.16L6.7 4.2H5.46l12.7 15.5Z" />
    ),
  },
  {
    href: 'https://www.reddit.com/user/dapshots',
    label: 'Reddit',
    icon: (
      <path d="M20.4 13.5c0-.72-.58-1.3-1.3-1.3-.35 0-.66.14-.9.36-1.4-.97-3.28-1.6-5.38-1.67l.91-4.29 2.98.63a1.95 1.95 0 1 0 .2-.95l-3.34-.71a.49.49 0 0 0-.57.38l-1.02 4.81c-2.17.05-4.12.69-5.56 1.68a1.28 1.28 0 0 0-.87-.34 1.3 1.3 0 0 0-.43 2.52c-.02.15-.03.31-.03.46 0 2.54 2.94 4.61 6.56 4.61s6.56-2.07 6.56-4.61c0-.14-.01-.29-.03-.43a1.3 1.3 0 0 0 .98-1.25ZM8.9 14.8a1.06 1.06 0 1 1 0-2.12 1.06 1.06 0 0 1 0 2.12Zm5.43 2.58c-.73.73-2.13.78-2.58.78-.46 0-1.86-.05-2.59-.78a.36.36 0 0 1 .5-.5c.43.43 1.33.58 2.09.58.75 0 1.65-.15 2.08-.58a.36.36 0 1 1 .5.5Zm-.12-2.58a1.06 1.06 0 1 1 0-2.12 1.06 1.06 0 0 1 0 2.12Z" />
    ),
  },
  {
    href: 'https://t.me/payagai',
    label: 'Telegram',
    icon: (
      <path d="M20.67 4.33a1.14 1.14 0 0 0-1.16-.16L4.4 10.2a1.13 1.13 0 0 0 .1 2.13l3.83 1.2 1.48 4.66a1.13 1.13 0 0 0 1.98.35l2.13-2.75 3.63 2.67a1.13 1.13 0 0 0 1.8-.66l2.07-12.33a1.14 1.14 0 0 0-.75-1.14ZM9.27 12.97l7.8-4.92-6.09 6.18-.33 2.54-1.38-3.8Z" />
    ),
  },
  {
    href: 'mailto:info@payag.ai',
    label: 'Email',
    icon: (
      <path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h14.5A1.75 1.75 0 0 1 21 6.75v10.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25V6.75Zm1.6.11 6.97 5.51a.7.7 0 0 0 .86 0l6.97-5.5a.35.35 0 0 0-.21-.63H4.8a.35.35 0 0 0-.21.63Zm15.15 2.1-6.55 5.17a1.75 1.75 0 0 1-2.16 0L4.5 8.96v8.29c0 .14.11.25.25.25h14.5c.14 0 .25-.11.25-.25V8.96Z" />
    ),
  },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-[#0a0a0f] px-4 py-8 text-center text-sm text-gray-500 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {socialLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              target={item.href.startsWith('mailto:') ? undefined : '_blank'}
              rel={item.href.startsWith('mailto:') ? undefined : 'noreferrer'}
              aria-label={item.label}
              className="inline-flex items-center gap-2 rounded-full border border-gray-800 bg-[#0d0d14] px-4 py-2 text-gray-300 transition hover:border-indigo-500/50 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                {item.icon}
              </svg>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        <div>
          <span className="inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-300" />
            Running on Base Sepolia Testnet
          </span>
        </div>

        <div>© 2026 PayAG. All rights reserved.</div>
      </div>
    </footer>
  );
}

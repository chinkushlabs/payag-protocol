'use client';

type CopyCodeBlockProps = {
  code: string;
  title?: string;
};

export default function CopyCodeBlock({ code, title }: CopyCodeBlockProps) {
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // no-op
    }
  };

  return (
    <article>
      {title && (
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">{title}</h3>
      )}
      <div className="relative">
        <button
          onClick={onCopy}
          className="absolute right-2 top-2 rounded border border-gray-700 bg-[#0a0a0f] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-gray-300 hover:border-gray-500 hover:text-white"
        >
          Copy
        </button>
        <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black p-4 pr-16 text-xs text-gray-300">
          {code}
        </pre>
      </div>
    </article>
  );
}

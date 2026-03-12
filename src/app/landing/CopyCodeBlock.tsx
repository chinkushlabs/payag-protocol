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
    <article className="min-w-0">
      {title && (
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">{title}</h3>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-black">
        <div className="flex items-center justify-end border-b border-gray-800 px-2 py-2">
          <button
            onClick={onCopy}
            className="rounded border border-gray-700 bg-[#0a0a0f] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-gray-300 hover:border-gray-500 hover:text-white"
          >
            Copy
          </button>
        </div>
        <pre className="max-w-full overflow-x-auto p-4 text-xs text-gray-300">
          <code className="whitespace-pre">{code}</code>
        </pre>
      </div>
    </article>
  );
}

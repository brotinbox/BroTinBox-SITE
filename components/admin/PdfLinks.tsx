/**
 * "Download PDF" + "Printer copy" buttons for the cook book PDFs. Plain <a>
 * (not next/link): these are file downloads from a route handler.
 */
export function PdfLinks({ href, label = 'Download PDF' }: { href: string; label?: string }) {
  const withPrint = `${href}${href.includes('?') ? '&' : '?'}print=1`;
  return (
    <>
      <a href={href} download
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover transition-colors">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 2.5v7.5M4.75 7 8 10.25 11.25 7M3 13.25h10" />
        </svg>
        {label}
      </a>
      <a href={withPrint} download title="White background, saves printer ink"
        className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 transition-colors">
        Printer copy
      </a>
    </>
  );
}

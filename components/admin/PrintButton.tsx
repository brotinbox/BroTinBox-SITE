'use client';

export function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 print:hidden">
      {label}
    </button>
  );
}

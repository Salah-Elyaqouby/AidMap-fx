import { ReactNode } from 'react';

export function BrandedLayout({ children }: { children: ReactNode }) {
  return (
    <div
     
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4 py-10"
    >
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
        {children}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import brandLogo from "@/assets/ondetemm-logo-v2.png";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-[#f5f8fc] px-5 py-5 text-slate-900 sm:px-8 sm:py-7">
      <a
        href="/"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 text-sm text-slate-500 transition hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Voltar ao início
      </a>
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-8 sm:py-10">
        <a
          href="/"
          aria-label="Ondetemm — início"
          className="mx-auto mb-8 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <img src={brandLogo} alt="Ondetemm" className="h-16 w-56 object-contain" />
        </a>
        {children}
      </div>
    </main>
  );
}

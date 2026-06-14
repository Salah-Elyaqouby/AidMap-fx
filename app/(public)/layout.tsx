'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MapPin, Heart, Search, Shield, Menu, X, LogIn, LayoutDashboard } from 'lucide-react';
import { useSession } from 'next-auth/react';

const NAV_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/users/MapPreview', label: 'الخريطة' },
  { href: '/users/RegisterBeneficiary', label: 'تسجيل مستفيد' },
  { href: '/users/requestAid', label: 'طلب مساعدة' },
  { href: '/users/myAid', label: 'مساعداتي' },
];

const MOBILE_NAV = [
  { href: '/', icon: <MapPin className="size-5" />, label: 'الرئيسية' },
  { href: '/users/MapPreview', icon: <MapPin className="size-5" />, label: 'الخريطة' },
  { href: '/users/RegisterBeneficiary', icon: <Shield className="size-5" />, label: 'تسجيل' },
  { href: '/users/requestAid', icon: <Heart className="size-5" />, label: 'طلب مساعدة' },
  { href: '/users/myAid', icon: <Search className="size-5" />, label: 'مساعداتي' },
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const isSignedIn = status === 'authenticated' && !!session;

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-100 text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <MapPin className="size-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-extrabold text-slate-900">AidMap</p>
              <p className="hidden text-[10px] text-slate-500 sm:block">نظام الإغاثة الموحد</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth buttons */}
          <div className="hidden items-center gap-2 sm:flex">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
              >
                <LayoutDashboard className="size-3.5" />
                لوحة التحكم
              </Link>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
                >
                  <LogIn className="size-3.5" />
                  دخول
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
                >
                  إنشاء حساب
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="القائمة"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="absolute inset-x-0 top-full border-b border-slate-200 bg-white shadow-lg lg:hidden">
            <nav className="flex flex-col p-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                {isSignedIn ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white"
                  >
                    <LayoutDashboard className="size-4" />
                    لوحة التحكم
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signin"
                      onClick={() => setMenuOpen(false)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-700"
                    >
                      تسجيل الدخول
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="flex-1 rounded-xl bg-blue-600 py-2.5 text-center text-sm font-semibold text-white"
                    >
                      إنشاء حساب
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-5 h-16">
          {MOBILE_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                  active ? 'text-blue-600' : 'text-slate-500'
                }`}
              >
                <span className={`${active ? 'text-blue-600' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}

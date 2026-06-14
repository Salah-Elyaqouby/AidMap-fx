'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Container } from '@/components/common/container';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer border-t border-border bg-background">
      <Container>
        <div className="flex flex-col items-center justify-between gap-3 py-4 md:flex-row" dir="rtl">
          {/* Brand */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground order-2 md:order-1">
            <MapPin className="size-3.5 text-blue-600" />
            <span className="font-semibold text-slate-700">AidMap</span>
            <span className="text-slate-400">—</span>
            <span>نظام الإغاثة الموحد</span>
            <span className="text-slate-300">|</span>
            <span>{currentYear} ©</span>
          </div>

          {/* Nav links */}
          <nav className="flex order-1 md:order-2 gap-5 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-primary transition-colors">لوحة التحكم</Link>
            <Link href="/project/MapPreview" className="hover:text-primary transition-colors">الخريطة</Link>
            <Link href="/profile-page" className="hover:text-primary transition-colors">الملف الشخصي</Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
}

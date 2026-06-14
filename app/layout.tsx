import { ReactNode, Suspense } from 'react';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { SettingsProvider } from '@/providers/settings-provider';
import { TooltipsProvider } from '@/providers/tooltips-provider';
import { Toaster } from '@/components/ui/sonner';
import { Metadata } from 'next';
import { AuthProvider } from '@/providers/auth-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { ModulesProvider } from '@/providers/modules-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';

import '@/css/styles.css';
import '@/components/keenicons/assets/styles.css';
import 'maplibre-gl/dist/maplibre-gl.css';

const inter = Inter({ subsets: ['latin'] });

// تعديل العنوان والبيانات الوصفية للغة العربية
export const metadata: Metadata = {
  title: {
    template: '%s | نظام الإغاثة',
    default: 'نظام الإغاثة - Relief System',
  },
  description: 'نظام إدارة المساعدات والخدمات للمستفيدين',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className="h-full w-full"
    >
      <body
        suppressHydrationWarning
        className={cn(
          'h-full w-full m-0 p-0 antialiased text-base text-foreground bg-background',
          inter.className,
        )}
      >
        <QueryProvider>
          <AuthProvider>
            <SettingsProvider>
              <ThemeProvider>
                <I18nProvider>
                  <TooltipsProvider>
                    <ModulesProvider>
                      <div className="flex min-h-screen flex-col">
                        {/* استخدام Suspense لضمان تجربة مستخدم سلسة أثناء التحميل */}
                        <Suspense fallback={null}>{children}</Suspense>
                      </div>
                      <Toaster />
                    </ModulesProvider>
                  </TooltipsProvider>
                </I18nProvider>
              </ThemeProvider>
            </SettingsProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
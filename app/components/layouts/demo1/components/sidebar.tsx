'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';
import { SidebarHeader } from './sidebar-header';
import { SidebarMenu } from './sidebar-menu';

export function Sidebar() {
  const { settings } = useSettings();
  const pathname = usePathname();

  return (
    <div
      className={cn(
        // تم تغيير lg:border-e (يسار في RTL) إلى lg:border-s (يمين في RTL) أو lg:border-l
        // تم تغيير lg:left-0 (افتراضي) إلى lg:right-0 ليكون على اليمين
        'sidebar bg-background lg:border-s lg:border-border lg:fixed lg:top-0 lg:bottom-0 lg:right-0 lg:z-20 lg:flex flex-col items-stretch shrink-0',
        (settings.layouts.demo1.sidebarTheme === 'dark' ||
          pathname.includes('dark-sidebar')) &&
          'dark',
      )}
    >
      <SidebarHeader />
      <div className="overflow-hidden">
        <div className="w-(--sidebar-default-width)">
          <SidebarMenu />
        </div>
      </div>
    </div>
  );
}
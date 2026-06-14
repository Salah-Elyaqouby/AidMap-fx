'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getSidebarMenuByRole } from '@/config/menu.config';
import { AppRole } from '@/config/types';
import { MenuItem, MenuConfig } from '@/config/types';
import { cn } from '@/lib/utils';

export function SidebarMenu() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const menuItems = useMemo(() => {
    const slug = (
      (session?.user as { roleSlug?: string } | undefined)?.roleSlug ?? ''
    ).toLowerCase();
    const roleSlug: AppRole | null =
      slug === 'admin' ? 'admin' : slug.length > 0 ? 'user' : null;
    return getSidebarMenuByRole(roleSlug);
  }, [session?.user]);

  const isActive = (path?: string) => {
    if (!path) return false;
    return pathname === path || (path.length > 1 && pathname.startsWith(path));
  };

  const renderItems = (items: MenuConfig, depth = 0) => {
    return items.map((item: MenuItem, i: number) => {
      if (item.heading) {
        return (
          <div key={i} className="uppercase text-[10px] font-semibold text-muted-foreground/60 px-2 pt-4 pb-1 tracking-widest">
            {item.heading}
          </div>
        );
      }

      const hasChildren = item.children && item.children.length > 0;
      const active = isActive(item.path);

      if (hasChildren) {
        return (
          <div key={i}>
            {/* Category label — not a link, just a header */}
            <div
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-semibold select-none',
                depth === 0 ? 'text-foreground/80 mt-2' : 'text-foreground/70',
                depth > 0 && 'text-[13px]',
                active && 'text-primary',
              )}
              style={{ paddingRight: depth > 0 ? `${(depth) * 12 + 8}px` : undefined }}
            >
              {item.icon && <item.icon className="w-4 h-4 shrink-0 text-muted-foreground" />}
              {item.title}
            </div>
            {/* Children always visible */}
            <div style={{ paddingRight: depth > 0 ? `${(depth) * 8}px` : undefined }}>
              {renderItems(item.children!, depth + 1)}
            </div>
          </div>
        );
      }

      // Leaf item — a real link
      return (
        <Link
          key={i}
          href={item.path || '#'}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors',
            'hover:bg-muted hover:text-primary',
            active
              ? 'bg-muted text-primary font-semibold'
              : 'text-accent-foreground',
          )}
          style={{ paddingRight: `${depth * 12 + 8}px` }}
        >
          {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
          {item.title}
        </Link>
      );
    });
  };

  return (
    <div className="kt-scrollable-y-hover flex grow shrink-0 py-5 px-3 lg:max-h-[calc(100vh-5.5rem)]">
      <div className="w-full space-y-0.5">
        {renderItems(menuItems)}
      </div>
    </div>
  );
}

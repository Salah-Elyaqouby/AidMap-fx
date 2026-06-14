'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserDropdownMenu } from '@/partials/topbar/user-dropdown-menu';
import { Menu, MapPin, Languages } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Container } from '@/components/common/container';
import { Breadcrumb } from './breadcrumb';
import { SidebarMenu } from './sidebar-menu';
import { useLanguage } from '@/providers/i18n-provider';

export function Header() {
  const [isSidebarSheetOpen, setIsSidebarSheetOpen] = useState(false);
  const pathname = usePathname();
  const scrollPosition = useScrollPosition();
  const headerSticky = scrollPosition > 0;
  const { languageCode, changeLanguage } = useLanguage();

  const toggleLanguage = () => {
    changeLanguage(languageCode === 'ar' ? 'en' : 'ar');
  };

  useEffect(() => {
    setIsSidebarSheetOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'header fixed top-0 z-10 start-0 end-0 flex items-stretch shrink-0 border-b border-transparent bg-background',
        headerSticky && 'border-b border-border shadow-sm',
      )}
    >
      <Container className="flex items-center w-full gap-3">

        {/* Mobile: logo + hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <MapPin className="size-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-extrabold text-foreground">AidMap</p>
            </div>
          </Link>

          <Sheet open={isSidebarSheetOpen} onOpenChange={setIsSidebarSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" mode="icon" className="ms-1">
                <Menu className="size-5 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent
              className="w-[275px] gap-0 p-0"
              side="right"
              close={false}
            >
              <SheetHeader className="space-y-0 p-0" />
              <SheetBody className="overflow-y-auto p-0">
                <SidebarMenu />
              </SheetBody>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: breadcrumb */}
        <div className="hidden lg:flex flex-1 items-center">
          <Breadcrumb />
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 lg:hidden" />

        {/* Language toggle + User avatar */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="h-8 px-2.5 text-xs font-bold text-muted-foreground hover:text-foreground border border-border rounded-lg"
          >
            <Languages className="size-3.5 me-1" />
            {languageCode === 'ar' ? 'EN' : 'AR'}
          </Button>
          <UserDropdownMenu
            trigger={
              <img
                className="size-9 shrink-0 cursor-pointer rounded-full border-2 border-green-500"
                src={toAbsoluteUrl('/media/avatars/300-2.png')}
                alt="User Avatar"
              />
            }
          />
        </div>
      </Container>
    </header>
  );
}

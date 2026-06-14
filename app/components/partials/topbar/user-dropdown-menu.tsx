'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import {
  Lock,
  Pencil,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// تم الاكتفاء بالنصوص العربية فقط
const t = {
  pro: 'احترافي',
  profile: 'الملف الشخصي',
  viewProfile: 'عرض الملف الشخصي',
  editProfile: 'تعديل الملف الشخصي',
  preferences: 'التفضيلات',
  theme: 'الوضع الليلي', // تم تعديلها لتناسب مفتاح التبديل
  security: 'الأمان',
  changePassword: 'تغيير كلمة المرور',
  logout: 'تسجيل الخروج',
};

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  const { data: session } = useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" side="bottom" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <img
              className="h-9 w-9 rounded-full border border-border"
              src="/media/avatars/300-2.png"
              alt="User avatar"
            />
            <div className="flex flex-col">
              <Link
                href="/account/home/get-started"
                className="text-sm font-semibold text-mono hover:text-primary"
              >
                {session?.user?.name || ''}
              </Link>
              <Link
                href={`mailto:${session?.user?.email || ''}`}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                {session?.user?.email || ''}
              </Link>
            </div>
          </div>

          <Badge variant="primary" appearance="light" size="sm">
            {t.pro}
          </Badge>
        </div>

        <DropdownMenuSeparator />

        {/* Profile */}
        <DropdownMenuLabel className="font-semibold">
          {t.profile}
        </DropdownMenuLabel>

        <DropdownMenuItem asChild>
          <Link href="/profile-page" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            {t.viewProfile}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/profile-page/edit" className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            {t.editProfile}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Security */}
        <DropdownMenuLabel className="font-semibold">
          {t.security}
        </DropdownMenuLabel>

        <DropdownMenuItem asChild>
          <Link
            href="/profile-page/security/change-password"
            className="flex items-center gap-2"
          >
            <Lock className="h-4 w-4" />
            {t.changePassword}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive focus:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          {t.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
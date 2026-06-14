'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { I18N_LANGUAGES, Language } from '@/i18n/config';
import {
  Globe,
  Settings,
  User,
  UserCircle,
  Lock,
  LogOut,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useLanguage } from '@/providers/i18n-provider'; 
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DropdownMenuUser({ trigger }: { trigger: ReactNode }) {
  const { data: session } = useSession();
  const { language, changeLanguage } = useLanguage();

  const t = (key: string) => {
    const translations: any = {
      'pro': 'احترافي',
      'profileSection': 'الملف الشخصي',
      'preferences': 'التفضيلات',
      'viewProfile': 'عرض الملف الشخصي',
      'changePassword': 'تغيير كلمة المرور',
      'language': 'اللغة',
      'theme': 'الثيم',
      'logout': 'تسجيل الخروج'
    };
    return translations[key] || key;
  };

  const handleLanguage = (lang: Language) => {
    changeLanguage(lang.code);
  };



  return (
    <DropdownMenu dir={language.direction}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-64" side="bottom" align="end">
        
        {/* الحل هنا: استخدمنا flex-row العادي لأن dir="rtl" سيتكفل بوضع الصورة على اليمين */}
        {/* أضفنا items-center و gap-3 للتنسيق */}
        <div className="flex items-center gap-3 p-3 flex-row">
          {/* الصورة ستظهر يميناً لأن الأب ماخد dir="rtl" */}
          <img
            className="h-10 w-10 rounded-full border border-border shrink-0"
            src={toAbsoluteUrl(session?.user.avatar || '/media/avatars/300-2.png')}
            alt="avatar"
          />
          
          <div className="flex flex-col items-start overflow-hidden grow">
            <span className="text-sm font-bold text-foreground truncate w-full text-right">
              {session?.user.name || 'مستخدم'}
            </span>
            <span className="text-xs text-muted-foreground truncate w-full text-right">
              {session?.user.email}
            </span>
          </div>

          <Badge variant="outline" className="text-[10px] shrink-0">
             {t('pro')}
          </Badge>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="cursor-pointer gap-2 justify-start focus:bg-accent">
          <Link href="/public-profile/profiles/default" className="flex items-center gap-2 w-full">
            <UserCircle className="size-4" />
            <span>{t('profileSection')}</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 justify-start">
            <Settings className="size-4" />
            <span className="grow text-right">{t('preferences')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem asChild className="cursor-pointer gap-2 justify-start">
              <Link href="/account/home/user-profile" className="flex items-center gap-2 w-full">
                <User className="size-4" />
                <span>{t('viewProfile')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer gap-2 justify-start">
              <Link href="/account/security/overview" className="flex items-center gap-2 w-full">
                <Lock className="size-4" />
                <span>{t('changePassword')}</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 justify-start">
            <Globe className="size-4" />
            <div className="flex grow items-center justify-between gap-2">
              <span className="text-right">{t('language')}</span>
              <Badge variant="outline" className="flex gap-1 items-center px-1 font-normal">
                {language.name}
                <img src={language.flag} className="w-3 h-3 rounded-full" alt="" />
              </Badge>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuRadioGroup value={language.code} onValueChange={(v) => {
              const l = I18N_LANGUAGES.find(i => i.code === v);
              if (l) handleLanguage(l);
            }}>
              {I18N_LANGUAGES.map((item) => (
                <DropdownMenuRadioItem key={item.code} value={item.code} className="gap-2 flex-row-reverse">
                  <img src={item.flag} className="w-4 h-4 rounded-full" alt="" />
                  <span className="grow text-right">{item.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>



        <DropdownMenuSeparator />
        
        <div className="p-2">
          <Button variant="destructive" size="sm" className="w-full font-bold gap-2 flex-row" onClick={() => signOut()}>
            <LogOut className="size-4" />
            {t('logout')}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
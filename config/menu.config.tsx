import {
  AlertCircle,
  Captions,
  Coffee,
  FileQuestion,
  LayoutGrid,
  Share2,
  Star,
  HelpCircle,
} from 'lucide-react';
import { type MenuConfig, type AppRole, type MenuItem } from './types';

export const MENU_SIDEBAR: MenuConfig = [
  {
    title: 'لوحات التحكم',
    icon: LayoutGrid,
    expanded: true,
    children: [
      {
        title: 'إدارة المشاريع',
        expanded: true,
        children: [
          // 1. الخدمات الطبية (الرئيسية عامة، المستشفيات للأدمن)
          {
            title: 'الخدمات الطبية والصحية',
            path: '/project/projects/Medical-Services/clinic',
            children: [
              { title: 'الصفحة الرئيسية', path: '/project/projects/Medical-Services/home' },
              { title: 'جدول المستشفيات', path: '/project/projects/Medical-Services/hospitals', roles: ['admin'] },
            ],
          },

          // 2. الخدمات التعليمية (الفلترة عامة، جدول المدارس للأدمن)
          {
            title: 'الخدمات التعليمية والطلاب',
            path: '/project/projects/education',
            children: [
              { title: 'جدول المدارس', path: '/project/projects/education/school', roles: ['admin'] },
              { title: 'فلترة المدارس', path: '/project/projects/education/school/query' },
            ],
          },

          // 3. الغذاء والمياه (كل القسم للأدمن)
          {
            title: 'الغذاء والمياه (المعونات)',
            path: '/project/projects/food-water',
            roles: ['admin'],
            children: [
              { title: 'نقاط توزيع المياه', path: '/project/projects/food-water/water' },
              { title: 'نقاط توزيع المساعدات', path: '/project/projects/food-water/food' },
            ],
          },

          // 4. المراكز الإيوائية (كل القسم للأدمن)
          {
            title: 'المراكز الإيوائية',
            path: '/project/projects/camp',
            roles: ['admin'],
            children: [
              { title: 'مراكز الإيواء والمشرفون', path: '/project/projects/camp/shelters' },
              { title: 'جدول الطوارئ', path: '/project/projects/camp/Emergency' },
            ],
          },

          // 5. المؤسسات الداعمة (كل القسم للأدمن)
          {
            title: 'المؤسسات الداعمة',
            path: '/project/projects/institutions',
            roles: ['admin'],
            children: [
              { title: 'المؤسسات', path: '/project/projects/institution/institutions' },
            ],
          },
        ],
      },
      // قسم لوحة تحكم المسؤول (محمي بالكامل)
      {
        title: 'لوحة تحكم المسؤول',
        path: '/store-admin/dashboard',
        roles: ['admin'],
        expanded: true,
        children: [
          { title: 'معاينة الخريطة', path: '/project/MapPreview' },
          { title: 'إضافة مكان', path: '/project/admins/addPlaces' },
          { title: 'تسجيل مستفيد', path: '/project/admins/adminBeneficiary' },
          { title: 'فحص مساعدة', path: '/project/admins/addAid' },
          { title: 'طلب مساعدة ', path: '/project/admins/distributeAid' },
        ],
      },
    ],
  },
];

// ... (باقي كود MENU_HELP و الدوال يظل كما هو دون تغيير)
export const MENU_SIDEBAR_CUSTOM: MenuConfig = [];
export const MENU_SIDEBAR_COMPACT: MenuConfig = [];
export const MENU_ROOT: MenuConfig = [];
export const MENU_MEGA: MenuConfig = [];
export const MENU_MEGA_MOBILE: MenuConfig = [];

export const MENU_HELP: MenuConfig = [
  {
    title: 'الدعم والمساعدة',
    icon: HelpCircle,
    expanded: true, 
    children: [
      {
        title: 'ابدأ هنا',
        icon: Coffee,
        path: 'https://keenthemes.com/metronic/tailwind/docs/getting-started/installation',
      },
      {
        title: 'التوثيق التعليمي',
        icon: FileQuestion,
        path: 'https://keenthemes.com/metronic/tailwind/docs',
      },
    ],
  },
];

function filterMenuByRole(items: MenuItem[], role: AppRole | null): MenuItem[] {
  return items
    .filter((item) => {
      if (!item.roles || item.roles.length === 0) return true;
      if (!role) return false;
      return item.roles.includes(role);
    })
    .map((item) => ({
      ...item,
      children: item.children
        ? filterMenuByRole(item.children, role)
        : undefined,
    }));
}

export function getSidebarMenuByRole(role: AppRole | null): MenuConfig {
  return filterMenuByRole(MENU_SIDEBAR, role);
}
'use client';

import { useSettings } from '@/providers/settings-provider';

import { Demo1LightSidebarPage } from '../components/demo1';
import { Demo2Page } from '../components/demo2';
import { Demo3Page } from '../components/demo3';
import { Demo4Page } from '../components/demo4';
import { Demo5Page } from '../components/demo5';

import { ScreenLoader } from '@/components/common/screen-loader';

export default function Page() {
  const { settings } = useSettings();

  console.log('Current layout setting:', settings);

  // ✅ أثناء تحميل الإعدادات
  if (!settings) {
    return <ScreenLoader />;
  }

  switch (settings.layout) {
    case 'demo1':
      return <Demo1LightSidebarPage />;

    case 'demo2':
      return <Demo2Page />;

    case 'demo3':
      return <Demo3Page />;

    case 'demo4':
      return <Demo4Page />;

    case 'demo5':
      return <Demo5Page />;

    case 'demo6':
      return <Demo4Page />;

    case 'demo7':
      return <Demo2Page />;

    case 'demo8':
      return <Demo4Page />;

    case 'demo9':
      return <Demo2Page />;

    case 'demo10':
      return <Demo3Page />;

    default:
      // ✅ لو القيمة غير متوقعة
      return <Demo1LightSidebarPage />;
      // أو:
      // return (
      //   <div style={{ padding: 24 }}>
      //     Unknown layout: {settings.layout}
      //   </div>
      // );
  }
}

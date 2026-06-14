'use client';

import { DashboardWireframe } from './components/dashboard-wireframe';

export function Demo1LightSidebarContent() {
  return (
    /* إزالة الـ Container تماماً وضمان التمدد الكامل */
    <div className="w-full h-full p-0 m-0 overflow-hidden flex flex-col items-stretch flex-1">
        <DashboardWireframe />
    </div>
  );
}
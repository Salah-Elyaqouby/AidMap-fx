'use client'

import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { useEffect } from 'react'
import { useSettings } from '@/providers/settings-provider'

export function SidebarHeader() {
  const { settings, storeOption } = useSettings()

  useEffect(() => {
    if (settings.layouts.demo1.sidebarCollapse) {
      storeOption('layouts.demo1.sidebarCollapse', false)
    }
  }, [])

  return (
    <div className="sidebar-header hidden lg:flex items-center px-3 lg:px-6 shrink-0">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
          <MapPin className="size-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-extrabold text-foreground">AidMap</p>
          <p className="text-[10px] text-muted-foreground">نظام الإغاثة</p>
        </div>
      </Link>
    </div>
  )
}
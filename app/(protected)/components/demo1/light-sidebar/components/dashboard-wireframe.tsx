'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Heart, MapPin, Building2, AlertTriangle,
  ChevronLeft, TrendingUp, Package, Stethoscope, Home,
} from 'lucide-react';
import { MapLibrePreview, type AdminPlace } from '@/app/components/maps/MapPreviewContent';

type Stat = { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; href: string };

const QUICK_ACTIONS = [
  { href: '/project/admins/adminBeneficiary', label: 'تسجيل مستفيد', icon: <Users className="size-5" />, color: 'bg-blue-50 text-blue-600' },
  { href: '/project/admins/addAid', label: 'إضافة مساعدة', icon: <Heart className="size-5" />, color: 'bg-red-50 text-red-600' },
  { href: '/project/admins/distributeAid', label: 'توزيع المساعدات', icon: <Package className="size-5" />, color: 'bg-amber-50 text-amber-600' },
  { href: '/project/admins/addPlaces', label: 'إضافة مكان', icon: <MapPin className="size-5" />, color: 'bg-green-50 text-green-600' },
  { href: '/project/projects/camp/shelters', label: 'مراكز الإيواء', icon: <Home className="size-5" />, color: 'bg-purple-50 text-purple-600' },
  { href: '/project/projects/Medical-Services/hospitals', label: 'المستشفيات', icon: <Stethoscope className="size-5" />, color: 'bg-pink-50 text-pink-600' },
  { href: '/project/projects/camp/Emergency', label: 'الطوارئ', icon: <AlertTriangle className="size-5" />, color: 'bg-orange-50 text-orange-600' },
  { href: '/project/projects/institution/institutions', label: 'المؤسسات', icon: <Building2 className="size-5" />, color: 'bg-slate-50 text-slate-600' },
];

export const DashboardWireframe = () => {
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [stats, setStats] = useState({ beneficiaries: 0, aids: 0, shelters: 0, hospitals: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/project/places', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/project/projects/citizens', { cache: 'no-store' }).then(r => r.json()).catch(() => []),
      fetch('/api/project/projects/aids', { cache: 'no-store' }).then(r => r.json()).catch(() => []),
    ]).then(([placesData, bens, aids]) => {
      const allPlaces: AdminPlace[] = Array.isArray(placesData?.data) ? placesData.data : [];
      setPlaces(allPlaces);
      setStats({
        beneficiaries: Array.isArray(bens) ? bens.length : 0,
        aids: Array.isArray(aids) ? aids.length : 0,
        shelters: allPlaces.filter(p => p.type === 'shelter').length,
        hospitals: allPlaces.filter(p => p.type === 'hospital').length,
      });
    }).finally(() => setLoadingStats(false));
  }, []);

  const statCards: Stat[] = [
    { label: 'المستفيدون', value: loadingStats ? '…' : stats.beneficiaries.toLocaleString('ar'), sub: 'إجمالي مسجل', icon: <Users className="size-5" />, color: 'text-blue-600 bg-blue-50', href: '/project/food-water/beneficiaries' },
    { label: 'المساعدات', value: loadingStats ? '…' : stats.aids.toLocaleString('ar'), sub: 'طلب موثق', icon: <Heart className="size-5" />, color: 'text-red-600 bg-red-50', href: '/project/admins/addAid' },
    { label: 'مراكز الإيواء', value: loadingStats ? '…' : stats.shelters.toLocaleString('ar'), sub: 'مركز نشط', icon: <Home className="size-5" />, color: 'text-green-600 bg-green-50', href: '/project/projects/camp/shelters' },
    { label: 'المستشفيات', value: loadingStats ? '…' : stats.hospitals.toLocaleString('ar'), sub: 'منشأة طبية', icon: <Stethoscope className="size-5" />, color: 'text-pink-600 bg-pink-50', href: '/project/projects/Medical-Services/hospitals' },
  ];

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-muted-foreground">نظرة عامة على بيانات منظومة الإغاثة</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-extrabold text-foreground tabular-nums">{s.value}</p>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{s.label}</p>
              {s.sub && <p className="text-[10px] text-muted-foreground/70">{s.sub}</p>}
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-foreground">الإجراءات السريعة</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex flex-col items-center gap-2 rounded-xl border bg-card px-3 py-4 text-center shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.color}`}>
                {a.icon}
              </div>
              <span className="text-xs font-semibold text-foreground leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Map section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">خريطة الأماكن</h2>
            <p className="text-[11px] text-muted-foreground">مراكز الإيواء والمستشفيات والمساعدات</p>
          </div>
          <Link
            href="/project/MapPreview"
            className="flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50"
          >
            عرض كامل
            <ChevronLeft className="size-3.5" />
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <MapLibrePreview
            lng={34.4667}
            lat={31.5}
            zoom={10}
            height={420}
            adminPlaces={places}
            osmEnabled={true}
            osmAmenities={['hospital', 'clinic', 'school', 'pharmacy', 'doctors', 'drinking_water']}
            osmCategories={{ shelters: true, medical: true, aid: true, food: true }}
          />
        </div>
      </div>

    </div>
  );
};

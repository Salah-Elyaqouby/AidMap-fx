'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Heart, Search, Shield, ChevronLeft } from 'lucide-react';
import { MapLibrePreview, type AdminPlace } from '../components/maps/MapPreviewContent';

export default function PublicHomePage() {
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const res = await fetch('/api/project/places', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'فشل في جلب الأماكن');
        setPlaces(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ');
      } finally {
        setLoading(false);
      }
    };
    loadPlaces();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-blue-700 via-blue-600 to-blue-500 px-4 py-16 text-white sm:py-20">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            النظام يعمل بشكل طبيعي
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            نظام الإغاثة الموحد
          </h1>
          <p className="mt-4 text-lg text-blue-100 sm:text-xl">
            منصة متكاملة لإدارة وتوزيع المساعدات الإنسانية — تتبع طلبك، سجّل بياناتك، واعثر على أقرب مركز.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/users/requestAid"
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-blue-700 shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
            >
              <Heart className="size-4" />
              طلب مساعدة
            </Link>
            <Link
              href="/users/myAid"
              className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
            >
              <Search className="size-4" />
              فحص حالة طلبي
            </Link>
          </div>
        </div>
      </section>

      {/* Quick services */}
      <section className="bg-white px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-6 text-center text-xl font-bold text-slate-800">الخدمات المتاحة</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { href: '/users/RegisterBeneficiary', icon: <Shield className="size-6" />, label: 'تسجيل مستفيد', desc: 'سجّل بيانات الأسرة', color: 'bg-blue-50 text-blue-600' },
              { href: '/users/requestAid', icon: <Heart className="size-6" />, label: 'طلب مساعدة', desc: 'غذاء · طبي · سكن', color: 'bg-red-50 text-red-600' },
              { href: '/users/myAid', icon: <Search className="size-6" />, label: 'مساعداتي', desc: 'تابع حالة طلبك', color: 'bg-amber-50 text-amber-600' },
              { href: '/users/MapPreview', icon: <MapPin className="size-6" />, label: 'الخريطة', desc: 'مراكز إيواء وطبية', color: 'bg-green-50 text-green-600' },
            ].map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.color}`}>
                  {s.icon}
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-800">{s.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.desc}</p>
                </div>
                <ChevronLeft className="size-4 text-slate-300 transition-transform group-hover:-translate-x-1 group-hover:text-blue-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">خريطة الأماكن</h2>
              <p className="mt-0.5 text-sm text-slate-500">مراكز الإيواء والمستشفيات ونقاط توزيع المساعدات</p>
            </div>
            <Link
              href="/users/MapPreview"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              عرض كامل
              <ChevronLeft className="size-4" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex h-96 items-center justify-center text-slate-500">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  جاري تحميل الخريطة...
                </div>
              </div>
            ) : error ? (
              <div className="flex h-96 items-center justify-center text-red-600">
                <p className="text-sm">{error}</p>
              </div>
            ) : (
              <MapLibrePreview
                lng={34.4667}
                lat={31.5}
                zoom={10}
                height={480}
                adminPlaces={places}
                osmEnabled={true}
                osmAmenities={['hospital', 'clinic', 'school', 'pharmacy', 'doctors', 'drinking_water']}
                osmCategories={{ shelters: true, medical: true, aid: true, food: true }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-white px-4 py-10 text-center">
        <p className="text-xs text-slate-400">نظام الإغاثة الموحد — AidMap {new Date().getFullYear()}</p>
      </section>
    </div>
  );
}

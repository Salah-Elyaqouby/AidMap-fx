'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Search, Loader2, School, Users, BookOpen } from 'lucide-react'

const LOCATIONS = ['شمال', 'جنوب', 'شرق', 'غرب', 'وسط']
const AREAS_BY_LOCATION: Record<string, string[]> = {
  'شمال': ['جباليا', 'بيت لاهيا', 'بيت حانون'],
  'جنوب': ['رفح', 'خانيونس'],
  'شرق': ['حي الشجاعية', 'الزيتون', 'التفاح'],
  'غرب': ['الرمال', 'مخيم الشاطئ', 'تل الهوى'],
  'وسط': ['دير البلح', 'النصيرات', 'البريج', 'المغازي'],
}
const STAGES = ['روضة', 'ابتدائي', 'اعدادي', 'ثانوي']
const SCHOOL_TYPES = ['حكومي', 'خاص', 'وكالة (أونروا)', 'دولي']
const GENDERS = ['ذكور', 'إناث', 'مشترك']

type School = {
  id: string
  name: string
  location: string | null
  region: string | null
  level: string | null
  studyDays: string | null
  timing: string | null
  fees: number
  schoolType: string | null
  gender: string | null
  totalCount: number
}

const sel = 'w-full h-12 border-2 border-white shadow-sm rounded-2xl px-4 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm'

export default function SchoolQueryPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterFees, setFilterFees] = useState('')

  useEffect(() => {
    fetch('/api/project/education/schools')
      .then(r => r.json())
      .then(d => setSchools(Array.isArray(d.schools) ? d.schools : []))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return schools.filter(s => {
      if (q && !s.name.includes(q) && !(s.location || '').includes(q) && !(s.region || '').includes(q)) return false
      if (filterLocation && s.location !== filterLocation) return false
      if (filterRegion && s.region !== filterRegion) return false
      if (filterType && s.schoolType !== filterType) return false
      if (filterGender && s.gender !== filterGender) return false
      if (filterLevel && s.level !== filterLevel) return false
      if (filterFees === 'مجاني' && s.fees > 0) return false
      if (filterFees === 'برسوم' && s.fees === 0) return false
      return true
    })
  }, [schools, q, filterLocation, filterRegion, filterType, filterGender, filterLevel, filterFees])

  const stats = useMemo(() => ({
    total: filtered.length,
    totalStudents: filtered.reduce((sum, s) => sum + (s.totalCount || 0), 0),
    free: filtered.filter(s => s.fees === 0).length,
  }), [filtered])

  const clearFilters = () => { setQ(''); setFilterLocation(''); setFilterRegion(''); setFilterType(''); setFilterGender(''); setFilterLevel(''); setFilterFees('') }

  return (
    <div className="w-full px-4 py-8 sm:px-10" dir="rtl">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/project/projects/education/school')} className="gap-1">
          <ArrowRight className="w-4 h-4" /> رجوع
        </Button>
        <div>
          <h1 className="text-3xl font-black text-blue-900">نظام فلترة المدارس</h1>
          <p className="text-blue-600 font-medium mt-1">عرض البيانات للمواطنين والإدارة</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-none shadow-md rounded-2xl bg-blue-600 text-white">
          <CardContent className="p-5 flex items-center gap-3">
            <School className="w-8 h-8 opacity-80" />
            <div><p className="text-sm opacity-80">المدارس المتاحة</p><p className="text-2xl font-black">{stats.total}</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md rounded-2xl bg-emerald-600 text-white">
          <CardContent className="p-5 flex items-center gap-3">
            <Users className="w-8 h-8 opacity-80" />
            <div><p className="text-sm opacity-80">إجمالي الطلاب</p><p className="text-2xl font-black">{stats.totalStudents.toLocaleString('ar')}</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md rounded-2xl bg-purple-600 text-white">
          <CardContent className="p-5 flex items-center gap-3">
            <BookOpen className="w-8 h-8 opacity-80" />
            <div><p className="text-sm opacity-80">مدارس مجانية</p><p className="text-2xl font-black">{stats.free}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-xl bg-white rounded-3xl mb-8">
        <CardContent className="p-6 bg-slate-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="relative sm:col-span-2 lg:col-span-3">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث باسم المدرسة أو المنطقة..." className="h-12 pr-11 rounded-2xl border-2 border-white shadow-sm bg-white text-sm" />
            </div>

            <select className={sel} value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setFilterRegion('') }}>
              <option value="">كل المحافظات</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            <select className={sel} value={filterRegion} onChange={e => setFilterRegion(e.target.value)} disabled={!filterLocation}>
              <option value="">كل المناطق</option>
              {filterLocation && (AREAS_BY_LOCATION[filterLocation] || []).map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <select className={sel} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">كل أنواع المدارس</option>
              {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select className={sel} value={filterGender} onChange={e => setFilterGender(e.target.value)}>
              <option value="">نوع الطلاب (الكل)</option>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <select className={sel} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
              <option value="">كل المراحل التعليمية</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select className={sel} value={filterFees} onChange={e => setFilterFees(e.target.value)}>
              <option value="">التكلفة (الكل)</option>
              <option value="مجاني">مجاني</option>
              <option value="برسوم">برسوم</option>
            </select>
          </div>
          <Button variant="outline" onClick={clearFilters} className="text-sm rounded-xl">مسح الفلاتر</Button>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed">
          لا توجد مدارس تطابق معايير البحث الحالية
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(s => (
            <Card key={s.id} className="border-none shadow-md rounded-2xl hover:shadow-lg transition-shadow bg-white overflow-hidden group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-black text-slate-800 text-base group-hover:text-blue-600 transition-colors leading-tight">{s.name}</h3>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${s.fees > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {s.fees > 0 ? `${s.fees} ₪` : 'مجاني'}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm">
                  {(s.location || s.region) && (
                    <p className="text-slate-500 font-medium">{[s.location, s.region].filter(Boolean).join(' › ')}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {s.schoolType && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold">{s.schoolType}</span>}
                    {s.gender && (
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${s.gender === 'ذكور' ? 'bg-blue-100 text-blue-700' : s.gender === 'إناث' ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'}`}>
                        {s.gender}
                      </span>
                    )}
                    {s.level && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold">{s.level}</span>}
                  </div>
                  
                  <div className="pt-3 mt-3 border-t border-slate-50 flex items-center justify-between">
                    {s.totalCount > 0 ? (
                      <p className="text-slate-500 text-xs flex items-center gap-1.5 font-bold">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> {s.totalCount.toLocaleString('ar')} طالب
                      </p>
                    ) : <span></span>}
                    {s.timing && <p className="text-[11px] text-slate-400 font-medium">{s.timing}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
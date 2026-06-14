'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Stethoscope, Users, Activity, Compass, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

// --- استدعاء دوال الحماية من ملفك الأصلي بناءً على الصورة image_8dd741.png ---
// ملاحظة: requireCitizen في ملفك تسمح للمواطن، و requireAdmin تسمح للأدمن.
// سنستخدم هنا requireCitizen لأنها في ملفك تسمح لـ (admin و user/citizen) معاً.
import { requireCitizen } from '@/app/(protected)/project/helpers/route-guards'

type Hospital = { id: string; name: string; region: string; phone: string }
type Department = { id: string; name: string }
type Service = { id: string; name: string; price: number; isAvailable: boolean }
type Doctor = { id: string; name: string; specialty: string; workSchedule: string | null; phone: string }

const REGIONS = [
  { value: 'NORTH', label: 'شمال' },
  { value: 'SOUTH', label: 'جنوب' },
  { value: 'EAST', label: 'شرق' },
  { value: 'WEST', label: 'غرب' },
]

const selectClass = 'w-full h-12 border-2 border-white shadow-sm rounded-2xl px-4 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed'

export default function AdvancedQueryPage() {
  const { t } = useTranslation()
  const router = useRouter()

  // حالات الصفحة
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedHospitalId, setSelectedHospitalId] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])

  // حالات التحميل والصلاحية
  const [isAuthorized, setIsAuthorized] = useState(false) 
  const [loadingHospitals, setLoadingHospitals] = useState(false)
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // 1. التحقق من الصلاحية باستخدام ملف route-guards.ts
  useEffect(() => {
    async function checkAuth() {
      // دالة requireCitizen تسمح للأدمن والمواطن بالدخول بناءً على الكود الخاص بك
      await requireCitizen(router)
      setIsAuthorized(true) 
    }
    checkAuth()
  }, [router])

  // 2. جلب المستشفيات
  useEffect(() => {
    if (!selectedRegion || !isAuthorized) { setHospitals([]); return }
    setLoadingHospitals(true)
    setSelectedHospitalId('')
    setDepartments([])
    setSelectedDepartmentId('')
    fetch(`/api/project/Medical-Services/query/hospitals?region=${selectedRegion}`)
      .then(r => r.json())
      .then(data => setHospitals(Array.isArray(data) ? data : []))
      .catch(() => setHospitals([]))
      .finally(() => setLoadingHospitals(false))
  }, [selectedRegion, isAuthorized])

  // 3. جلب الأقسام
  useEffect(() => {
    if (!selectedHospitalId || !isAuthorized) { setDepartments([]); return }
    setLoadingDepartments(true)
    setSelectedDepartmentId('')
    fetch(`/api/project/Medical-Services/query/departments?hospitalId=${selectedHospitalId}`)
      .then(r => r.json())
      .then(data => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => setDepartments([]))
      .finally(() => setLoadingDepartments(false))
  }, [selectedHospitalId, isAuthorized])

  // 4. جلب التفاصيل (خدمات + أطباء)
  useEffect(() => {
    if (!selectedDepartmentId || !isAuthorized) { setServices([]); setDoctors([]); return }
    setLoadingDetail(true)
    fetch(`/api/project/Medical-Services/query/department-detail?departmentId=${selectedDepartmentId}`)
      .then(r => r.json())
      .then(data => {
        setServices(Array.isArray(data.services) ? data.services : [])
        setDoctors(Array.isArray(data.doctors) ? data.doctors : [])
      })
      .catch(() => { setServices([]); setDoctors([]) })
      .finally(() => setLoadingDetail(false))
  }, [selectedDepartmentId, isAuthorized])

  // شاشة التحميل أثناء فحص الصلاحية
  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  const showResults = selectedDepartmentId && !loadingDetail

  return (
    <div className="w-full px-4 py-8 sm:px-10 text-start" dir="rtl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-blue-900 tracking-tight">
          نظام الاستعلام المتطور - AidMap
        </h1>
        <p className="text-blue-600 font-medium mt-2">تتبع الخدمات الطبية والقدرة التشغيلية</p>
      </div>

      <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden mb-10">
        <CardContent className="p-8 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-500" /> المنطقة
              </label>
              <select className={selectClass} value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
                <option value="">اختر المنطقة</option>
                {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" /> المستشفى
                {loadingHospitals && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
              </label>
              <select className={selectClass} disabled={!selectedRegion || loadingHospitals} value={selectedHospitalId} onChange={e => setSelectedHospitalId(e.target.value)}>
                <option value="">اختر المستشفى</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-500" /> القسم
                {loadingDepartments && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
              </label>
              <select className={selectClass} disabled={!selectedHospitalId || loadingDepartments} value={selectedDepartmentId} onChange={e => setSelectedDepartmentId(e.target.value)}>
                <option value="">اختر القسم</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {showResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-lg bg-white rounded-3xl p-6">
            <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2 border-b pb-3 text-start">
              <Activity className="text-blue-500" /> الخدمات المتاحة
            </h3>
            {services.length === 0 ? (
              <p className="text-center text-slate-400 py-6 italic">لا توجد خدمات مسجلة لهذا القسم</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {services.map(s => (
                  <div key={s.id} className={`p-3 rounded-xl text-center font-bold border text-sm ${s.isAvailable ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'}`}>
                    {s.name}
                    {s.price > 0 && <span className="block text-xs font-normal mt-1 opacity-70">{s.price} ₪</span>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="border-none shadow-lg bg-white rounded-3xl p-6">
            <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2 border-b pb-3 text-start">
              <Users className="text-emerald-500" /> الكادر الطبي
            </h3>
            {doctors.length === 0 ? (
              <p className="text-center text-slate-400 py-6 italic">لا يوجد أطباء مسجلون لهذا القسم</p>
            ) : (
              <div className="space-y-3">
                {doctors.map(d => (
                  <div key={d.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-start">
                      <p className="font-bold text-slate-700">{d.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{d.specialty}</p>
                    </div>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">متوفر</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
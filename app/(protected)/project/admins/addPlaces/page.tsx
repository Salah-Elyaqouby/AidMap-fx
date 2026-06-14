'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { requireAdmin } from '@/app/(protected)/project/helpers/route-guards'

// تحديث أنواع الأماكن لتشمل الخيارات الجديدة
type PlaceType = 'shelter' | 'hospital' | 'water' | 'food'

type FormState = {
  name: string; 
  type: PlaceType; 
  lng: string; 
  lat: string;
  operator: string; 
  capacity: string; 
  occupancy: string; 
  availableBeds: string;
}

const INITIAL_FORM: FormState = {
  name: '', 
  type: 'shelter', 
  lng: '', 
  lat: '',
  operator: '', 
  capacity: '', 
  occupancy: '', 
  availableBeds: '',
}

export default function AddPlacesPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await requireAdmin(router)
        setIsAuthorized(true)
      } catch {
        // في حال عدم وجود صلاحية سيتم التحويل لصفحة غير مصرح له
        router.push('/unauthorized')
      }
    }
    checkAuth()
  }, [router])

  // التحقق مما إذا كان المكان هو مركز إيواء لإظهار حقول السعة
  const isShelter = useMemo(() => form.type === 'shelter', [form.type])

  const updateField = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthorized) return
    
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/project/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          latitude: Number(form.lat),
          longitude: Number(form.lng),
          // تحويل القيم النصية لأرقام عند الإرسال
          capacity: form.capacity ? Number(form.capacity) : 0,
          occupancy: form.occupancy ? Number(form.occupancy) : 0,
          availableBeds: form.availableBeds ? Number(form.availableBeds) : 0,
        }),
      })

      // ملاحظة: إذا ظهر خطأ "Unexpected token <" تأكدي أن الـ API لا يعيد صفحة 404 أو HTML
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'حدث خطأ غير متوقع في الخادم' }))
        throw new Error(errorData.message || 'فشل في حفظ البيانات')
      }

      router.push('/project/MapPreview')
      router.refresh() // لتحديث البيانات في صفحة الخريطة
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthorized) return (
    <div className="p-10 text-center animate-pulse">
      <div className="text-blue-600 font-bold">جاري التحقق من صلاحيات المسؤول...</div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">إضافة معلم جديد على الخريطة</h1>
      
      <form onSubmit={onSubmit} className="space-y-5 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600 mr-1">اسم المكان</label>
            <input 
              className="border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              placeholder="مثال: مدرسة الإيواء المركزية" 
              value={form.name} 
              onChange={e => updateField('name', e.target.value)} 
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600 mr-1">تصنيف المكان</label>
            <select 
              className="border p-2.5 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" 
              value={form.type} 
              onChange={e => updateField('type', e.target.value as PlaceType)}
            >
              <option value="shelter">🏠 مركز إيواء</option>
              <option value="hospital">🏥 مستشفى / نقطة طبية</option>
              <option value="water">💧 نقطة مياه</option>
              <option value="food">🍱 توزيع غذاء</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600 mr-1">خط الطول (Longitude)</label>
            <input 
              className="border p-2.5 rounded-lg text-left focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="00.000000" 
              value={form.lng} 
              onChange={e => updateField('lng', e.target.value)} 
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600 mr-1">خط العرض (Latitude)</label>
            <input 
              className="border p-2.5 rounded-lg text-left focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="00.000000" 
              value={form.lat} 
              onChange={e => updateField('lat', e.target.value)} 
              required
            />
          </div>
        </div>

        {isShelter && (
          <div className="bg-blue-50 p-4 rounded-xl space-y-3 border border-blue-100">
            <p className="text-sm font-bold text-blue-800 mb-1">تفاصيل السعة والاستيعاب:</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <input className="border p-2 rounded-lg text-center" placeholder="إجمالي السعة" value={form.capacity} onChange={e => updateField('capacity', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <input className="border p-2 rounded-lg text-center" placeholder="عدد المقيمين" value={form.occupancy} onChange={e => updateField('occupancy', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <input className="border p-2 rounded-lg text-center" placeholder="المتاح حالياً" value={form.availableBeds} onChange={e => updateField('availableBeds', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-4" 
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              جاري الحفظ...
            </span>
          ) : 'حفظ المكان ونشره على الخريطة'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm text-center font-medium">
            ⚠️ {error}
          </div>
        )}
      </form>
    </div>
  )
}
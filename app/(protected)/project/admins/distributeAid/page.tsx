'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { requireCitizen } from '@/app/(protected)/project/helpers/route-guards'

type FormErrors = {
  fullName?: string
  nationalId?: string
  phone?: string
  aidType?: string
  familyCount?: string
  address?: string
  notes?: string
}

const phoneRegex = /^(056|059)\d{7}$/
const nationalIdRegex = /^\d{9}$/
const repeatedDigitsRegex = /^(\d)\1+$/

export default function RequestAidPage() {
  const router = useRouter()

  useEffect(() => {
    requireCitizen(router)
  }, [router])

  const [fullName, setFullName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [phone, setPhone] = useState('')
  const [aidType, setAidType] = useState('')
  const [familyCount, setFamilyCount] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'fullName': return !value.trim() ? 'الاسم مطلوب' : ''
      case 'nationalId':
        if (!value) return 'رقم الهوية مطلوب'
        if (!nationalIdRegex.test(value)) return 'يجب أن يتكون رقم الهوية من 9 أرقام'
        if (repeatedDigitsRegex.test(value)) return 'رقم هوية غير صالح (أرقام مكررة)'
        return ''
      case 'phone':
        if (!value) return 'رقم الجوال مطلوب'
        if (!phoneRegex.test(value)) return 'يجب أن يبدأ بـ 056 أو 059'
        return ''
      case 'aidType': return !value ? 'يرجى اختيار نوع المساعدة' : ''
      case 'familyCount':
        const num = Number(value)
        if (!value || num < 1 || num > 20) return 'العدد يجب أن يكون بين 1 و 20'
        return ''
      case 'address': return !value.trim() ? 'العنوان مطلوب' : ''
      default: return ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(''); setErrorMessage('')

    const newErrors: FormErrors = {
      fullName: validateField('fullName', fullName),
      nationalId: validateField('nationalId', nationalId),
      phone: validateField('phone', phone),
      aidType: validateField('aidType', aidType),
      familyCount: validateField('familyCount', familyCount),
      address: validateField('address', address),
    }

    setErrors(newErrors)
    if (Object.values(newErrors).some(Boolean)) return

    setLoading(true)
    try {
      const res = await fetch('/api/project/users/requestAid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          nationalId,
          phone,
          aidType,
          familyCount: Number(familyCount),
          address: address.trim(),
          notes: notes.trim(),
        }),
      })

      if (!res.ok) throw new Error('فشل في إرسال الطلب')
      setSuccessMessage('تم إرسال طلبك بنجاح.')
      setFullName(''); setNationalId(''); setPhone(''); setAidType('');
      setFamilyCount(''); setAddress(''); setNotes(''); setErrors({});
    } catch (error: any) {
      setErrorMessage(error?.message || 'حدث خطأ أثناء الإرسال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-2xl">
        
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-slate-800">طلب مساعدة إغاثية</h1>
          <p className="mt-1 text-sm text-slate-500 font-normal">يرجى إدخال بياناتك بدقة لضمان وصول المساعدة في أسرع وقت ممكن</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-normal text-slate-600 mr-1">الاسم الكامل (رباعي)</label>
              <input
                type="text"
                placeholder="مثال: محمد أحمد محمود علي"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              {errors.fullName && <span className="text-[10px] text-red-500 mr-1">{errors.fullName}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-normal text-slate-600 mr-1">رقم الهوية</label>
              <input
                type="text"
                maxLength={9}
                placeholder="9xxxxxxx"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500"
              />
              {errors.nationalId && <span className="text-[10px] text-red-500 mr-1">{errors.nationalId}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-normal text-slate-600 mr-1">رقم الجوال</label>
              <input
                type="text"
                maxLength={10}
                placeholder="05xxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500"
              />
              {errors.phone && <span className="text-[10px] text-red-500 mr-1">{errors.phone}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-normal text-slate-600 mr-1">نوع المساعدة</label>
              <select
                value={aidType}
                onChange={(e) => setAidType(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500 bg-white"
              >
                <option value="">اختر النوع...</option>
                <option value="food">مساعدة غذائية</option>
                <option value="medical">مساعدة طبية</option>
                <option value="financial">مساعدة مالية</option>
                <option value="shelter">مساعدة سكن</option>
              </select>
              {errors.aidType && <span className="text-[10px] text-red-500 mr-1">{errors.aidType}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-normal text-slate-600 mr-1">عدد أفراد الأسرة</label>
              <input
                type="number"
                placeholder="مثال: 5"
                value={familyCount}
                onChange={(e) => setFamilyCount(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500"
              />
              {errors.familyCount && <span className="text-[10px] text-red-500 mr-1">{errors.familyCount}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-normal text-slate-600 mr-1">العنوان بالتفصيل</label>
              <input
                type="text"
                placeholder="المدينة، الحي، الشارع"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none focus:border-blue-500"
              />
              {errors.address && <span className="text-[10px] text-red-500 mr-1">{errors.address}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-normal text-slate-600 mr-1">ملاحظات أو احتياجات خاصة</label>
              <textarea
                rows={2}
                placeholder="أي معلومات إضافية تود ذكرها..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {(successMessage || errorMessage) && (
              <div className={`rounded-lg p-3 text-xs text-center ${successMessage ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {successMessage || errorMessage}
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full max-w-[280px] rounded-xl bg-blue-600 text-[15px] font-normal text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'جارٍ الإرسال...' : 'إرسال طلب المساعدة'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
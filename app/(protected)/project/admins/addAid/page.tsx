'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { requireCitizen } from '@/app/(protected)/project/helpers/route-guards'

type AidResult = {
  found: boolean
  beneficiaryName?: string
  nationalId?: string
  phone?: string
  aidType?: string
  numberOfFamily?: number
  address?: string
  notes?: string
  status?: string
  requestNumber?: string
  distributionDate?: string | null
  pickupLocation?: string | null
}

const nationalIdRegex = /^\d{9}$/
const repeatedDigitsRegex = /^(\d)\1+$/

export default function MyAidPage() {
  const router = useRouter()

  useEffect(() => {
    requireCitizen(router)
  }, [router])

  const [nationalId, setNationalId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<AidResult | null>(null)

  const validateNationalId = (value: string) => {
    if (!value) return 'رقم الهوية مطلوب'
    if (!/^\d+$/.test(value)) return 'رقم الهوية يجب أن يحتوي على أرقام فقط'
    if (!nationalIdRegex.test(value)) return 'رقم الهوية يجب أن يحتوي على 9 أرقام'
    if (value === '000000000') return 'رقم الهوية غير صالح'
    if (repeatedDigitsRegex.test(value)) return 'رقم الهوية غير صالح'
    return ''
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    setMessage('')
    setResult(null)

    const validationError = validateNationalId(nationalId)
    if (validationError) {
      setMessage(validationError)
      return
    }

    setLoading(true)

    try {
      const res = await fetch(
        `/api/project/admins/addAid?nationalId=${encodeURIComponent(nationalId)}`
      )
      const data = await res.json()

      if (!res.ok) {
        setMessage(data.message || 'حدث خطأ أثناء الفحص')
      } else {
        setResult(data)
      }
    } catch {
      setMessage('تعذر الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  const getStatusClasses = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'border-amber-200 bg-amber-50 text-amber-700'
      case 'approved':
        return 'border-green-200 bg-green-50 text-green-700'
      case 'delivered':
        return 'border-blue-200 bg-blue-50 text-blue-700'
      case 'rejected':
        return 'border-red-200 bg-red-50 text-red-700'
      case 'done':
        return 'border-blue-200 bg-blue-50 text-blue-700'
      case 'canceled':
        return 'border-red-200 bg-red-50 text-red-700'
      default:
        return 'border-slate-200 bg-slate-50 text-slate-700'
    }
  }

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'قيد المراجعة'
      case 'approved':
        return 'تمت الموافقة'
      case 'delivered':
        return 'تم التسليم'
      case 'rejected':
        return 'مرفوض'
      case 'done':
        return 'تم'
      case 'canceled':
        return 'ملغي'
      default:
        return 'غير معروف'
    }
  }

  return (
    <div className="w-full py-10">
      <div className="mx-auto w-full max-w-[800px] px-4 sm:px-6 space-y-6">
        {/* Title فوق الكارد فقط */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">مساعدتي</h1>
          <p className="text-sm text-slate-500">
            تحقق من حالة طلب المساعدة الخاص بك
          </p>
        </div>

        {/* Search Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                رقم الهوية
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                placeholder="مثال: 123456789"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-right text-sm outline-none transition focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-8 items-center justify-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'جارٍ الفحص...' : 'فحص الحالة'}
              </button>
            </div>
          </form>

          {message && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm text-amber-700">
              {message}
            </div>
          )}
        </div>

        {/* Result Card */}
        {result && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 text-right">
              <h2 className="text-base font-semibold text-slate-900">
                نتيجة الفحص
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                تفاصيل حالة المساعدة المرتبطة برقم الهوية المدخل
              </p>
            </div>

            <div>
              {result.found ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      اسم المستفيد
                    </label>
                    <input
                      type="text"
                      value={result.beneficiaryName || ''}
                      readOnly
                      className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-right text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      رقم الهوية
                    </label>
                    <input
                      type="text"
                      value={result.nationalId || ''}
                      readOnly
                      className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-right text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      رقم الهاتف
                    </label>
                    <input
                      type="text"
                      value={result.phone || ''}
                      readOnly
                      className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-right text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      نوع المساعدة
                    </label>
                    <input
                      type="text"
                      value={result.aidType || ''}
                      readOnly
                      className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-right text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      عدد أفراد الأسرة
                    </label>
                    <input
                      type="text"
                      value={
                        result.numberOfFamily !== undefined &&
                        result.numberOfFamily !== null
                          ? String(result.numberOfFamily)
                          : ''
                      }
                      readOnly
                      className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-right text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      العنوان
                    </label>
                    <input
                      type="text"
                      value={result.address || ''}
                      readOnly
                      className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-right text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      رقم الطلب
                    </label>
                    <input
                      type="text"
                      value={result.requestNumber || ''}
                      readOnly
                      className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-right text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      الحالة
                    </label>
                    <div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${getStatusClasses(
                          result.status
                        )}`}
                      >
                        {getStatusText(result.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      تاريخ التوزيع
                    </label>
                    <input
                      type="text"
                      value={result.distributionDate || 'لم يحدد بعد'}
                      readOnly
                      className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-right text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      مكان الاستلام
                    </label>
                    <input
                      type="text"
                      value={result.pickupLocation || 'سيتم إعلامك لاحقًا'}
                      readOnly
                      className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-right text-sm outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      ملاحظات
                    </label>
                    <textarea
                      rows={5}
                      value={result.notes || 'لا توجد ملاحظات إضافية'}
                      readOnly
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-right text-sm outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-right text-sm text-blue-700">
                  لا توجد مساعدة مخصصة لهذا الرقم حاليًا، أو أن الطلب ما زال قيد المتابعة.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
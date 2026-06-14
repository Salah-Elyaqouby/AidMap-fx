'use client'
import { useState } from 'react'
import { Search, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

type AidResult = {
  found: boolean
  referenceCode?: string | null
  beneficiaryName?: string
  nationalId?: string
  phone?: string | null
  aidType?: string
  numberOfFamily?: number
  address?: string
  notes?: string | null
  adminNotes?: string | null
  status?: string
  requestNumber?: string
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'done':
      return (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 font-semibold text-green-700">
          <CheckCircle className="size-4 shrink-0" />
          <span>تمت الموافقة</span>
        </div>
      )
    case 'canceled':
      return (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 font-semibold text-red-700">
          <XCircle className="size-4 shrink-0" />
          <span>مرفوض</span>
        </div>
      )
    default:
      return (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 font-semibold text-amber-700">
          <Clock className="size-4 shrink-0" />
          <span>قيد المراجعة</span>
        </div>
      )
  }
}

const AID_TYPE_LABELS: Record<string, string> = {
  food: 'مساعدة غذائية',
  medical: 'مساعدة طبية',
  financial: 'مساعدة مالية',
  shelter: 'مساعدة سكن',
}

export default function MyAidPage() {
  const [nationalId, setNationalId] = useState('')
  const [result, setResult] = useState<AidResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = nationalId.trim()

    if (!trimmed) {
      setError('يرجى إدخال رقم الهوية')
      return
    }
    if (!/^\d{9}$/.test(trimmed)) {
      setError('رقم الهوية يجب أن يتكون من 9 أرقام')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`/api/project/users/myAid?nationalId=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data?.message || 'حدث خطأ أثناء الاستعلام')
        return
      }

      setResult(data)
    } catch {
      setError('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 pb-20">
      <div className="mx-auto max-w-2xl px-4 py-10">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Search className="size-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">مساعداتي</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            أدخل رقم هويتك للاطلاع على حالة طلب المساعدة
          </p>
        </div>

        {/* Search card */}
        <form
          onSubmit={handleSearch}
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            رقم الهوية الوطنية
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              inputMode="numeric"
              maxLength={9}
              value={nationalId}
              onChange={(e) => {
                setNationalId(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              placeholder="9 أرقام"
              className={`h-11 flex-1 rounded-xl border px-4 text-sm outline-none transition-all focus:ring-4 ${
                error
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                  : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-blue-100'
              }`}
            />
            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-60"
            >
              {loading ? 'جارٍ البحث...' : 'بحث'}
            </button>
          </div>
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="size-3.5 shrink-0" />
              {error}
            </p>
          )}
        </form>

        {/* Not found */}
        {result && !result.found && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <AlertCircle className="size-6 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700">لا توجد نتائج</p>
            <p className="mt-1 text-sm text-slate-400">
              لم يتم العثور على طلب مرتبط بهذا الرقم
            </p>
          </div>
        )}

        {/* Found */}
        {result?.found && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-slate-800">تفاصيل الطلب</h2>
              <div className="flex flex-col items-end gap-1">
                {result.referenceCode && (
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-semibold text-blue-800">
                    رقم الطلب: {result.referenceCode}
                  </span>
                )}
                {result.requestNumber && (
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-500">
                    #{result.requestNumber.slice(-8).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="اسم المستفيد" value={result.beneficiaryName} />
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400">حالة الطلب</span>
                <StatusBadge status={result.status ?? 'pending'} />
              </div>
              <Field label="نوع المساعدة" value={AID_TYPE_LABELS[result.aidType ?? ''] ?? result.aidType} />
              <Field label="عدد أفراد الأسرة" value={result.numberOfFamily?.toString()} />
              <Field label="رقم الهاتف" value={result.phone ?? undefined} />
              <div className="sm:col-span-2">
                <Field label="العنوان" value={result.address} />
              </div>
              {result.notes ? (
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-400">ملاحظاتك</span>
                  <div className="min-h-[80px] rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {result.notes}
                  </div>
                </div>
              ) : null}
              {result.adminNotes ? (
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-400">
                    ملاحظات الفريق
                  </span>
                  <div className="min-h-[80px] rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {result.adminNotes}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-slate-400">
          نظام الإغاثة الموحد — AidMap {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <div className="flex h-11 items-center rounded-xl border border-slate-100 bg-slate-50 px-4 text-sm font-medium text-slate-700">
        {value || '—'}
      </div>
    </div>
  )
}

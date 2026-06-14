'use client'

import { useState, type ChangeEvent } from 'react'
import { CheckCircle, AlertCircle, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FormData = { name: string; phone: string; numberOfFamily: string; campId: string }
type FormErrors = { name?: string; phone?: string; numberOfFamily?: string }

const arabicNameRegex = /^[؀-ۿ\s]+$/
const phoneRegex = /^(056|059)\d{7}$/

const CAMP_OPTIONS = [
  'مخيم جباليا','مخيم الشاطئ','مخيم النصيرات','مخيم البريج','مخيم المغازي',
  'مخيم دير البلح','مخيم خان يونس','مخيم رفح','مخيم الشابورة','مخيم البرازيل',
  'الشيخ رضوان','تل الهوى','الرمال','الشجاعية','الزيتون',
  'بيت لاهيا','بيت حانون','دير البلح','خان يونس','رفح',
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="size-3 shrink-0" />{msg}
    </p>
  )
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-foreground">
      {children}
      {required && <span className="mr-0.5 text-red-500">*</span>}
    </label>
  )
}

export default function RegisterBeneficiaryPage() {
  const [form, setForm] = useState<FormData>({ name: '', phone: '', numberOfFamily: '', campId: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  const validate = (): FormErrors => ({
    name: !form.name.trim()
      ? 'الاسم مطلوب'
      : !arabicNameRegex.test(form.name)
        ? 'الاسم يجب أن يكون باللغة العربية فقط'
        : /\s{2,}/.test(form.name)
          ? 'لا يمكن وضع أكثر من مسافة بين الكلمات'
          : undefined,
    phone: !form.phone
      ? 'رقم الهاتف مطلوب'
      : !phoneRegex.test(form.phone)
        ? 'يجب أن يبدأ بـ 056 أو 059'
        : undefined,
    numberOfFamily: !form.numberOfFamily
      ? 'عدد أفراد الأسرة مطلوب'
      : Number(form.numberOfFamily) < 1 || Number(form.numberOfFamily) > 99
        ? 'يجب أن يكون بين 1 و 99'
        : undefined,
  })

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const next = (name === 'phone' || name === 'numberOfFamily') ? value.replace(/\D/g, '') : value
    setForm(prev => ({ ...prev, [name]: next }))
    setServerError('')
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    const errs = validate()
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return

    setLoading(true)
    try {
      const res = await fetch('/api/project/admins/adminBeneficiary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone,
          numberOfFamily: Number(form.numberOfFamily),
          campId: form.campId || null,
          role: 'CITIZEN',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setServerError(data?.message || 'فشل في تسجيل البيانات')
      } else {
        setSuccess(true)
        setForm({ name: '', phone: '', numberOfFamily: '', campId: '' })
        setErrors({})
      }
    } catch {
      setServerError('تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="size-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">تم التسجيل بنجاح!</h2>
          <p className="mt-2 text-sm text-muted-foreground">تمت إضافة بيانات المستفيد إلى النظام.</p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-6 text-sm font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
          >
            تسجيل مستفيد آخر
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-muted/30 px-4 py-10">
      <div className="mx-auto w-full max-w-xl">

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">تسجيل مستفيد جديد</h1>
          <p className="mt-2 text-sm text-muted-foreground">يرجى تعبئة البيانات بدقة لضمان وصول المساعدة</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <form onSubmit={onSubmit} className="space-y-5">

            {serverError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="size-4 shrink-0" />{serverError}
              </div>
            )}

            <div>
              <Label required>الاسم الكامل</Label>
              <Input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="مثال: علي أحمد محمود"
                className={errors.name ? 'border-red-400' : ''}
              />
              <FieldError msg={errors.name} />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label required>رقم الهاتف</Label>
                <Input
                  name="phone"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={onChange}
                  placeholder="059XXXXXXXX"
                  className={errors.phone ? 'border-red-400' : ''}
                />
                <FieldError msg={errors.phone} />
              </div>
              <div>
                <Label required>عدد أفراد الأسرة</Label>
                <Input
                  name="numberOfFamily"
                  inputMode="numeric"
                  maxLength={2}
                  value={form.numberOfFamily}
                  onChange={onChange}
                  placeholder="مثال: 5"
                  className={errors.numberOfFamily ? 'border-red-400' : ''}
                />
                <FieldError msg={errors.numberOfFamily} />
              </div>
            </div>

            <div>
              <Label>المخيم / المنطقة <span className="text-xs font-normal text-muted-foreground">(اختياري)</span></Label>
              <select
                name="campId"
                value={form.campId}
                onChange={onChange}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">اختر المخيم أو المنطقة</option>
                {CAMP_OPTIONS.map(camp => (
                  <option key={camp} value={camp}>{camp}</option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              {loading ? 'جارٍ التسجيل...' : 'تسجيل البيانات'}
            </Button>

          </form>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          نظام الإغاثة الموحد — AidMap {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

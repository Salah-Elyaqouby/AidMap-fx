'use client'

import { useState } from 'react'
import { CheckCircle, AlertCircle, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FormErrors = {
  fullName?: string
  nationalId?: string
  phone?: string
  aidType?: string
  familyCount?: string
  address?: string
}

const phoneRegex = /^(056|059)\d{7}$/
const nationalIdRegex = /^\d{9}$/
const repeatedDigitsRegex = /^(\d)\1+$/

const AID_TYPES = [
  { value: 'food', label: 'مساعدة غذائية' },
  { value: 'medical', label: 'مساعدة طبية' },
  { value: 'financial', label: 'مساعدة مالية' },
  { value: 'shelter', label: 'مساعدة سكن' },
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="size-3 shrink-0" />
      {msg}
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

export default function RequestAidPage() {
  const [fullName, setFullName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [phone, setPhone] = useState('')
  const [aidType, setAidType] = useState('')
  const [familyCount, setFamilyCount] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [referenceCode, setReferenceCode] = useState<string | null>(null)
  const [serverError, setServerError] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): FormErrors => ({
    fullName: !fullName.trim() ? 'الاسم مطلوب' : undefined,
    nationalId: !nationalId
      ? 'رقم الهوية مطلوب'
      : !nationalIdRegex.test(nationalId)
        ? 'يجب أن يتكون من 9 أرقام'
        : repeatedDigitsRegex.test(nationalId)
          ? 'رقم هوية غير صالح'
          : undefined,
    phone: !phone
      ? 'رقم الجوال مطلوب'
      : !phoneRegex.test(phone)
        ? 'يجب أن يبدأ بـ 056 أو 059'
        : undefined,
    aidType: !aidType ? 'يرجى اختيار نوع المساعدة' : undefined,
    familyCount: !familyCount || Number(familyCount) < 1 || Number(familyCount) > 20
      ? 'العدد يجب أن يكون بين 1 و 20'
      : undefined,
    address: !address.trim() ? 'العنوان مطلوب' : undefined,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    const errs = validate()
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return

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

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setServerError(data?.message || 'فشل في إرسال الطلب، يرجى المحاولة مرة أخرى.')
      } else {
        // بما أن السكيما ليس بها referenceCode، نأخذ أول جزء من الـ ID التلقائي
        const orderId = data?.data?.id
        const shortCode = orderId ? orderId.split('-')[0].toUpperCase() : 'DONE'
        
        setReferenceCode(shortCode)
        setSuccess(true)
        
        // إعادة تعيين الحقول
        setFullName(''); setNationalId(''); setPhone(''); setAidType('')
        setFamilyCount(''); setAddress(''); setNotes(''); setErrors({})
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
          <h2 className="text-xl font-bold text-foreground">تم إرسال طلبك بنجاح!</h2>
          {referenceCode ? (
            <p className="mt-4 rounded-xl bg-muted px-4 py-3 font-mono text-lg font-semibold tracking-wide text-foreground">
              رقم الطلب: {referenceCode}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground">
            سيتم مراجعة طلبك من قِبل الفريق المختص والتواصل معك قريباً. احتفظ برقم الطلب لتتبع الحالة من صفحة &quot;مساعداتي&quot;.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/users/myAid"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              تتبع الطلب — مساعداتي
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccess(false)
                setReferenceCode(null)
              }}
              className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              تقديم طلب آخر
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-muted/30 px-4 py-10">
      <div className="mx-auto w-full max-w-xl">

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">طلب مساعدة إغاثية</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            يرجى إدخال بياناتك بدقة لضمان وصول المساعدة في أسرع وقت ممكن
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {serverError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                <AlertCircle className="size-4 shrink-0" />
                {serverError}
              </div>
            )}

            <div>
              <Label required>الاسم الكامل (رباعي)</Label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="مثال: محمد أحمد محمود علي"
                className={errors.fullName ? 'border-red-400' : ''}
              />
              <FieldError msg={errors.fullName} />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label required>رقم الهوية</Label>
                <Input
                  inputMode="numeric"
                  maxLength={9}
                  value={nationalId}
                  onChange={e => setNationalId(e.target.value.replace(/\D/g, ''))}
                  placeholder="9 أرقام"
                  className={errors.nationalId ? 'border-red-400' : ''}
                />
                <FieldError msg={errors.nationalId} />
              </div>
              <div>
                <Label required>رقم الجوال</Label>
                <Input
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="05xxxxxxxx"
                  className={errors.phone ? 'border-red-400' : ''}
                />
                <FieldError msg={errors.phone} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label required>نوع المساعدة</Label>
                <select
                  value={aidType}
                  onChange={e => setAidType(e.target.value)}
                  className={`h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${errors.aidType ? 'border-red-400' : 'border-input'}`}
                >
                  <option value="">اختر النوع...</option>
                  {AID_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <FieldError msg={errors.aidType} />
              </div>
              <div>
                <Label required>عدد أفراد الأسرة</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={familyCount}
                  onChange={e => setFamilyCount(e.target.value)}
                  placeholder="مثال: 5"
                  className={errors.familyCount ? 'border-red-400' : ''}
                />
                <FieldError msg={errors.familyCount} />
              </div>
            </div>

            <div>
              <Label required>العنوان بالتفصيل</Label>
              <Input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="المدينة، الحي، الشارع"
                className={errors.address ? 'border-red-400' : ''}
              />
              <FieldError msg={errors.address} />
            </div>

            <div>
              <Label>ملاحظات أو احتياجات خاصة</Label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="أي معلومات إضافية تود ذكرها..."
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {loading ? 'جارٍ الإرسال...' : 'إرسال طلب المساعدة'}
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
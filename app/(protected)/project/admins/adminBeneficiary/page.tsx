'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { requireAdmin } from '@/app/(protected)/project/helpers/route-guards'
import { Card, CardContent } from '../../../../../components/ui/card'
import { Button } from '../../../../../components/ui/button'
import { Input } from '../../../../../components/ui/input'

type FormData = {
  name: string
  phone: string
  numberOfFamily: string
  campId: string
}

type FormErrors = {
  name?: string
  phone?: string
  numberOfFamily?: string
  campId?: string
  general?: string
}

const arabicNameRegex = /^[\u0600-\u06FF\s]+$/
const phoneRegex = /^(056|059)\d{7}$/
const familyRegex = /^\d{1,2}$/

const gazaCampOptions = [
  'مخيم جباليا',
  'مخيم الشاطئ',
  'مخيم النصيرات',
  'مخيم البريج',
  'مخيم المغازي',
  'مخيم دير البلح',
  'مخيم خان يونس',
  'مخيم رفح',
  'مخيم الشابورة',
  'مخيم البرازيل',
  'الشيخ رضوان',
  'تل الهوى',
  'الرمال',
  'الشجاعية',
  'الزيتون',
  'بيت لاهيا',
  'بيت حانون',
  'دير البلح',
  'خان يونس',
  'رفح',
]

export default function AdminBeneficiaryPage() {
  const router = useRouter()

  useEffect(() => {
    requireAdmin(router)
  }, [router])

  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    numberOfFamily: '',
    campId: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const validateField = (name: keyof FormData, value: string) => {
    switch (name) {
      case 'name':
        if (!value) return 'الاسم مطلوب'
        if (value.trim().length === 0) return 'الاسم مطلوب'
        if (value !== value.trim()) return 'الاسم لا يجب أن يبدأ أو ينتهي بمسافة'
        if (!arabicNameRegex.test(value)) {
          return 'الاسم يجب أن يكون باللغة العربية فقط'
        }
        if (/\s{2,}/.test(value)) {
          return 'لا يمكن وضع أكثر من مسافة بين الكلمات'
        }
        return ''

      case 'phone':
        if (!value) return 'رقم الهاتف مطلوب'
        if (!/^\d+$/.test(value)) return 'رقم الهاتف يجب أن يحتوي على أرقام فقط'
        if (!phoneRegex.test(value)) {
          return 'رقم الهاتف يجب أن يبدأ بـ 056 أو 059 وبعده 7 أرقام'
        }
        return ''

      case 'numberOfFamily':
        if (!value) return 'عدد أفراد الأسرة مطلوب'
        if (!/^\d+$/.test(value)) return 'عدد أفراد الأسرة يجب أن يحتوي على أرقام فقط'
        if (!familyRegex.test(value)) {
          return 'عدد أفراد الأسرة يجب أن يكون من رقم أو رقمين فقط'
        }
        return ''

      case 'campId':
        return ''

      default:
        return ''
    }
  }

  const validateForm = () => {
    const newErrors: FormErrors = {
      name: validateField('name', form.name),
      phone: validateField('phone', form.phone),
      numberOfFamily: validateField('numberOfFamily', form.numberOfFamily),
      campId: validateField('campId', form.campId),
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some(Boolean)
  }

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    let nextValue = value

    if (name === 'phone' || name === 'numberOfFamily') {
      nextValue = value.replace(/\D/g, '')
    }

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }))

    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name as keyof FormData, nextValue),
      general: '',
    }))

    setErrorMsg('')
    setSuccessMsg('')
  }

  const onSubmit = async () => {
    setLoading(true)
    setSuccessMsg('')
    setErrorMsg('')
    setErrors({})

    const isValid = validateForm()

    if (!isValid) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/project/admins/adminBeneficiary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          numberOfFamily: Number(form.numberOfFamily),
          campId: form.campId || null,
          role: 'CITIZEN',
        }),
      })

      const contentType = res.headers.get('content-type') || ''
      const data = contentType.includes('application/json')
        ? await res.json()
        : null

      if (!res.ok) {
        throw new Error(data?.message || 'فشل في إضافة المستفيد')
      }

      setSuccessMsg('تمت إضافة المستفيد بنجاح')
      setForm({
        name: '',
        phone: '',
        numberOfFamily: '',
        campId: '',
      })
      setErrors({})
    } catch (error: any) {
      setErrorMsg(error.message || 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full py-10">
      <div className="mx-auto w-full max-w-[800px] px-4 sm:px-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">إضافة مستفيد جديد</h1>
          <p className="text-sm text-slate-500">
            أدخل بيانات المستفيد ليتم إضافته من قبل الأدمن إلى النظام
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-5">
              <div className="mx-auto w-full max-w-[700px] space-y-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    الاسم الكامل
                  </label>
                  <Input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    placeholder="مثال: علي أحمد"
                    className="h-10 rounded-md border-slate-200 bg-white px-3 text-right text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-blue-600"
                    autoComplete="off"
                  />
                  {errors.name && (
                    <div className="text-right text-sm text-red-600">
                      {errors.name}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    رقم الهاتف
                  </label>
                  <Input
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    placeholder="059XXXXXXX"
                    className="h-10 rounded-md border-slate-200 bg-white px-3 text-right text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-blue-600"
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={10}
                  />
                  {errors.phone && (
                    <div className="text-right text-sm text-red-600">
                      {errors.phone}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    عدد أفراد الأسرة
                  </label>
                  <Input
                    name="numberOfFamily"
                    type="text"
                    value={form.numberOfFamily}
                    onChange={onChange}
                    placeholder="مثال: 5"
                    className="h-10 rounded-md border-slate-200 bg-white px-3 text-right text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-blue-600"
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={2}
                  />
                  {errors.numberOfFamily && (
                    <div className="text-right text-sm text-red-600">
                      {errors.numberOfFamily}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    المخيم / المنطقة
                  </label>
                  <select
                    name="campId"
                    value={form.campId}
                    onChange={onChange}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-right text-sm outline-none transition focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">اختر المخيم أو المنطقة (اختياري)</option>
                    {gazaCampOptions.map((campName) => (
                      <option key={campName} value={campName}>
                        {campName}
                      </option>
                    ))}
                  </select>

                  {errors.campId && (
                    <div className="text-right text-sm text-red-600">
                      {errors.campId}
                    </div>
                  )}
                </div>

                {successMsg && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-right text-sm text-green-700">
                    {successMsg}
                  </div>
                )}

                {errorMsg && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-700">
                    {errorMsg}
                  </div>
                )}

                <div className="flex justify-center pt-2">
                  <Button
                    className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={onSubmit}
                    disabled={loading}
                  >
                    {loading ? 'جاري الإضافة...' : 'إضافة المستفيد'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
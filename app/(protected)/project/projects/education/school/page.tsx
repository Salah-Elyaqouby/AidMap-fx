'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Pencil, Plus, Search, Loader2, AlertCircle } from 'lucide-react'

// --- استدعاء الحماية ---
import { requireAdmin } from '@/app/(protected)/project/helpers/route-guards'

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
const STUDY_DAYS = ['السبت الاثنين الأربعاء', 'الأحد الثلاثاء الخميس', 'يومي']
const SHIFTS = ['صباحي', 'مسائي', 'ثنائي']
const FEES_OPTIONS = ['مجاني', 'برسوم']

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
  latitude: number | null
  longitude: number | null
}

const emptyForm = {
  name: '', location: '', region: '', level: '', studyDays: '', timing: '',
  fees: 0, feesStatus: 'مجاني', schoolType: '', gender: '', totalCount: 0, latitude: '', longitude: '',
}

const sel = 'w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-right text-sm outline-none focus:ring-2 focus:ring-blue-200'

export default function SchoolsPage() {
  const router = useRouter()

  // --- حماية الصفحة ---
  const [isVerifying, setIsVerifying] = useState(true)

  const [q, setQ] = useState('')
  const [items, setItems] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<School | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 1. حماية الصفحة - أول شي ينشغل
  useEffect(() => {
    async function checkAccess() {
      await requireAdmin(router)
      setIsVerifying(false)
    }
    checkAccess()
  }, [router])

  // 2. جلب البيانات بس بعد ما تنتهي الحماية
  const fetchData = () => {
    setLoading(true)
    fetch('/api/project/education/schools')
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d.schools) ? d.schools : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isVerifying) fetchData()
  }, [isVerifying])

  const filtered = useMemo(() =>
    items.filter(s =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      (s.location || '').includes(q) ||
      (s.region || '').includes(q)
    ),
    [items, q]
  )

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(''); setOpen(true) }
  const openEdit = (s: School) => {
    setEditing(s)
    setForm({
      name: s.name, location: s.location || '', region: s.region || '',
      level: s.level || '', studyDays: s.studyDays || '', timing: s.timing || '',
      fees: s.fees, feesStatus: s.fees > 0 ? 'برسوم' : 'مجاني',
      schoolType: s.schoolType || '', gender: s.gender || '',
      totalCount: s.totalCount, latitude: s.latitude?.toString() || '', longitude: s.longitude?.toString() || '',
    })
    setError(''); setOpen(true)
  }

  const isValid = form.name.trim() !== '' && form.schoolType !== '' && form.gender !== '' && form.level !== ''

  const handleSave = async () => {
    if (!isValid) { setError('يرجى تعبئة الحقول المطلوبة'); return }
    setSaving(true)
    const payload = {
      ...form,
      fees: form.feesStatus === 'مجاني' ? 0 : Number(form.fees),
      totalCount: Number(form.totalCount) || 0,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null
    }
    try {
      const url = editing ? `/api/project/education/schools?id=${editing.id}` : '/api/project/education/schools'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'حدث خطأ أثناء حفظ البيانات')
        return
      }
      setOpen(false)
      fetchData()
    } catch {
      setError('فشل الاتصال بالخادم')
    } finally { setSaving(false) }
  }

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  // 3. شاشة التحقق
  if (isVerifying) return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="w-full px-4 py-6 font-arabic" dir="rtl">
      <div className="mb-6 flex items-center justify-between">
        <div className="text-right">
          <h1 className="text-2xl font-bold text-slate-900">إدارة المدارس</h1>
          <p className="text-sm text-slate-500 mt-1">الرئيسية &gt; إعدادات المنظومة</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/project/projects/education/school/query')} className="gap-2">
          <Search className="w-4 h-4" /> نظام الفلترة
        </Button>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm rounded-xl bg-white">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-3 border-b">
            <div className="relative w-full max-w-xs">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالاسم أو المنطقة..." className="w-full pr-10 bg-slate-50 border-none h-10 rounded-lg text-sm text-right" />
            </div>
            <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 h-10 px-4 rounded-lg font-bold shadow-sm mr-auto gap-2">
              <Plus className="h-4 w-4" /> إضافة مدرسة
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b font-bold text-slate-600">
                <tr>
                  {['اسم المدرسة', 'الموقع / المنطقة', 'النوع', 'الجنس', 'المرحلة', 'عدد الطلاب', 'التوقيت', 'الرسوم', 'إجراءات'].map(h => (
                    <th key={h} className="p-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="p-10 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6 text-slate-300" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-10 text-center text-slate-400">لا توجد سجلات حالياً</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-700">{s.name}</td>
                    <td className="p-4 text-slate-600">{[s.location, s.region].filter(Boolean).join(' - ') || '—'}</td>
                    <td className="p-4 text-slate-500">{s.schoolType || '—'}</td>
                    <td className="p-4">
                      {s.gender && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.gender === 'ذكور' ? 'bg-blue-50 text-blue-700' : s.gender === 'إناث' ? 'bg-pink-50 text-pink-700' : 'bg-purple-50 text-purple-700'}`}>
                          {s.gender}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">{s.level || '—'}</td>
                    <td className="p-4 text-slate-500">{s.totalCount > 0 ? s.totalCount.toLocaleString('ar') : '—'}</td>
                    <td className="p-4 text-slate-500">{s.timing || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.fees > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                        {s.fees > 0 ? `${s.fees} ₪` : 'مجاني'}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button size="sm" variant="outline" onClick={() => openEdit(s)} className="gap-1">
                        <Pencil className="w-3 h-3" /> تعديل
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-right">{editing ? 'تعديل بيانات المدرسة' : 'إضافة مدرسة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4 text-right">
            {error && <p className="col-span-2 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">اسم المدرسة *</label>
              <Input className="h-11 bg-slate-50 text-right" value={form.name} onChange={f('name')} placeholder="أدخل اسم المدرسة" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">نوع المدرسة *</label>
              <select className={sel} value={form.schoolType} onChange={f('schoolType')}>
                <option value="">اختر النوع</option>
                {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">الجنس *</label>
              <select className={sel} value={form.gender} onChange={f('gender')}>
                <option value="">اختر</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">المرحلة الدراسية *</label>
              <select className={sel} value={form.level} onChange={f('level')}>
                <option value="">اختر المرحلة</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">عدد الطلاب الكلي</label>
              <Input className="h-11 bg-slate-50 text-right" type="number" value={form.totalCount} onChange={f('totalCount')} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">الموقع (المحافظة)</label>
              <select className={sel} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value, region: '' }))}>
                <option value="">اختر الموقع</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">المنطقة</label>
              <select className={sel} value={form.region} onChange={f('region')} disabled={!form.location}>
                <option value="">اختر المنطقة</option>
                {form.location && (AREAS_BY_LOCATION[form.location] || []).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">أيام الدراسة</label>
              <select className={sel} value={form.studyDays} onChange={f('studyDays')}>
                <option value="">اختر الأيام</option>
                {STUDY_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">التوقيت</label>
              <select className={sel} value={form.timing} onChange={f('timing')}>
                <option value="">اختر التوقيت</option>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">الرسوم</label>
              <select className={sel} value={form.feesStatus} onChange={f('feesStatus')}>
                {FEES_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {form.feesStatus === 'برسوم' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">مبلغ الرسوم (₪)</label>
                <Input className="h-11 bg-slate-50 text-right" type="number" value={form.fees} onChange={f('fees')} />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">خط العرض (Latitude)</label>
              <Input className="h-11 bg-slate-50 text-right" value={form.latitude} onChange={f('latitude')} placeholder="31.5..." />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">خط الطول (Longitude)</label>
              <Input className="h-11 bg-slate-50 text-right" value={form.longitude} onChange={f('longitude')} placeholder="34.4..." />
            </div>

            {!isValid && (
              <div className="col-span-2 text-xs text-amber-600 flex items-center gap-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> يرجى تعبئة الحقول المطلوبة: الاسم، النوع، الجنس، المرحلة
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-row gap-3">
            <Button onClick={handleSave} disabled={!isValid || saving} className="flex-1 bg-blue-600 text-white font-bold h-11 rounded-xl">
              {saving && <Loader2 className="animate-spin w-4 h-4 ml-2" />}
              {editing ? 'حفظ التعديلات' : 'إضافة المدرسة'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
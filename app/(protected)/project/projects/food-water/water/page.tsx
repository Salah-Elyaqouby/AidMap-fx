'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Pencil, Plus, Search, Loader2 } from 'lucide-react'

import { requireAdmin } from '@/app/(protected)/project/helpers/route-guards'

const REGIONS = ['شمال', 'جنوب', 'شرق', 'غرب', 'وسط'] as const
const STATUS_OPTIONS = ['نشط', 'متوقف مؤقتاً', 'متوقف'] as const

type WaterPoint = {
  id: string
  name: string
  lat: number | null
  lng: number | null
  operator: string
  statusText: string
}

const EMPTY_FORM: Omit<WaterPoint, 'id'> = {
  name: '', lat: null, lng: null, operator: '', statusText: ''
}

export default function WaterPointsPage() {
  const router = useRouter()

  const [isVerifying, setIsVerifying] = useState(true)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<WaterPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<WaterPoint | null>(null)
  const [formData, setFormData] = useState<Omit<WaterPoint, 'id'>>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // 1. حماية الصفحة
  useEffect(() => {
    async function checkAccess() {
      await requireAdmin(router)
      setIsVerifying(false)
    }
    checkAccess()
  }, [router])

  // 2. جلب البيانات بعد التحقق
  const fetchPoints = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/project/food-water/water')
      const data = await res.json()
      setItems(Array.isArray(data?.data) ? data.data : [])
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isVerifying) fetchPoints()
  }, [isVerifying])

  const filtered = useMemo(() =>
    items.filter(s => !q || s.name.includes(q) || s.operator.includes(q) || s.statusText.includes(q)),
    [q, items]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paged = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage])

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const rangeEnd = Math.min(currentPage * itemsPerPage, filtered.length)

  const openAdd = () => { setFormData(EMPTY_FORM); setAddOpen(true) }
  const openEdit = (item: WaterPoint) => {
    setEditItem(item)
    setFormData({ name: item.name, lat: item.lat, lng: item.lng, operator: item.operator, statusText: item.statusText })
  }

  const isValid = (d: typeof formData) =>
    d.name.trim() !== '' && d.operator !== '' && d.statusText !== '' && d.lat !== null && d.lng !== null

  const onAdd = async () => {
    if (!isValid(formData)) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/project/food-water/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok && data.data) {
        setItems(prev => [data.data, ...prev])
        setAddOpen(false)
        setCurrentPage(1)
      }
    } finally { setSubmitting(false) }
  }

  const onEdit = async () => {
    if (!editItem || !isValid(formData)) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/project/food-water/water?id=${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok && data.data) {
        setItems(prev => prev.map(p => p.id === editItem.id ? data.data : p))
        setEditItem(null)
      }
    } finally { setSubmitting(false) }
  }

  // 3. شاشة التحقق
  if (isVerifying) return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="w-full px-4 py-6" dir="rtl">
      <div className="mb-6 flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">نقاط توزيع المياه</h1>
          <p className="text-sm text-muted-foreground">{loading ? 'جاري التحميل...' : `${items.length} نقطة مياه`}</p>
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm rounded-xl">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-3 border-b">
            <div className="relative w-full max-w-xs">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={e => { setQ(e.target.value); setCurrentPage(1) }}
                placeholder="ابحث باسم النقطة أو المنطقة..."
                className="h-10 pr-10"
              />
            </div>
            <Button onClick={openAdd} className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 gap-2 sm:mr-auto">
              <Plus className="h-4 w-4" /> إضافة نقطة
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="p-4 font-semibold text-muted-foreground">اسم النقطة</th>
                  <th className="p-4 font-semibold text-muted-foreground">الموقع / المنطقة</th>
                  <th className="p-4 font-semibold text-muted-foreground">الإحداثيات</th>
                  <th className="p-4 font-semibold text-muted-foreground">الحالة</th>
                  <th className="p-4 text-center font-semibold text-muted-foreground">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={5} className="p-16 text-center text-muted-foreground italic">لا توجد نقاط مياه</td></tr>
                ) : paged.map(item => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-bold text-foreground">{item.name}</td>
                    <td className="p-4 text-muted-foreground">{item.operator || '—'}</td>
                    <td className="p-4 font-mono text-muted-foreground text-xs">
                      {item.lat && item.lng ? `${Number(item.lat).toFixed(4)}, ${Number(item.lng).toFixed(4)}` : '—'}
                    </td>
                    <td className="p-4">
                      {item.statusText
                        ? <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            item.statusText === 'نشط' ? 'bg-green-100 text-green-700' :
                            item.statusText === 'متوقف' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>{item.statusText}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => openEdit(item)} className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-md border text-muted-foreground" title="تعديل">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 flex items-center justify-between border-t bg-muted/20">
            <span className="text-xs text-muted-foreground">{rangeStart} - {rangeEnd} / {filtered.length}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>السابق</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>التالي</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-bold text-blue-800">إضافة نقطة مياه</DialogTitle>
          </DialogHeader>
          <FormFields formData={formData} setFormData={setFormData} />
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-3">
            <Button onClick={onAdd} disabled={submitting || !isValid(formData)} className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 rounded-xl text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1 h-11 rounded-xl">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={open => { if (!open) setEditItem(null) }}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-bold text-blue-800">تعديل نقطة مياه</DialogTitle>
          </DialogHeader>
          <FormFields formData={formData} setFormData={setFormData} />
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-3">
            <Button onClick={onEdit} disabled={submitting || !isValid(formData)} className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 rounded-xl text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التعديلات'}
            </Button>
            <Button variant="outline" onClick={() => setEditItem(null)} className="flex-1 h-11 rounded-xl">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FormFields({
  formData,
  setFormData,
}: {
  formData: Omit<WaterPoint, 'id'>
  setFormData: React.Dispatch<React.SetStateAction<Omit<WaterPoint, 'id'>>>
}) {
  return (
    <div className="flex flex-col gap-4 py-4 text-right">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">اسم النقطة *</label>
        <Input className="h-11" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="اسم نقطة المياه" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">الموقع / المنطقة *</label>
        <select
          className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          value={formData.operator}
          onChange={e => setFormData(f => ({ ...f, operator: e.target.value }))}
        >
          <option value="">— اختر المنطقة —</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">خط العرض (Lat) *</label>
          <Input className="h-11 font-mono" type="number" step="any" value={formData.lat ?? ''} onChange={e => setFormData(f => ({ ...f, lat: e.target.value ? Number(e.target.value) : null }))} placeholder="31.5" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">خط الطول (Lng) *</label>
          <Input className="h-11 font-mono" type="number" step="any" value={formData.lng ?? ''} onChange={e => setFormData(f => ({ ...f, lng: e.target.value ? Number(e.target.value) : null }))} placeholder="34.4" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">الحالة *</label>
        <select
          className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          value={formData.statusText}
          onChange={e => setFormData(f => ({ ...f, statusText: e.target.value }))}
        >
          <option value="">— اختر الحالة —</option>
          {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>
    </div>
  )
}
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '../../../../../../components/ui/card'
import { Button } from '../../../../../../components/ui/button'
import { Input } from '../../../../../../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../../../components/ui/dialog'
import { Pencil, Save, X, Plus, Search, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

type ClinicStatus = 'مفتوحة' | 'مغلقة'

type Clinic = {
  id: string
  nameAr: string
  specialtyAr: string
  capacityPerDay: number
  status: ClinicStatus
}

type FieldErrors = Partial<Record<'nameAr' | 'specialtyAr' | 'capacityPerDay' | 'status', string>>

const SPECIALTIES = [
  'طب عام', 'أطفال', 'نساء وتوليد', 'طوارئ', 'صحة نفسية', 'تغذية علاجية',
  'طب أسنان', 'باطنية', 'أمراض جلدية', 'علاج طبيعي', 'مختبر', 'صيدلية'
]

const toIntOnly = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

export default function ClinicsPage() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Clinic[]>([])
  const [statusFilter, setStatusFilter] = useState<'الكل' | 'مفتوحة' | 'مغلقة'>('الكل')

  // --- Updated Pagination States ---
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // --- Add State ---
  const [addOpen, setAddOpen] = useState(false)
  const [nameAr, setNameAr] = useState('')
  const [specialtyAr, setSpecialtyAr] = useState('طب عام')
  const [capacityPerDay, setCapacityPerDay] = useState<number>(0)
  const [status, setStatus] = useState<ClinicStatus>('مفتوحة')
  const [addFieldErrors, setAddFieldErrors] = useState<FieldErrors>({})

  // --- Edit State ---
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Omit<Clinic, 'id'>>({
    nameAr: '',
    specialtyAr: 'طب عام',
    capacityPerDay: 1,
    status: 'مفتوحة',
  })

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fixedIconButtonClass = 'inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border'

  const fetchClinics = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/project/projects/clinic', { method: 'GET', cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'فشل في جلب البيانات')
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClinics() }, [])

  const filtered = useMemo(() => {
    const s = q.trim()
    return items.filter((c) => {
      const matchSearch = !s || c.nameAr.includes(s) || c.specialtyAr.includes(s)
      const matchStatus = statusFilter === 'الكل' || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [q, items, statusFilter])

  // --- Updated Pagination Logic ---
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  useEffect(() => { setCurrentPage(1) }, [q, statusFilter, itemsPerPage])

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const rangeEnd = Math.min(currentPage * itemsPerPage, filtered.length)

  // --- دالة الإضافة ---
  const onAdd = async () => {
    setAddFieldErrors({})
    if (!nameAr.trim()) {
      setAddFieldErrors({ nameAr: 'اسم العيادة مطلوب' })
      return
    }

    try {
      setSubmitting(true)
      const body = { 
        nameAr: nameAr.trim(), 
        specialtyAr, 
        capacityPerDay, 
        status 
      }
      
      const res = await fetch('/api/project/projects/clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'فشلت الإضافة')
      
      setItems((prev) => [data, ...prev])
      setAddOpen(false)
      setNameAr('')
      setSpecialtyAr('طب عام')
      setCapacityPerDay(0)
      setStatus('مفتوحة')
      setCurrentPage(1)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'خطأ أثناء الإضافة')
    } finally {
      setSubmitting(false)
    }
  }

  // --- دالة الحفظ (التعديل) ---
  const saveEditRow = async (id: string) => {
    try {
      setSubmitting(true)
      const res = await fetch(`/api/project/projects/clinic?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDraft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'فشل التعديل')
      setItems((prev) => prev.map((c) => (c.id === id ? data : c)))
      setEditingId(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'خطأ أثناء التعديل')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full px-2 py-3 sm:px-4 sm:py-5 lg:px-6">
      <div className="mb-6 text-right">
        <div className="text-xl font-semibold text-foreground lg:text-2xl font-sans">العيادات</div>
        <div className="text-sm text-muted-foreground">الرئيسية {'>'} <span className="text-foreground">إدارة العيادات</span></div>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm rounded-xl">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b bg-white">
            <div className="flex items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن عيادة..." className="pr-9 h-10 border-slate-200" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="h-10 border border-slate-200 rounded-md px-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="الكل">كل الحالات</option>
                <option value="مفتوحة">مفتوحة</option>
                <option value="مغلقة">مغلقة</option>
              </select>
            </div>
            <Button className="!bg-blue-600 hover:!bg-blue-700 text-white h-10 px-5 gap-2 font-bold" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> إضافة عيادة
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[700px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-5 py-4 font-bold text-slate-600 text-sm">اسم العيادة</th>
                  <th className="px-5 py-4 font-bold text-slate-600 text-sm">التخصص</th>
                  <th className="px-5 py-4 font-bold text-slate-600 text-sm">السعة اليومية</th>
                  <th className="px-5 py-4 font-bold text-slate-600 text-sm text-center">الحالة</th>
                  <th className="px-5 py-4 font-bold text-slate-600 text-sm text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6 text-blue-600" /></td></tr>
                ) : paginatedItems.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic">لا توجد عيادات للعرض.</td></tr>
                ) : paginatedItems.map((c) => {
                  const isEditing = editingId === c.id
                  return (
                    <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${isEditing ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-5 py-4">
                        {isEditing ? <Input value={editDraft.nameAr} onChange={(e) => setEditDraft({...editDraft, nameAr: e.target.value})} /> : <span className="font-medium text-slate-700">{c.nameAr}</span>}
                      </td>
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <select 
                            value={editDraft.specialtyAr} 
                            onChange={(e) => setEditDraft({...editDraft, specialtyAr: e.target.value})}
                            className="w-full h-10 rounded-md border border-slate-200 bg-background px-3"
                          >
                            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : <span className="text-slate-600">{c.specialtyAr}</span>}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {isEditing ? <Input type="text" value={String(editDraft.capacityPerDay)} onChange={(e) => setEditDraft({...editDraft, capacityPerDay: toIntOnly(e.target.value)})} /> : c.capacityPerDay}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isEditing ? (
                          <select 
                            value={editDraft.status} 
                            onChange={(e) => setEditDraft({...editDraft, status: e.target.value as ClinicStatus})}
                            className="h-10 border border-slate-200 rounded-md px-2 text-sm bg-white outline-none"
                          >
                            <option value="مفتوحة">مفتوحة</option>
                            <option value="مغلقة">مغلقة</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${c.status === 'مفتوحة' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {c.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {!isEditing ? (
                            <button onClick={() => { setEditingId(c.id); setEditDraft(c); }} className={fixedIconButtonClass}><Pencil className="size-4 text-slate-500" /></button>
                          ) : (
                            <>
                              <Button onClick={() => saveEditRow(c.id)} size="sm" className="h-9 bg-green-600 hover:bg-green-700" disabled={submitting}>حفظ</Button>
                              <Button variant="outline" onClick={() => setEditingId(null)} size="sm" className="h-9 border-slate-200" disabled={submitting}>إلغاء</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* --- Updated Pagination Footer --- */}
          <div className="p-4 flex items-center justify-between border-t bg-slate-50/30">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>عرض صفوف:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => setItemsPerPage(Number(e.target.value))} 
                className="border rounded-md h-8 px-1 bg-white outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500 font-medium">
                {rangeStart} - {rangeEnd} <span className="mx-1 text-slate-300">|</span> من {filtered.length}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 border-slate-200 hover:bg-white font-normal" 
                  disabled={currentPage <= 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  السابق
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 border-slate-200 hover:bg-white font-normal" 
                  disabled={currentPage >= totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="text-right sm:max-w-[425px] rounded-2xl border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold text-slate-800 text-right">إضافة عيادة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">اسم العيادة</label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="أدخل اسم العيادة..." className={addFieldErrors.nameAr ? 'border-red-500 h-11 bg-slate-50' : 'border-slate-200 h-11 bg-slate-50'} />
              {addFieldErrors.nameAr && <p className="text-[11px] text-red-500 font-medium">{addFieldErrors.nameAr}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">التخصص</label>
              <select value={specialtyAr} onChange={(e) => setSpecialtyAr(e.target.value)} className="flex h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">السعة اليومية</label>
                <Input type="text" value={String(capacityPerDay)} onChange={(e) => setCapacityPerDay(toIntOnly(e.target.value))} className="border-slate-200 h-11 bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">الحالة</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as ClinicStatus)} className="flex h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="مفتوحة">مفتوحة</option>
                  <option value="مغلقة">مغلقة</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-3 mt-2">
            <Button onClick={onAdd} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 text-base font-bold rounded-xl">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null} حفظ البيانات
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1 h-11 text-base border-slate-200 text-slate-600 rounded-xl">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
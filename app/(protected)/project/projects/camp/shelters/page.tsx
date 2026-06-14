'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { requireAdmin } from '@/app/(protected)/project/helpers/route-guards'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Pencil, Plus, Search, Loader2, Save, X, Home, UserCheck } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Shelter = {
  id: string
  nameAr: string
  areaAr: string
  supervisorAr: string
  phone: string
  familiesCount: number
  capacity: number
  fillStatus: 'ممتلئ' | 'غير ممتلئ'
}

type Supervisor = {
  id: string
  nameAr: string
  phone: string
  status: 'نشط' | 'موقوف'
}

const REGIONS = ['شمال', 'جنوب', 'شرق', 'غرب', 'وسط'] as const
const SHELTER_API = '/api/project/camp/shelter'
const SUPERVISOR_API = '/api/project/camp/supervisior'

const sel = 'rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'

const isPhoneValid = (p: string) => /^(056|059)\d{7}$/.test(p.trim())

// ─── Shelter Tab ─────────────────────────────────────────────────────────────

function SheltersTab() {
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ممتلئ' | 'غير ممتلئ'>('all')
  const [items, setItems] = useState<Shelter[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Shelter | null>(null)
  const [formData, setFormData] = useState({
    nameAr: '', areaAr: 'شمال' as typeof REGIONS[number],
    supervisorAr: '', phone: '', capacity: 0, familiesCount: 0, fillStatus: 'غير ممتلئ' as 'ممتلئ' | 'غير ممتلئ',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(SHELTER_API)
      const d = await r.json()
      setItems(Array.isArray(d) ? d : [])
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter(sh => {
    if (q && !sh.nameAr.includes(q) && !sh.areaAr.includes(q) && !sh.supervisorAr.includes(q)) return false
    if (statusFilter !== 'all' && sh.fillStatus !== statusFilter) return false
    return true
  }), [items, q, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paged = useMemo(() => filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filtered, currentPage])
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const rangeEnd = Math.min(currentPage * itemsPerPage, filtered.length)

  const validate = (d: typeof formData) => {
    const e: Record<string, string> = {}
    if (!d.nameAr.trim()) e.nameAr = 'مطلوب'
    if (!d.supervisorAr.trim()) e.supervisorAr = 'مطلوب'
    if (!isPhoneValid(d.phone)) e.phone = 'رقم غير صحيح'
    if (!d.capacity || d.capacity <= 0) e.capacity = 'مطلوب'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const openAdd = () => {
    setFormData({ nameAr: '', areaAr: 'شمال', supervisorAr: '', phone: '', capacity: 0, familiesCount: 0, fillStatus: 'غير ممتلئ' })
    setErrors({})
    setAddOpen(true)
  }

  const openEdit = (item: Shelter) => {
    setEditItem(item)
    setFormData({ 
      nameAr: item.nameAr, 
      areaAr: item.areaAr as typeof REGIONS[number], 
      supervisorAr: item.supervisorAr, 
      phone: item.phone, 
      capacity: item.capacity, 
      familiesCount: item.familiesCount,
      fillStatus: item.fillStatus 
    })
    setErrors({})
  }

  const onAdd = async () => {
    if (!validate(formData)) return
    setSubmitting(true)
    try {
      const { fillStatus, ...payload } = formData
      const res = await fetch(SHELTER_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setErrors({ _: data.message ?? 'خطأ' }); return }
      setItems(prev => [data, ...prev])
      setAddOpen(false)
    } finally { setSubmitting(false) }
  }

  const onEdit = async () => {
    if (!editItem || !validate(formData)) return
    setSubmitting(true)
    try {
      const { fillStatus, ...payload } = formData
      const res = await fetch(`${SHELTER_API}?id=${editItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setErrors({ _: data.message ?? 'خطأ' }); return }
      setItems(prev => prev.map(s => s.id === editItem.id ? data : s))
      setEditItem(null)
    } finally { setSubmitting(false) }
  }

  return (
    <div>
      <Card className="overflow-hidden border shadow-sm rounded-xl">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-3 border-b">
            <div className="relative w-full max-w-xs">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={e => { setQ(e.target.value); setCurrentPage(1) }} placeholder="ابحث بالاسم أو المنطقة..." className="h-10 pr-10" />
            </div>
            
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value as any)} 
              className={`${sel} h-10 w-fit min-w-[110px] text-xs`}
            >
              <option value="all">كل الحالات</option>
              <option value="ممتلئ">ممتلئ</option>
              <option value="غير ممتلئ">غير ممتلئ</option>
            </select>

            <Button onClick={openAdd} className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 gap-2 sm:mr-auto">
              <Plus className="h-4 w-4" /> إضافة مركز
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="p-4 font-semibold text-muted-foreground">اسم المركز</th>
                  <th className="p-4 font-semibold text-muted-foreground">المنطقة</th>
                  <th className="p-4 font-semibold text-muted-foreground">المشرف</th>
                  <th className="p-4 font-semibold text-muted-foreground">الهاتف</th>
                  <th className="p-4 font-semibold text-muted-foreground">السعة الكلية</th>
                  <th className="p-4 font-semibold text-muted-foreground">السعة الموجودة</th>
                  <th className="p-4 text-center font-semibold text-muted-foreground">الحالة</th>
                  <th className="p-4 text-center font-semibold text-muted-foreground">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={8} className="p-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={8} className="p-16 text-center text-muted-foreground italic">لا توجد مراكز</td></tr>
                ) : paged.map(sh => (
                  <tr key={sh.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-bold text-foreground">{sh.nameAr}</td>
                    <td className="p-4 text-muted-foreground">{sh.areaAr}</td>
                    <td className="p-4 text-muted-foreground">{sh.supervisorAr}</td>
                    <td className="p-4 text-muted-foreground" dir="ltr">{sh.phone}</td>
                    <td className="p-4 text-muted-foreground">{sh.capacity}</td>
                    <td className="p-4 text-muted-foreground">{sh.familiesCount}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${sh.fillStatus === 'ممتلئ' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {sh.fillStatus}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => openEdit(sh)} className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-md border text-muted-foreground">
                        <Pencil className="w-4 h-4" />
                      </button>
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-right text-lg font-bold text-blue-800">إضافة مركز إيواء</DialogTitle></DialogHeader>
          <ShelterForm formData={formData} setFormData={setFormData} errors={errors} />
          {errors._ && <p className="text-sm text-red-600">{errors._}</p>}
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-3">
            <Button onClick={onAdd} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 rounded-xl text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1 h-11 rounded-xl">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={open => { if (!open) setEditItem(null) }}>
        <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-right text-lg font-bold text-blue-800">تعديل مركز إيواء</DialogTitle></DialogHeader>
          <ShelterForm formData={formData} setFormData={setFormData} errors={errors} />
          {errors._ && <p className="text-sm text-red-600">{errors._}</p>}
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-3">
            <Button onClick={onEdit} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 rounded-xl text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التعديلات'}
            </Button>
            <Button variant="outline" onClick={() => setEditItem(null)} className="flex-1 h-11 rounded-xl">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ShelterForm({ formData, setFormData, errors }: { formData: any, setFormData: any, errors: any }) {
  return (
    <div className="flex flex-col gap-4 py-2 text-right">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">اسم المركز *</label>
        <Input className={`h-11 ${errors.nameAr ? 'border-red-400' : ''}`} value={formData.nameAr} onChange={e => setFormData({ ...formData, nameAr: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">المنطقة</label>
        <select className={`${sel} h-11 w-full`} value={formData.areaAr} onChange={e => setFormData({ ...formData, areaAr: e.target.value })}>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">المشرف *</label>
        <Input className={`h-11 ${errors.supervisorAr ? 'border-red-400' : ''}`} value={formData.supervisorAr} onChange={e => setFormData({ ...formData, supervisorAr: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">الهاتف *</label>
        <Input 
          className={`h-11 ${errors.phone ? 'border-red-400 text-red-500' : ''}`} 
          value={formData.phone} 
          maxLength={10}
          onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} 
          placeholder="05XXXXXXXX" 
          dir="ltr" 
        />
        {errors.phone && <p className="text-[10px] text-red-500 font-bold">يبدأ بـ 056 أو 059 ويتكون من 10 أرقام</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">السعة الكلية *</label>
        <Input type="number" className={`h-11 ${errors.capacity ? 'border-red-400' : ''}`} value={formData.capacity || ''} onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">السعة الموجودة</label>
        <Input type="number" className="h-11" value={formData.familiesCount || ''} onChange={e => setFormData({ ...formData, familiesCount: Number(e.target.value) })} />
      </div>
    </div>
  )
}

// ─── Supervisors Tab ──────────────────────────────────────────────────────────

function SupervisorsTab() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Supervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Omit<Supervisor, 'id'>>({ nameAr: '', phone: '', status: 'نشط' })
  const [addForm, setAddForm] = useState({ nameAr: '', phone: '', status: 'نشط' as 'نشط' | 'موقوف' })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(SUPERVISOR_API)
      const d = await r.json()
      setItems(Array.isArray(d) ? d : [])
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter(sp => !q || sp.nameAr.includes(q) || sp.phone.includes(q)), [items, q])
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paged = useMemo(() => filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filtered, currentPage])
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const rangeEnd = Math.min(currentPage * itemsPerPage, filtered.length)

  const validate = (name: string, phone: string) => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'مطلوب'
    if (!isPhoneValid(phone)) e.phone = 'خطأ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onEdit = async (id: string) => {
    if (!validate(editDraft.nameAr, editDraft.phone)) return
    setSubmitting(true)
    try {
      const res = await fetch(`${SUPERVISOR_API}?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editDraft) })
      const data = await res.json()
      if (res.ok) {
        setItems(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
        setEditingId(null)
      }
    } finally { setSubmitting(false) }
  }

  const onAdd = async () => {
    if (!validate(addForm.nameAr, addForm.phone)) return
    setSubmitting(true)
    try {
      const res = await fetch(SUPERVISOR_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) })
      const data = await res.json()
      if (res.ok) {
        setItems(prev => [data, ...prev])
        setAddOpen(false)
      }
    } finally { setSubmitting(false) }
  }

  return (
    <div>
      <Card className="overflow-hidden border shadow-sm rounded-xl">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-3 border-b">
            <div className="relative w-full max-w-xs">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={e => { setQ(e.target.value); setCurrentPage(1) }} placeholder="ابحث بالاسم أو الرقم..." className="h-10 pr-10" />
            </div>
            <Button onClick={() => { setErrors({}); setAddForm({ nameAr: '', phone: '', status: 'نشط' }); setAddOpen(true) }} className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 gap-2 sm:mr-auto">
              <Plus className="h-4 w-4" /> إضافة مشرف
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="p-4 font-semibold text-muted-foreground">الاسم</th>
                  <th className="p-4 font-semibold text-muted-foreground">الهاتف</th>
                  <th className="p-4 font-semibold text-muted-foreground">الحالة</th>
                  <th className="p-4 text-center font-semibold text-muted-foreground">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={4} className="p-16 text-center text-muted-foreground italic">لا يوجد مشرفون</td></tr>
                ) : paged.map(sp => (
                  <tr key={sp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-bold text-foreground">
                      {editingId === sp.id ? <Input value={editDraft.nameAr} onChange={e => setEditDraft(d => ({ ...d, nameAr: e.target.value }))} className={`h-9 ${errors.name ? 'border-red-400' : ''}`} /> : sp.nameAr}
                    </td>
                    <td className="p-4 text-muted-foreground" dir="ltr">
                      {editingId === sp.id ? <Input maxLength={10} value={editDraft.phone} onChange={e => setEditDraft(d => ({ ...d, phone: e.target.value.replace(/\D/g, '') }))} className={`h-9 ${errors.phone ? 'border-red-400' : ''}`} /> : sp.phone}
                    </td>
                    <td className="p-4">
                      {editingId === sp.id ? (
                        <select value={editDraft.status} onChange={e => setEditDraft(d => ({ ...d, status: e.target.value as any }))} className={`${sel} h-9`}>
                          <option value="نشط">نشط</option>
                          <option value="موقوف">موقوف</option>
                        </select>
                      ) : <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${sp.status === 'نشط' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sp.status}</span>}
                    </td>
                    <td className="p-4 text-center">
                      {editingId === sp.id ? (
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" className="bg-green-600 text-white" onClick={() => onEdit(sp.id)}>{submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-4 h-4" />}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <button onClick={() => { setErrors({}); setEditingId(sp.id); setEditDraft({ nameAr: sp.nameAr, phone: sp.phone, status: sp.status }) }} className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-md border text-muted-foreground">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm rounded-2xl" dir="rtl">
          <DialogHeader><DialogTitle className="text-right text-lg font-bold text-blue-800">إضافة مشرف</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold">الاسم *</label>
              <Input className={`h-11 ${errors.name ? 'border-red-400' : ''}`} value={addForm.nameAr} onChange={e => setAddForm(f => ({ ...f, nameAr: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold">الهاتف *</label>
              <Input 
                className={`h-11 ${errors.phone ? 'border-red-400' : ''}`} 
                value={addForm.phone} 
                maxLength={10}
                onChange={e => setAddForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} 
                dir="ltr" 
              />
              {errors.phone && <p className="text-[10px] text-red-500 font-bold">يبدأ بـ 056 أو 059 ويتكون من 10 أرقام</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold">الحالة</label>
              <select className={`${sel} h-11 w-full`} value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value as any }))}><option value="نشط">نشط</option><option value="موقوف">موقوف</option></select>
            </div>
          </div>
          <DialogFooter className="mt-2 flex gap-3">
            <Button onClick={onAdd} disabled={submitting} className="flex-1 bg-blue-600 text-white h-11 rounded-xl">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}</Button>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1 h-11 rounded-xl">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CampPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'shelters' | 'supervisors'>('shelters')
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      await requireAdmin(router)
      setIsAuthorized(true)
    }
    checkAccess()
  }, [router])

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-6" dir="rtl">
      <div className="mb-6 flex items-center gap-3">
        <Home className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">المراكز الإيوائية</h1>
          <p className="text-sm text-muted-foreground">إدارة مراكز الإيواء والمشرفين</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b pb-0">
        <button onClick={() => setTab('shelters')} className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${tab === 'shelters' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Home className="w-4 h-4" /> مراكز الإيواء</button>
        <button onClick={() => setTab('supervisors')} className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${tab === 'supervisors' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><UserCheck className="w-4 h-4" /> المشرفون</button>
      </div>

      {tab === 'shelters' ? <SheltersTab /> : <SupervisorsTab />}
    </div>
  )
}
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Pencil, Plus, Search, Loader2, AlertCircle, Trash2 } from 'lucide-react'

const DEPT_TYPES = [
  'الاستقبال والطوارئ', 'الجراحة العامة', 'طب الأطفال', 'النسائية والتوليد',
  'العناية المركزة والتخدير', 'الأمراض الباطنية', 'العظام والكسور',
  'المختبر الطبي', 'الأشعة والتصوير الطبي', 'الأنف والأذن والحنجرة',
  'العيون (الرمد)', 'العلاج الطبيعي والتأهيل', 'القلب والأوعية الدموية', 'الأعصاب وجراحة المخ',
]

const STATUSES = ['يعمل بكفاءة', 'مزدحم', 'خارج الخدمة']

type DeptRecord = {
  id: string; name: string; deptType: string; status: string
  description: string | null; hospitalId: string; hospitalName: string
}

export default function HospitalDetailPage() {
  const params = useParams()
  const hospitalId = params?.id as string

  const [q, setQ] = useState('')
  const [items, setItems] = useState<DeptRecord[]>([])
  const [loading, setLoading] = useState(true)

  const blank = { name: '', deptType: '', status: 'يعمل بكفاءة', description: '' }
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState(blank)
  const [addSub, setAddSub] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState('')
  const [editForm, setEditForm] = useState(blank)
  const [editSub, setEditSub] = useState(false)

  const [delLoading, setDelLoading] = useState<string | null>(null)

  const isValid = (f: typeof blank) => f.name.trim() !== '' && f.deptType !== ''

  const fetchAll = async () => {
    if (!hospitalId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/project/Medical-Services/hospitals/${hospitalId}/departments`)
      if (res.ok) {
        const dData = await res.json()
        setItems(Array.isArray(dData) ? dData : [])
      }
    } catch (e) { 
      console.error('Error fetching data:', e) 
    } finally { 
      setLoading(false) 
    }
  }

  const onAdd = async () => {
    if (!isValid(addForm) || !hospitalId) return
    setAddSub(true)
    try {
      const res = await fetch(`/api/project/Medical-Services/hospitals/${hospitalId}/departments`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      if (res.ok) { 
        await fetchAll()
        setAddOpen(false)
        setAddForm(blank) 
      }
    } catch (e) { console.error(e) } 
    finally { setAddSub(false) }
  }

  const openEdit = (item: DeptRecord) => {
    setEditId(item.id)
    setEditForm({ name: item.name, deptType: item.deptType, status: item.status, description: item.description || '' })
    setEditOpen(true)
  }

  const onEdit = async () => {
    if (!isValid(editForm) || !hospitalId) return
    setEditSub(true)
    try {
      const res = await fetch(`/api/project/Medical-Services/hospitals/${hospitalId}/departments`, {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, ...editForm }),
      })
      if (res.ok) { 
        await fetchAll()
        setEditOpen(false) 
      }
    } catch (e) { console.error(e) } 
    finally { setEditSub(false) }
  }

  // دالة الحذف والاتصال بالسيرفر
  const onDelete = async (id: string) => {
    if (!confirm('هل أنتِ متأكدة من رغبتكِ في حذف هذا القسم نهائياً؟')) return
    setDelLoading(id)
    try {
      const res = await fetch(`/api/project/Medical-Services/hospitals/${hospitalId}/departments?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await fetchAll() // إعادة تحديث الجدول بعد الحذف بنجاح
      } else {
        alert('فشل حذف القسم')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setDelLoading(null)
    }
  }

  useEffect(() => { fetchAll() }, [hospitalId])

  const filtered = useMemo(() =>
    items.filter(i => i.name?.toLowerCase().includes(q.toLowerCase()) || i.deptType?.toLowerCase().includes(q.toLowerCase())),
    [items, q]
  )

  return (
    <div className="w-full px-4 py-6 text-right" dir="rtl">
      <div className="mb-6"><h1 className="text-2xl font-bold">الأقسام الطبية بالمستشفى</h1></div>

      <Card className="overflow-hidden rounded-xl border shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-3 border-b">
            <div className="relative w-full max-w-xs">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث في الأقسام..." className="h-10 pr-10 pl-3 text-right" />
            </div>
            <Button onClick={() => { setAddForm(blank); setAddOpen(true) }} className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 gap-2 sm:mr-auto sm:ml-0">
              <Plus className="h-4 w-4" /> إضافة قسم
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="p-4 font-semibold text-muted-foreground">نوع التخصص</th>
                  <th className="p-4 font-semibold text-muted-foreground">اسم القسم</th>
                  <th className="p-4 font-semibold text-muted-foreground">الحالة</th>
                  <th className="p-4 font-semibold text-muted-foreground">ملاحظات</th>
                  <th className="p-4 text-center font-semibold text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={5} className="p-16 text-center"><Loader2 className="animate-spin mx-auto size-5" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-16 text-center text-muted-foreground italic">لا توجد أقسام مسجلة لهذا المستشفى</td></tr>
                ) : filtered.map(item => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-muted-foreground font-medium">{item.deptType}</td>
                    <td className="p-4 font-semibold">{item.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.status === 'يعمل بكفاءة' ? 'bg-emerald-100 text-emerald-700' : item.status === 'مزدحم' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 max-w-[200px] truncate text-muted-foreground">{item.description || '—'}</td>
                    <td className="p-4 text-center flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(item)} className="rounded-md border p-2 text-muted-foreground hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(item.id)} 
                        disabled={delLoading === item.id}
                        className="rounded-md border p-2 text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        {delLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* نافذة الإضافة */}
      <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) setAddForm(blank) }}>
        <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-right text-lg font-bold">إضافة قسم جديد</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-2 text-right">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">نوع التخصص</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 h-11 text-sm outline-none text-right" value={addForm.deptType} onChange={e => setAddForm({ ...addForm, deptType: e.target.value })}>
                <option value="">اختر التخصص</option>
                {DEPT_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">اسم القسم</label>
              <Input className="h-11 text-right" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="اسم القسم" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">الحالة التشغيلية</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 h-11 text-sm outline-none text-right" value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">ملاحظات</label>
              <textarea className="w-full rounded-lg border border-input bg-background p-2 text-sm outline-none min-h-[70px] text-right" value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-3 mt-2">
            <Button onClick={onAdd} disabled={!isValid(addForm) || addSub} className="flex-1 h-11 gap-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl">
              {addSub && <Loader2 className="animate-spin size-4" />} حفظ
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1 h-11 rounded-xl">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة التعديل */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-right text-lg font-bold">تعديل القسم</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-2 text-right">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">نوع التخصص</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 h-11 text-sm outline-none text-right" value={editForm.deptType} onChange={e => setEditForm({ ...editForm, deptType: e.target.value })}>
                {DEPT_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">اسم القسم</label>
              <Input className="h-11 text-right" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">الحالة التشغيلية</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 h-11 text-sm outline-none text-right" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">ملاحظات</label>
              <textarea className="w-full rounded-lg border border-input bg-background p-2 text-sm outline-none min-h-[70px] text-right" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-3 mt-2">
            <Button onClick={onEdit} disabled={!isValid(editForm) || editSub} className="flex-1 h-11 gap-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl">
              {editSub && <Loader2 className="animate-spin size-4" />} حفظ
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1 h-11 rounded-xl">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
'use client'

import { useMemo, useState, useEffect } from 'react'
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
import { Pencil, X, Plus, Search, Loader2 } from 'lucide-react'

// التعريفات
type PresenceStatus = 'متاح' | 'غير متاح'

type Institution = {
  id: string
  nameAr: string
  email: string
  serviceType: string
  presence: PresenceStatus
}

type FieldErrors = Partial<Record<'nameAr' | 'email' | 'serviceType', string>>

const serviceTypeOptions = [
  'إغاثة',
  'دعم نفسي',
  'مساعدات غذائية',
  'خدمات طبية',
  'خدمات لوجستية',
  'تعليم',
  'إيواء',
] as const

export default function InstitutionsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Institution[]>([])
  const [loading, setLoading] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all')

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  const [addOpen, setAddOpen] = useState(false)
  const [formData, setFormData] = useState({
    nameAr: '',
    email: '',
    serviceType: '',
    presence: 'متاح' as PresenceStatus
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Institution | null>(null)
  const [editErrors, setEditErrors] = useState<FieldErrors>({})

  // حماية الصفحة والتأكد من صلاحية الأدمن
  useEffect(() => {
    const checkAccess = async () => {
      await requireAdmin(router)
      setIsAuthorized(true)
    }
    checkAccess()
  }, [router])

  const validate = (data: any): FieldErrors => {
    const errors: FieldErrors = {}
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/
    
    if (!data.nameAr?.trim()) {
      errors.nameAr = 'هذا الحقل مطلوب'
    } else if (data.nameAr.length < 2) {
      errors.nameAr = 'الاسم يجب أن يكون حرفين على الأقل'
    }

    if (!data.email) {
      errors.email = 'البريد الإلكتروني مطلوب'
    } else if (!emailRegex.test(data.email)) {
      errors.email = 'يجب أن يكون بريد إنجليزي صحيح ينتهي بـ .com'
    }

    if (!data.serviceType) {
      errors.serviceType = 'يرجى اختيار نوع الخدمة'
    }

    return errors
  }

  const fetchInstitutions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (statusFilter !== 'all') params.set('presence', statusFilter === 'available' ? 'متاح' : 'غير متاح')

      const res = await fetch(`/api/project/projects/institutions?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'فشل الجلب')
      setItems(data)
    } catch (err: any) {
      setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthorized) {
        fetchInstitutions()
    }
  }, [q, statusFilter, isAuthorized])

  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])

  // حسابات الـ Pagination
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage))
  
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return items.slice(start, start + itemsPerPage)
  }, [items, currentPage, itemsPerPage])

  const rangeStart = items.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const rangeEnd = Math.min(currentPage * itemsPerPage, items.length)

  const onAdd = async () => {
    const errors = validate(formData)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      setSubmitting(true)
      const res = await fetch('/api/project/projects/institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, placeId: null }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'فشل الحفظ')

      await fetchInstitutions()
      setAddOpen(false)
      setFormData({ nameAr: '', email: '', serviceType: '', presence: 'متاح' })
      setFieldErrors({})
      setCurrentPage(1)
    } catch (err: any) {
      setErrorMessage(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const saveEdit = async (id: string) => {
    if (!editDraft) return
    const errors = validate(editDraft)
    setEditErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      setSubmitting(true)
      const res = await fetch(`/api/project/projects/institutions?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDraft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      setEditingId(null)
      setEditErrors({})
      await fetchInstitutions()
    } catch (err: any) {
      setErrorMessage(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // شاشة التحميل أثناء التحقق من الصلاحية
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col min-h-screen bg-slate-50/50 px-4 py-8">
      <div className="mb-6 text-right">
          <h1 className="text-2xl font-bold text-slate-800">إدارة المؤسسات</h1>
          <p className="text-sm text-slate-500 font-normal mt-1">الرئيسية &gt; إدارة المؤسسات</p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex justify-between items-center">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')}><X className="size-4" /></button>
        </div>
      )}

      <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0 text-right">
          <div className="p-4 border-b flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
                <div className="relative max-w-sm w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="بحث..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pr-10 h-10 text-sm bg-slate-50 border-none"
                />
                </div>
                <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none"
                >
                <option value="all">كل الحالات</option>
                <option value="available">متاح</option>
                <option value="unavailable">غير متاح</option>
                </select>
            </div>
            
            <Button onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 h-10 shadow-sm">
              <Plus className="ml-2 size-4" /> إضافة مؤسسة
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">اسم المؤسسة</th>
                  <th className="px-6 py-4">البريد الإلكتروني</th>
                  <th className="px-6 py-4">نوع الخدمة</th>
                  <th className="px-6 py-4 text-center">الحالة</th>
                  <th className="px-6 py-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="py-20 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" />جاري التحميل...</td></tr>
                ) : paginatedItems.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">لا توجد نتائج مطابقة لبحثك.</td></tr>
                ) : paginatedItems.map((ins) => (
                  <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      {editingId === ins.id ? (
                        <div className="space-y-1">
                          <Input value={editDraft?.nameAr} onChange={e => setEditDraft({...editDraft!, nameAr: e.target.value})} className={`h-9 border-blue-400 ${editErrors.nameAr ? 'border-red-500' : ''}`} />
                          {editErrors.nameAr && <p className="text-[10px] text-red-500">{editErrors.nameAr}</p>}
                        </div>
                      ) : ins.nameAr}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === ins.id ? (
                        <div className="space-y-1">
                          <Input value={editDraft?.email} onChange={e => setEditDraft({...editDraft!, email: e.target.value})} className={`h-9 border-blue-400 ${editErrors.email ? 'border-red-500' : ''}`} />
                          {editErrors.email && <p className="text-[10px] text-red-500">{editErrors.email}</p>}
                        </div>
                      ) : ins.email}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === ins.id ? (
                        <select 
                          value={editDraft?.serviceType} 
                          onChange={e => setEditDraft({...editDraft!, serviceType: e.target.value})}
                          className="h-9 border border-blue-400 rounded-md w-full bg-white text-xs outline-none"
                        >
                          {serviceTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : ins.serviceType}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingId === ins.id ? (
                         <select 
                            value={editDraft?.presence} 
                            onChange={e => setEditDraft({...editDraft!, presence: e.target.value as PresenceStatus})}
                            className="h-9 border border-blue-400 rounded-md px-1 bg-white text-xs outline-none"
                          >
                            <option value="متاح">متاح</option>
                            <option value="غير متاح">غير متاح</option>
                          </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                          ins.presence === 'متاح' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                        }`}>
                          {ins.presence}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        {editingId === ins.id ? (
                          <>
                            <Button size="sm" onClick={() => saveEdit(ins.id)} disabled={submitting} className="h-8 bg-green-600 text-white hover:bg-green-700">حفظ</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditErrors({}); }} className="h-8">إلغاء</Button>
                          </>
                        ) : (
                          <button onClick={() => { setEditingId(ins.id); setEditDraft(ins); setEditErrors({}); }} className="p-2 text-slate-400 hover:text-blue-600 border border-slate-100 rounded-md transition-all hover:bg-blue-50">
                            <Pencil className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>عرض صفوف:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="h-8 border rounded-md px-1 bg-white outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500 font-medium">
                {rangeStart} - {rangeEnd} <span className="mx-1 text-slate-300">|</span> من {items.length}
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

      <Dialog open={addOpen} onOpenChange={(val) => { setAddOpen(val); if(!val) setFieldErrors({}); }}>
        <DialogContent className="max-w-md shadow-2xl border-none rounded-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-lg font-bold">إضافة مؤسسة جديدة</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4 text-right">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">اسم المؤسسة</label>
              <Input 
                value={formData.nameAr} 
                onChange={e => setFormData({...formData, nameAr: e.target.value})} 
                className={`h-11 bg-slate-50 border-slate-200 ${fieldErrors.nameAr ? 'border-red-500' : ''}`}
              />
              {fieldErrors.nameAr && <p className="text-[11px] text-red-500 font-medium">{fieldErrors.nameAr}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">البريد الإلكتروني</label>
              <Input 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                className={`h-11 bg-slate-50 border-slate-200 ${fieldErrors.email ? 'border-red-500' : ''}`}
              />
              {fieldErrors.email && <p className="text-[11px] text-red-500 font-medium">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">نوع الخدمة</label>
              <select 
                value={formData.serviceType} 
                onChange={e => setFormData({...formData, serviceType: e.target.value})}
                className="w-full h-11 border border-slate-200 rounded-lg px-2 bg-slate-50 text-sm outline-none"
              >
                <option value="">اختر النوع...</option>
                {serviceTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {fieldErrors.serviceType && <p className="text-[11px] text-red-500 font-medium">{fieldErrors.serviceType}</p>}
            </div>
          </div>
          <DialogFooter className="mt-2 flex flex-row items-center gap-3 w-full">
            <Button onClick={onAdd} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl">
              {submitting ? <Loader2 className="animate-spin ml-2" /> : null} حفظ البيانات
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1 h-11 font-normal text-slate-600 bg-white hover:bg-slate-50 border-slate-200 rounded-xl">
                إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
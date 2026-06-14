'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Pencil, Save, X, Plus, Search, AlertCircle } from 'lucide-react'

const SERVICE_TYPES = [
  "توزيع سلال غذائية",
  "إيواء طارئ",
  "خدمات طبية",
  "توزيع مياه وشرب",
  "دعم نفسي واجتماعي",
  "تعليم طارئ"
]

type ServiceStatus = 'نشط' | 'مغلق'

type Service = {
  id: string
  serviceType: string
  status: ServiceStatus
}

const BASE_URL = '/api/project/projects/service'

async function requestJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    cache: 'no-store',
  })
  const text = await res.text()
  let data: any = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.message ?? `فشل الطلب: ${res.status}`)
  return data as T
}

export default function ServicesPage() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ServiceStatus>('all')
  
  // حالات الـ Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // حالة نموذج الإضافة
  const [addOpen, setAddOpen] = useState(false)
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0])
  const [status, setStatus] = useState<ServiceStatus>('نشط')
  const [submitting, setSubmitting] = useState(false)
  const [dialogError, setDialogError] = useState('')

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true)
      try {
        const data = await requestJSON<Service[]>(BASE_URL)
        setItems(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'فشل جلب البيانات')
      } finally {
        setLoading(false)
      }
    }
    fetchServices()
  }, [])

  // الفلترة والبحث
  const filtered = useMemo(() => {
    return items.filter((x) => {
      const matchSearch = !q || x.serviceType.toLowerCase().includes(q.toLowerCase())
      const matchStatus = statusFilter === 'all' || x.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [q, items, statusFilter])

  // حساب العناصر المعروضة بناءً على الصفحة الحالية
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, filtered.length)

  const onAdd = async () => {
    setSubmitting(true)
    setDialogError('')
    try {
      const created = await requestJSON<Service>(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({ serviceType, status }),
      })
      setItems([created, ...items])
      setAddOpen(false)
      setServiceType(SERVICE_TYPES[0])
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
    } finally {
      setSubmitting(false)
    }
  }

  // حالة التعديل
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Omit<Service, 'id'>>({ serviceType: '', status: 'نشط' })

  const saveEditRow = async (id: string) => {
    try {
      const updated = await requestJSON<Service>(`${BASE_URL}?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(editDraft),
      })
      setItems(items.map((x) => (x.id === id ? updated : x)))
      setEditingId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل التعديل')
    }
  }

  return (
    <div className="w-full min-h-screen px-4 py-6">
      <div className="w-full mb-6 text-right">
        <h1 className="text-2xl font-bold text-slate-800">إدارة الخدمات</h1>
        <p className="text-sm text-muted-foreground mt-1">الرئيسية {'>'} الخدمات</p>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {/* أدوات التحكم */}
          <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 items-center gap-3 w-full">
              <div className="relative w-full max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="ابحث عن خدمة..."
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  className="pr-10"
                />
              </div>
              <select
                className="h-10 px-3 border rounded-md bg-white text-sm"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
              >
                <option value="all">كل الحالات</option>
                <option value="نشط">نشط</option>
                <option value="مغلق">مغلق</option>
              </select>
            </div>
            
            <Button onClick={() => { setAddOpen(true); setDialogError(''); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 ml-2" /> إضافة خدمة
            </Button>
          </div>

          {/* الجدول */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-y text-slate-600 text-sm">
                  <th className="p-4 font-semibold">نوع الخدمة</th>
                  <th className="p-4 font-semibold">الحالة</th>
                  <th className="p-4 text-center font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageItems.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm">
                      {editingId === s.id ? (
                        <select 
                          className="w-full border rounded h-9 px-2 bg-white"
                          value={editDraft.serviceType}
                          onChange={(e) => setEditDraft({...editDraft, serviceType: e.target.value})}
                        >
                          {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      ) : s.serviceType}
                    </td>
                    <td className="p-4">
                      {editingId === s.id ? (
                        <select 
                          className="w-full border rounded h-9 px-2 bg-white"
                          value={editDraft.status}
                          onChange={(e) => setEditDraft({...editDraft, status: e.target.value as ServiceStatus})}
                        >
                          <option value="نشط">نشط</option>
                          <option value="مغلق">مغلق</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${s.status === 'نشط' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                       <div className="flex justify-center gap-2">
                        {editingId === s.id ? (
                          <>
                            <Button size="sm" onClick={() => saveEditRow(s.id)} className="bg-green-600 hover:bg-green-700 h-8"><Save className="h-4 w-4"/></Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-8"><X className="h-4 w-4"/></Button>
                          </>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 border border-slate-200"
                            onClick={() => { setEditingId(s.id); setEditDraft({ serviceType: s.serviceType, status: s.status }); }}
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && pageItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-slate-400">لا توجد خدمات متاحة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* الترقيم (Pagination) */}
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-3">
              <span>عرض</span>
              <select 
                className="border rounded px-2 py-1 bg-white outline-none"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span>صفوف من أصل {filtered.length}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-slate-400">{rangeStart} - {rangeEnd}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
                <Button variant="outline" size="sm" disabled={page >= Math.ceil(filtered.length / pageSize)} onClick={() => setPage(p => p + 1)}>التالي</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* نافذة الإضافة */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-right">إضافة خدمة جديدة</DialogTitle>
            <DialogDescription className="text-right">أدخل تفاصيل الخدمة أدناه ليتم حفظها في النظام.</DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" />
              {dialogError}
            </div>
          )}

          <div className="grid gap-5 py-6 text-right">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700">نوع الخدمة *</label>
              <select 
                className="h-11 px-3 border rounded-md border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" 
                value={serviceType} 
                onChange={(e) => setServiceType(e.target.value)}
              >
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700">حالة الخدمة *</label>
              <select 
                className="h-11 px-3 border rounded-md border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" 
                value={status} 
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="نشط">نشط</option>
                <option value="مغلق">مغلق</option>
              </select>
            </div>
          </div>

          <DialogFooter className="flex flex-row-reverse gap-3 border-t pt-4">
            <Button onClick={onAdd} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-10">
              {submitting ? 'جارٍ الحفظ...' : 'حفظ الخدمة'}
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="border-slate-200 text-slate-600 h-10 px-6">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
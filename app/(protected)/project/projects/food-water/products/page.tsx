'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Pencil, Plus, Search, Loader2, Check, X } from 'lucide-react'

const BASE_URL = '/api/project/projects/products'

async function requestJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || 'Request error')
  return data
}

export default function ProductsPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newFormData, setNewFormData] = useState({ nameAr: '', price: 0, quantity: 0 })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadInitialData() }, [])

  const loadInitialData = async () => {
    try {
      const data = await requestJSON<any[]>(BASE_URL)
      setItems(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const startEdit = (item: any) => {
    setEditFormData({ ...item })
    setEditingId(item.id)
  }

  const onSaveUpdate = async (id: string) => {
    setSubmitting(true)
    try {
      const updated = await requestJSON<any>(`${BASE_URL}?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData)
      })
      setItems(prev => prev.map(p => p.id === id ? updated : p))
      setEditingId(null)
      setEditFormData(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const onSaveCreate = async () => {
    setSubmitting(true)
    try {
      const created = await requestJSON<any>(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(newFormData)
      })
      setItems(prev => [created, ...prev])
      setIsAddOpen(false)
      setNewFormData({ nameAr: '', price: 0, quantity: 0 })
      setCurrentPage(1)
    } catch (err: any) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const filtered = useMemo(() =>
    items.filter(p => {
      const matchSearch = !q || p.nameAr?.toLowerCase().includes(q.toLowerCase())
      const matchStatus = statusFilter === 'all' || p.status === statusFilter
      return matchSearch && matchStatus
    }),
    [q, items, statusFilter]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  useEffect(() => { setCurrentPage(1) }, [q, statusFilter, itemsPerPage])

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const rangeEnd = Math.min(currentPage * itemsPerPage, filtered.length)

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>

  return (
    <div className="w-full px-4 py-3">
      <div className="mb-6 text-start px-2">
        <h1 className="text-2xl font-bold text-foreground">{t('pages.products.title')}</h1>
      </div>

      <Card className="border shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col lg:flex-row gap-4 justify-between items-center border-b bg-muted/20">
            <div className="flex gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:flex-none lg:w-64">
                <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('common.messages.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} className="pe-9 rounded-lg" />
              </div>
              <select className="border rounded-lg px-3 bg-background text-sm outline-none focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">{t('common.labels.all')}</option>
                <option value="MOJOUD">{t('common.labels.active')}</option>
                <option value="GHAIR_MOJOUD">{t('common.labels.inactive')}</option>
              </select>
            </div>
            <Button onClick={() => setIsAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white w-full lg:w-auto rounded-lg">
              <Plus className="me-2 h-4 w-4" /> {t('pages.products.addButton')}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-4 border-b font-semibold text-muted-foreground">{t('pages.products.name')}</th>
                  <th className="p-4 border-b font-semibold text-muted-foreground">{t('common.labels.total')}</th>
                  <th className="p-4 border-b font-semibold text-muted-foreground">{t('pages.products.quantity')}</th>
                  <th className="p-4 border-b font-semibold text-muted-foreground">{t('common.labels.status')}</th>
                  <th className="p-4 border-b text-center font-semibold text-muted-foreground">{t('common.labels.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedData.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">{t('common.messages.noData')}</td></tr>
                ) : paginatedData.map((p) => (
                  <tr key={p.id} className={`hover:bg-muted/30 transition-colors ${editingId === p.id ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                    <td className="p-4">
                      {editingId === p.id
                        ? <Input className="h-9" value={editFormData.nameAr} onChange={e => setEditFormData({ ...editFormData, nameAr: e.target.value })} />
                        : p.nameAr}
                    </td>
                    <td className="p-4">
                      {editingId === p.id
                        ? <Input className="h-9 w-24" type="number" value={editFormData.price} onChange={e => setEditFormData({ ...editFormData, price: Number(e.target.value) })} />
                        : `${p.price} $`}
                    </td>
                    <td className="p-4">
                      {editingId === p.id
                        ? <Input className="h-9 w-24" type="number" value={editFormData.quantity} onChange={e => setEditFormData({ ...editFormData, quantity: Number(e.target.value) })} />
                        : p.quantity}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[11px] font-bold ${p.status === 'MOJOUD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {p.uiStatus}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {editingId === p.id ? (
                        <div className="flex justify-center gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 p-0 rounded-full" onClick={() => onSaveUpdate(p.id)} disabled={submitting}>
                            {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 rounded-full" onClick={() => { setEditingId(null); setEditFormData(null) }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50 rounded-full" onClick={() => startEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 flex items-center justify-between border-t bg-muted/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('common.labels.total')}:</span>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="border rounded-md h-8 px-1 bg-background outline-none cursor-pointer">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">{rangeStart} - {rangeEnd} / {filtered.length}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>{t('common.buttons.prev')}</Button>
                <Button variant="outline" size="sm" className="h-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>{t('common.buttons.next')}</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader className="text-start"><DialogTitle className="text-xl font-bold">{t('pages.products.addTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 text-start">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">{t('pages.products.name')}</label>
              <Input value={newFormData.nameAr} onChange={e => setNewFormData({ ...newFormData, nameAr: e.target.value })} className="rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">{t('common.labels.total')}</label>
              <Input type="number" value={newFormData.price} onChange={e => setNewFormData({ ...newFormData, price: Number(e.target.value) })} className="rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">{t('pages.products.quantity')}</label>
              <Input type="number" value={newFormData.quantity} onChange={e => setNewFormData({ ...newFormData, quantity: Number(e.target.value) })} className="rounded-lg" />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4 sm:justify-start">
            <Button onClick={onSaveCreate} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white flex-1 rounded-lg">
              {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : t('common.buttons.save')}
            </Button>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 rounded-lg">{t('common.buttons.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

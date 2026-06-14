'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z, ZodError } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Plus, Search, Loader2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const AREAS = ['شمال', 'جنوب', 'شرق', 'غرب', 'وسط'] as const
const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const

type Priority = typeof PRIORITIES[number]

type Beneficiary = {
  id: string
  nameAr: string
  phone: string
  familyCount: number
  area: string
  campId: string
  campName: string
  priority: Priority
}

type CampOption = {
  id: string
  name: string
  area: string
}

const BASE_URL = '/api/project/projects/citizens'
const CAMPS_OPTIONS_URL = '/api/project/projects/camps?forBeneficiary=true'
const phoneRegex = /^(056|059)\d{7}$/

const selectClass = 'w-full min-w-0 rounded-lg border border-input bg-background px-3 text-start text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'

async function requestJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    cache: 'no-store',
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.message ?? `Error: ${res.status}`)
  return data as T
}

export default function BeneficiariesPage() {
  const { t } = useTranslation()

  const beneficiarySchema = useMemo(() => z.object({
    nameAr: z.string().min(1, t('common.messages.required')).trim(),
    phone: z.string().trim().min(1, t('common.messages.required')).regex(phoneRegex, t('common.messages.required')),
    familyCount: z.coerce.number()
      .int(t('common.messages.required'))
      .min(1, t('common.messages.required'))
      .max(50, t('common.messages.required')),
    area: z.string().min(1, t('common.messages.required')),
    campId: z.string().min(1, t('common.messages.required')),
    priority: z.enum(PRIORITIES),
  }), [t])

  const [q, setQ] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [items, setItems] = useState<Beneficiary[]>([])
  const [campOptions, setCampOptions] = useState<CampOption[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [addFormData, setAddFormData] = useState<Partial<Beneficiary>>({ priority: 'medium', area: '', familyCount: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Beneficiary>>({})
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [bens, camps] = await Promise.all([
          requestJSON<Beneficiary[]>(BASE_URL),
          requestJSON<CampOption[]>(CAMPS_OPTIONS_URL)
        ])
        setItems(bens)
        setCampOptions(camps)
      } catch (err: any) {
        console.error('Error loading data:', err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredCampsForAdd = useMemo(() => campOptions.filter(c => c.area === addFormData.area), [addFormData.area, campOptions])
  const filteredCampsForEdit = useMemo(() => campOptions.filter(c => c.area === editFormData.area), [editFormData.area, campOptions])

  const filteredItems = useMemo(() =>
    items.filter(b => {
      const matchesSearch = !q || b.nameAr.includes(q) || b.phone.includes(q) || (b.campName && b.campName.includes(q))
      const matchesPriority = priorityFilter === 'all' || b.priority === priorityFilter
      return matchesSearch && matchesPriority
    }),
    [q, priorityFilter, items]
  )

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage))
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(start, start + itemsPerPage)
  }, [filteredItems, currentPage, itemsPerPage])

  useEffect(() => { setCurrentPage(1) }, [q, priorityFilter, itemsPerPage])

  const rangeStart = filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const rangeEnd = Math.min(currentPage * itemsPerPage, filteredItems.length)

  const priorityColors: Record<Priority, string> = {
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  const handleAddSubmit = async () => {
    setErrors({})
    try {
      const validatedData = beneficiarySchema.parse(addFormData)
      setSubmitting(true)
      const newItem = await requestJSON<Beneficiary>(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(validatedData)
      })
      setItems([newItem, ...items])
      setIsAddDialogOpen(false)
      setAddFormData({ priority: 'medium', area: '', familyCount: 0 })
      setCurrentPage(1)
    } catch (err) {
      if (err instanceof ZodError) {
        const errs: Record<string, string> = {}
        err.issues.forEach(i => errs[i.path[0] as string] = i.message)
        setErrors(errs)
      } else if (err instanceof Error) alert(err.message)
    } finally { setSubmitting(false) }
  }

  const handleSaveEdit = async (id: string) => {
    setErrors({})
    try {
      const validatedData = beneficiarySchema.parse(editFormData)
      setSubmitting(true)
      const savedItem = await requestJSON<Beneficiary>(`${BASE_URL}?id=${id}`, {
        method: 'PATCH',
        body: JSON.stringify(validatedData)
      })
      setItems(items.map(item => item.id === id ? savedItem : item))
      setEditingId(null)
    } catch (err) {
      if (err instanceof ZodError) {
        const errs: Record<string, string> = {}
        err.issues.forEach(i => errs[i.path[0] as string] = i.message)
        setErrors(errs)
      } else if (err instanceof Error) alert(err.message)
    } finally { setSubmitting(false) }
  }

  return (
    <div className="w-full px-4 py-6">
      <div className="mb-6 text-start">
        <h1 className="text-2xl font-bold text-foreground">{t('pages.beneficiaries.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('pages.beneficiaries.title')}</p>
      </div>

      <Card className="overflow-hidden rounded-xl border shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-3 border-b">
            <div className="relative w-full max-w-xs">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('common.messages.searchPlaceholder')}
                className="h-10 pe-10"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={`${selectClass} h-10 sm:w-[130px]`}
            >
              <option value="all">{t('pages.beneficiaries.allPriorities')}</option>
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{t(`pages.beneficiaries.priorities.${p}`)}</option>
              ))}
            </select>

            <Button
              onClick={() => { setErrors({}); setIsAddDialogOpen(true) }}
              className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 gap-2 sm:ms-auto"
            >
              <Plus className="h-4 w-4" />
              {t('pages.beneficiaries.addButton')}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="p-4 font-semibold text-muted-foreground">{t('pages.beneficiaries.name')}</th>
                  <th className="p-4 font-semibold text-muted-foreground">{t('pages.beneficiaries.phone')}</th>
                  <th className="p-4 font-semibold text-muted-foreground">{t('pages.beneficiaries.region')}</th>
                  <th className="p-4 font-semibold text-muted-foreground">{t('nav.camps')}</th>
                  <th className="p-4 text-center font-semibold text-muted-foreground">{t('common.labels.total')}</th>
                  <th className="p-4 text-center font-semibold text-muted-foreground">{t('pages.beneficiaries.priority')}</th>
                  <th className="p-4 text-center font-semibold text-muted-foreground">{t('common.labels.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={7} className="p-16 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />{t('common.messages.loading')}
                  </td></tr>
                ) : paginatedItems.length === 0 ? (
                  <tr><td colSpan={7} className="p-16 text-center text-muted-foreground italic">{t('common.messages.noData')}</td></tr>
                ) : paginatedItems.map((b) => {
                  const isEditing = editingId === b.id
                  return (
                    <tr key={b.id} className={`transition-colors hover:bg-muted/30 ${isEditing ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                      <td className="p-4">
                        {isEditing
                          ? <Input className="h-9 border-blue-400" value={editFormData.nameAr} onChange={e => setEditFormData({ ...editFormData, nameAr: e.target.value })} />
                          : <span className="font-semibold text-foreground">{b.nameAr}</span>}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {isEditing
                          ? <Input className="h-9 border-blue-400" value={editFormData.phone} onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })} />
                          : b.phone}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {isEditing ? (
                          <select className={`${selectClass} h-9 border-blue-400`} value={editFormData.area} onChange={e => setEditFormData({ ...editFormData, area: e.target.value, campId: '' })}>
                            <option value="">{t('common.labels.all')}</option>
                            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        ) : b.area}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {isEditing ? (
                          <select className={`${selectClass} h-9 border-blue-400`} value={editFormData.campId} disabled={!editFormData.area} onChange={e => setEditFormData({ ...editFormData, campId: e.target.value })}>
                            <option value="">{t('common.labels.all')}</option>
                            {filteredCampsForEdit.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        ) : b.campName}
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {isEditing
                          ? <Input type="number" className="h-9 w-20 mx-auto border-blue-400 text-center" value={editFormData.familyCount || ''} onChange={e => setEditFormData({ ...editFormData, familyCount: Number(e.target.value) })} />
                          : b.familyCount}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${priorityColors[b.priority]}`}>
                          {t(`pages.beneficiaries.priorities.${b.priority}`)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" onClick={() => handleSaveEdit(b.id)} disabled={submitting} className="bg-green-600 text-white hover:bg-green-700">{t('common.buttons.save')}</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>{t('common.buttons.cancel')}</Button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingId(b.id); setEditFormData(b) }} className="p-2 rounded-md border transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 text-muted-foreground">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('common.labels.total')}:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                {rangeStart} – {rangeEnd} / {filteredItems.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>{t('common.buttons.prev')}</Button>
                <Button variant="outline" size="sm" className="h-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>{t('common.buttons.next')}</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-start text-lg font-bold">{t('pages.beneficiaries.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2 text-start">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">{t('pages.beneficiaries.name')}</label>
              <Input value={addFormData.nameAr || ''} onChange={e => setAddFormData({ ...addFormData, nameAr: e.target.value })} placeholder={t('pages.beneficiaries.name')} className={errors.nameAr ? 'border-red-400' : ''} />
              {errors.nameAr && <p className="text-xs text-red-500">{errors.nameAr}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">{t('pages.beneficiaries.phone')}</label>
              <Input value={addFormData.phone || ''} onChange={e => setAddFormData({ ...addFormData, phone: e.target.value })} placeholder="05xxxxxxxx" className={errors.phone ? 'border-red-400' : ''} />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">{t('pages.beneficiaries.region')}</label>
                <select className={`${selectClass} h-11 ${errors.area ? 'border-red-400' : ''}`} value={addFormData.area || ''} onChange={e => setAddFormData({ ...addFormData, area: e.target.value, campId: '' })}>
                  <option value="">{t('pages.beneficiaries.region')}</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                {errors.area && <p className="text-xs text-red-500">{errors.area}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">{t('pages.beneficiaries.priority')}</label>
                <select className={`${selectClass} h-11`} value={addFormData.priority || 'medium'} onChange={e => setAddFormData({ ...addFormData, priority: e.target.value as Priority })}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{t(`pages.beneficiaries.priorities.${p}`)}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">{t('nav.camps')}</label>
              <select className={`${selectClass} h-11 ${errors.campId ? 'border-red-400' : ''}`} value={addFormData.campId || ''} onChange={e => setAddFormData({ ...addFormData, campId: e.target.value })} disabled={!addFormData.area}>
                <option value="">{t('nav.camps')}</option>
                {filteredCampsForAdd.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.campId && <p className="text-xs text-red-500">{errors.campId}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">{t('common.labels.total')}</label>
              <Input type="number" placeholder="0" value={addFormData.familyCount || ''} onChange={e => setAddFormData({ ...addFormData, familyCount: Number(e.target.value) })} className={errors.familyCount ? 'border-red-400' : ''} />
              {errors.familyCount && <p className="text-xs text-red-500">{errors.familyCount}</p>}
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {t('common.messages.saveError')}
              </div>
            )}
          </div>

          <DialogFooter className="mt-2 flex flex-row gap-3">
            <Button onClick={handleAddSubmit} disabled={submitting} className="flex-1 h-11 gap-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('common.buttons.save')}
            </Button>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1 h-11 rounded-xl">{t('common.buttons.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

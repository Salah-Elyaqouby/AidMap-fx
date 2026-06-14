'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Pencil, Plus, Search, Loader2, AlertCircle, ChevronLeft } from 'lucide-react'

import { requireAdmin } from '@/app/(protected)/project/helpers/route-guards'

const normalizePhone = (value: string) => value.replace(/[^\d]/g, '').slice(0, 10)
const isValidPalestinePhone = (phone: string) => /^(056|059)\d{7}$/.test(phone)

type HospitalRecord = {
  id: string
  hospitalType: string
  hospitalName: string
  region: string
  phone: string
  latitude: number | null
  longitude: number | null
}

const BASE_URL = '/api/project/Medical-Services/hospitals'

const REGIONS = [
  { value: 'شمال', label: 'شمال' },
  { value: 'جنوب', label: 'جنوب' },
  { value: 'شرق', label: 'شرق' },
  { value: 'غرب', label: 'غرب' },
]

const TYPES = [
  { value: 'حكومية', label: 'حكومية' },
  { value: 'خاص', label: 'خاص' },
  { value: 'وكالة', label: 'وكالة' },
]

const selectClass = 'w-full min-w-0 rounded-lg border border-input bg-background px-3 text-start text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'

function HospitalForm({
  hospitalName, setHospitalName,
  hospitalType, setHospitalType,
  region, setRegion,
  phone, setPhone,
  latitude, setLatitude,
  longitude, setLongitude,
}: any) {
  const { t } = useTranslation()
  const isPhoneInvalid = phone.length > 0 && !isValidPalestinePhone(phone)

  return (
    <div className="flex flex-col gap-4 py-2 text-start">
      <div className="space-y-1.5">
        <label className="text-sm font-semibold">{t('pages.hospitals.name')}</label>
        <Input className="h-11" placeholder={t('pages.hospitals.name')} value={hospitalName} onChange={e => setHospitalName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold">{t('pages.hospitals.type')}</label>
        <select className={`${selectClass} h-11`} value={hospitalType} onChange={e => setHospitalType(e.target.value)}>
          <option value="">اختر النوع</option>
          {TYPES.map(tp => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold">المنطقة</label>
        <select className={`${selectClass} h-11`} value={region} onChange={e => setRegion(e.target.value)}>
          <option value="">اختر المنطقة</option>
          {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold">{t('common.labels.phone')}</label>
        <Input
          className={`h-11 ${isPhoneInvalid ? 'border-red-500 focus:ring-red-500/20' : ''}`}
          placeholder="05XXXXXXXX"
          value={phone}
          onChange={e => setPhone(normalizePhone(e.target.value))}
        />
        {isPhoneInvalid && <p className="text-[10px] text-red-500 font-medium">يجب أن يبدأ بـ 056 أو 059 ويتكون من 10 أرقام</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold">خط العرض</label>
          <Input className="h-11" type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold">خط الطول</label>
          <Input className="h-11" type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} />
        </div>
      </div>
    </div>
  )
}

export default function HospitalsPage() {
  const { t } = useTranslation()
  const router = useRouter()

  const [isVerifying, setIsVerifying] = useState(true)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<HospitalRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addType, setAddType] = useState('')
  const [addRegion, setAddRegion] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addLat, setAddLat] = useState('')
  const [addLng, setAddLng] = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState('')
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('')
  const [editRegion, setEditRegion] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      const isAdmin = await requireAdmin()
      if (!isAdmin) {
        router.push('/unauthorized')
        return
      }
      setIsVerifying(false)
    }
    checkAccess()
  }, [router])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(BASE_URL)
      const data = await res.json()
      setItems(Array.isArray(data.hospitals) ? data.hospitals : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isVerifying) fetchData()
  }, [isVerifying])

  const isPhoneDuplicateAdd = useMemo(() => items.some(item => item.phone === addPhone), [items, addPhone])
  const isPhoneDuplicateEdit = useMemo(() => items.some(item => item.phone === editPhone && item.id !== editId), [items, editPhone, editId])

  const isAddValid = useMemo(() =>
    addName.trim() !== '' && addType !== '' && addRegion !== '' &&
    isValidPalestinePhone(addPhone) && !isPhoneDuplicateAdd,
    [addName, addType, addRegion, addPhone, isPhoneDuplicateAdd]
  )

  const isEditValid = useMemo(() =>
    editName.trim() !== '' && editType !== '' && editRegion !== '' &&
    isValidPalestinePhone(editPhone) && !isPhoneDuplicateEdit,
    [editName, editType, editRegion, editPhone, isPhoneDuplicateEdit]
  )

  const onAdd = async () => {
    if (!isAddValid) return
    setAddSubmitting(true)
    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalName: addName, hospitalType: addType, region: addRegion, phone: addPhone, latitude: addLat || null, longitude: addLng || null })
      })
      if (res.ok) {
        await fetchData()
        setAddOpen(false)
        setAddName(''); setAddType(''); setAddRegion(''); setAddPhone(''); setAddLat(''); setAddLng('')
      }
    } finally { setAddSubmitting(false) }
  }

  const openEdit = (item: HospitalRecord) => {
    setEditId(item.id)
    setEditName(item.hospitalName)
    setEditType(item.hospitalType)
    setEditRegion(item.region)
    setEditPhone(item.phone)
    setEditLat(item.latitude != null ? String(item.latitude) : '')
    setEditLng(item.longitude != null ? String(item.longitude) : '')
    setEditOpen(true)
  }

  const onEdit = async () => {
    if (!isEditValid) return
    setEditSubmitting(true)
    try {
      const res = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, hospitalName: editName, hospitalType: editType, region: editRegion, phone: editPhone, latitude: editLat || null, longitude: editLng || null })
      })
      if (res.ok) { await fetchData(); setEditOpen(false) }
    } finally { setEditSubmitting(false) }
  }

  const filteredItems = useMemo(() =>
    items.filter(item =>
      item.hospitalName?.toLowerCase().includes(q.toLowerCase()) ||
      item.region?.toLowerCase().includes(q.toLowerCase())
    ),
    [items, q]
  )

  if (isVerifying) return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="w-full px-4 py-6">
      <div className="mb-6 text-start">
        <h1 className="text-2xl font-bold">{t('pages.hospitals.title')}</h1>
      </div>

      <Card className="overflow-hidden rounded-xl border shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-3 border-b text-start">
            <div className="relative w-full max-w-xs">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t('common.messages.searchPlaceholder')} className="h-10 pe-10" />
            </div>
            <Button onClick={() => setAddOpen(true)} className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 gap-2 sm:ms-auto">
              <Plus className="h-4 w-4" /> {t('pages.hospitals.addButton')}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="p-4 font-semibold text-start">النوع</th>
                  <th className="p-4 font-semibold text-start">اسم المستشفى</th>
                  <th className="p-4 font-semibold text-start">المنطقة</th>
                  <th className="p-4 font-semibold text-start">الهاتف</th>
                  <th className="p-4 text-center font-semibold">الإجراءات</th>
                  <th className="p-4 text-center font-semibold">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="p-16 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto mb-2 size-5" />{t('common.messages.loading')}</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={6} className="p-16 text-center text-muted-foreground italic">{t('common.messages.noData')}</td></tr>
                ) : filteredItems.map(item => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/30">
                    <td className="p-4 font-medium text-blue-600 text-start">
                      <span className="bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider">{item.hospitalType}</span>
                    </td>
                    <td className="p-4 font-semibold text-start">{item.hospitalName}</td>
                    <td className="p-4 text-muted-foreground text-start">{item.region}</td>
                    <td className="p-4 text-muted-foreground text-start">{item.phone}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => openEdit(item)} className="rounded-md border p-2 text-muted-foreground hover:bg-blue-50 hover:text-blue-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button 
  onClick={() => router.push(`/project/projects/Medical-Services/hospitals/${item.id}`)} 
  className="rounded-md border p-2 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600"
>
  <ChevronLeft className="w-4 h-4" />
</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog - (باقي الكود كما هو) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-start">{t('pages.hospitals.addTitle')}</DialogTitle></DialogHeader>
          <HospitalForm
            hospitalName={addName} setHospitalName={setAddName}
            hospitalType={addType} setHospitalType={setAddType}
            region={addRegion} setRegion={setAddRegion}
            phone={addPhone} setPhone={setAddPhone}
            latitude={addLat} setLatitude={setAddLat}
            longitude={addLng} setLongitude={setAddLng}
          />
          {!isAddValid && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              <AlertCircle className="w-3.5 h-3.5" />
              {addPhone.length > 0 && !isValidPalestinePhone(addPhone)
                ? "الرقم غير صحيح"
                : isPhoneDuplicateAdd
                ? "عذراً، هذا الرقم مسجل مسبقاً لمستشفى آخر"
                : t('common.messages.required')}
            </div>
          )}
          <DialogFooter className="flex flex-row gap-3">
            <Button onClick={onAdd} disabled={!isAddValid || addSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {addSubmitting && <Loader2 className="animate-spin size-4 me-2" />}
              {t('common.buttons.save')}
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">{t('common.buttons.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - (باقي الكود كما هو) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-start">تعديل المستشفى</DialogTitle></DialogHeader>
          <HospitalForm
            hospitalName={editName} setHospitalName={setEditName}
            hospitalType={editType} setHospitalType={setEditType}
            region={editRegion} setRegion={setEditRegion}
            phone={editPhone} setPhone={setEditPhone}
            latitude={editLat} setLatitude={setEditLat}
            longitude={editLng} setLongitude={setEditLng}
          />
          {!isEditValid && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              <AlertCircle className="w-3.5 h-3.5" />
              {editPhone.length > 0 && !isValidPalestinePhone(editPhone)
                ? "الرقم غير صحيح"
                : isPhoneDuplicateEdit
                ? "عذراً، هذا الرقم مسجل مسبقاً لمستشفى آخر"
                : t('common.messages.required')}
            </div>
          )}
          <DialogFooter className="flex flex-row gap-3">
            <Button onClick={onEdit} disabled={!isEditValid || editSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {editSubmitting && <Loader2 className="animate-spin size-4 me-2" />}
              {t('common.buttons.save')}
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">{t('common.buttons.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
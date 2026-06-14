'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit2, Loader2, Plus, Check, X, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const SPECIALIZATIONS = ['جراحة عامة', 'طب أطفال', 'الاستقبال والطوارئ', 'الأمراض الباطنية', 'النساء والتوليد', 'العناية المكثفة', 'القلب والأوعية الدموية', 'العظام والمفاصل', 'العيون', 'الأنف والأذن والحنجرة']
const SCHEDULES = ['السبت، الاثنين، الأربعاء', 'الأحد، الثلاثاء، الخميس', 'يومياً (السبت - الخميس)']

const formatPhoneNumber = (phone: string) => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

type Doctor = {
  id: string
  name: string
  specialty: string
  phone: string
  workSchedule: string
  departmentId?: string
  hospitalId: string
}

type Hospital = {
  id: string
  hospitalName: string
}

export default function DoctorsPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null)
  const [editDoctorData, setEditDoctorData] = useState<any>(null)

  const [addForm, setAddForm] = useState({
    name: '',
    hospitalId: '',
    specialty: '',
    phone: '',
    workSchedule: '',
    departmentId: ''
  })

  const isPhoneValid = (phone: string) => /^(056|059)\d{7}$/.test(phone)
  const isFormValid = useMemo(() =>
    addForm.name.trim() !== '' && addForm.hospitalId !== '' && addForm.specialty !== '' &&
    addForm.workSchedule !== '' && isPhoneValid(addForm.phone),
    [addForm])

  // Fetch hospitals and all doctors
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const hospitalsRes = await fetch('/api/project/Medical-Services/hospitals')
        const hospitalsData = await hospitalsRes.json()
        setHospitals(hospitalsData.hospitals || [])

        // Fetch all doctors from all hospitals
        const allDoctors: Doctor[] = []
        for (const hospital of hospitalsData.hospitals || []) {
          const doctorsRes = await fetch(`/api/project/Medical-Services/hospitals/${hospital.id}/doctors`)
          if (doctorsRes.ok) {
            const data = await doctorsRes.json()
            allDoctors.push(...data)
          }
        }
        setDoctors(allDoctors)
      } catch (e) {
        console.error('Error fetching data:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const onAdd = async () => {
    try {
      const res = await fetch(`/api/project/Medical-Services/hospitals/${addForm.hospitalId}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        const newDoctor = await res.json()
        setDoctors([...doctors, newDoctor])
        alert("تم الحفظ بنجاح!")
        setAddOpen(false)
        setAddForm({ name: '', hospitalId: '', specialty: '', phone: '', workSchedule: '', departmentId: '' })
      } else {
        alert("خطأ في الاتصال بالخادم")
      }
    } catch (e) { console.error(e) }
  }

  const handleSaveDoctorEdit = async (docId: string) => {
    if (!editDoctorData) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/project/Medical-Services/hospitals/${editDoctorData.hospitalId}/doctors`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId, ...editDoctorData }),
      })

      if (res.ok) {
        const updatedDoctor = await res.json()
        setDoctors(prev => prev.map(d => d.id === docId ? updatedDoctor : d))
        setEditingDoctorId(null)
        setEditDoctorData(null)
        alert("تم التعديل بنجاح!")
      } else {
        const err = await res.json()
        alert("فشل التعديل: " + (err.error || "خطأ غير معروف"))
      }
    } catch (err) {
      console.error("Error:", err)
      alert("حدث خطأ أثناء الاتصال بالسيرفر")
    } finally {
      setSubmitting(false)
    }
  }

  const getHospitalName = (hospitalId: string) => {
    return hospitals.find(h => h.id === hospitalId)?.hospitalName || 'غير معروف'
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الأطباء</h1>
        <Button onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" /> إضافة طبيب جديد
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader><DialogTitle>إضافة طبيب جديد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="اسم الطبيب"
              value={addForm.name}
              onChange={e => setAddForm({...addForm, name: e.target.value})}
            />
            <Select value={addForm.hospitalId} onValueChange={e => setAddForm({...addForm, hospitalId: e})}>
              <SelectTrigger><SelectValue placeholder="اختر المستشفى" /></SelectTrigger>
              <SelectContent>{hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.hospitalName}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={addForm.specialty} onValueChange={e => setAddForm({...addForm, specialty: e})}>
              <SelectTrigger><SelectValue placeholder="اختر التخصص" /></SelectTrigger>
              <SelectContent>{SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={addForm.workSchedule} onValueChange={e => setAddForm({...addForm, workSchedule: e})}>
              <SelectTrigger><SelectValue placeholder="اختر مواعيد الدوام" /></SelectTrigger>
              <SelectContent>{SCHEDULES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <div>
              <Input
                placeholder="رقم الهاتف (059xxxxxxx)"
                value={addForm.phone}
                onChange={e => setAddForm({...addForm, phone: e.target.value})}
              />
              {addForm.phone && <p className="text-sm text-slate-500 mt-1 font-mono" dir="ltr">التنسيق: {formatPhoneNumber(addForm.phone)}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button disabled={!isFormValid} onClick={onAdd}>حفظ البيانات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="rounded-xl border shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b bg-slate-50/50">
            <p className="font-semibold text-sm text-muted-foreground">إجمالي الأطباء: {doctors.length}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b sticky top-0 bg-white">
                <tr>
                  <th className="p-4 font-semibold text-start">اسم الطبيب</th>
                  <th className="p-4 font-semibold text-start">المستشفى</th>
                  <th className="p-4 font-semibold text-start">التخصص</th>
                  <th className="p-4 font-semibold text-start">الهاتف</th>
                  <th className="p-4 font-semibold text-start">جدول العمل</th>
                  <th className="p-4 font-semibold text-center">تعديل</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {doctors.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-muted-foreground italic">لا توجد أطباء مسجلين</td></tr>
                ) : (
                  doctors.map(doc => (
                    <tr key={doc.id} className="hover:bg-muted/30">
                      <td className="p-4 font-semibold">{doc.name}</td>
                      <td className="p-4">{getHospitalName(doc.hospitalId)}</td>
                      <td className="p-4">{doc.specialty}</td>
                      <td className="p-4">
                         <div dir="ltr" className="font-mono text-slate-900">{doc.phone}</div>
                         <p className="text-xs text-slate-500 font-mono mt-1" dir="ltr">{formatPhoneNumber(doc.phone)}</p>
                       </td>
                      <td className="p-4">{doc.workSchedule}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            setEditingDoctorId(doc.id)
                            setEditDoctorData({
                              name: doc.name,
                              specialty: doc.specialty,
                              phone: doc.phone,
                              workSchedule: doc.workSchedule,
                              hospitalId: doc.hospitalId,
                              departmentId: doc.departmentId || ''
                            })
                          }}
                          className="rounded-md border p-2 text-muted-foreground hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Dialog open={editingDoctorId !== null} onOpenChange={(open) => {
            if (!open) {
              setEditingDoctorId(null)
              setEditDoctorData(null)
            }
          }}>
            <DialogContent className="sm:max-w-[425px]" dir="rtl">
              <DialogHeader><DialogTitle>تعديل بيانات الطبيب</DialogTitle></DialogHeader>
              {editDoctorData && (
                <div className="space-y-4 py-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">اسم الطبيب</label>
                    <Input
                      value={editDoctorData.name}
                      onChange={(e) => setEditDoctorData({...editDoctorData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">المستشفى</label>
                    <Select value={editDoctorData.hospitalId} onValueChange={(val) => setEditDoctorData({...editDoctorData, hospitalId: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{hospitals.map(h => <SelectItem key={h.id} value={h.id}>{h.hospitalName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">التخصص</label>
                    <Select value={editDoctorData.specialty} onValueChange={(val) => setEditDoctorData({...editDoctorData, specialty: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">رقم الهاتف</label>
                    <Input
                      value={editDoctorData.phone}
                      onChange={(e) => setEditDoctorData({...editDoctorData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                      className={editDoctorData.phone && !isPhoneValid(editDoctorData.phone) ? "border-red-500" : ""}
                    />
                    {editDoctorData.phone && !isPhoneValid(editDoctorData.phone) && (
                      <p className="text-[11px] text-red-500 font-bold">يجب أن يبدأ الرقم بـ 056 أو 059 وأن يتكون من 10 أرقام</p>
                    )}
                    {editDoctorData.phone && isPhoneValid(editDoctorData.phone) && (
                      <p className="text-sm text-slate-500 font-mono" dir="ltr">التنسيق: {formatPhoneNumber(editDoctorData.phone)}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">جدول العمل</label>
                    <Select value={editDoctorData.workSchedule} onValueChange={(val) => setEditDoctorData({...editDoctorData, workSchedule: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SCHEDULES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingDoctorId(null)
                    setEditDoctorData(null)
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  disabled={!editDoctorData || !editDoctorData.name.trim() || !isPhoneValid(editDoctorData.phone) || submitting}
                  onClick={() => editingDoctorId && handleSaveDoctorEdit(editingDoctorId)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? <Loader2 className="animate-spin w-4 h-4 ml-2" /> : 'حفظ التعديلات'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
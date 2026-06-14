'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
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
import { Pencil, Save, X, Plus, Loader2 } from 'lucide-react'

// --- ظˆط¸ط§ط¦ظپ ط§ظ„طھط­ظ‚ظ‚ ط§ظ„ظ…ط³ط§ط¹ط¯ط© ---
const normalizePhone = (value: string) => value.replace(/[^\d]/g, '').slice(0, 10)

const isValidPalestinePhone = (phone: string) => {
  const regex = /^(056|059)\d{7}$/
  return regex.test(phone)
}

const API_URL = '/api/project/camp/supervisior'

export default function SupervisorsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // ط­ط§ظ„ط§طھ ط§ظ„ط¥ط¶ط§ظپط© ظˆط§ظ„طھط¹ط¯ظٹظ„
  const [addOpen, setAddOpen] = useState(false)
  const [nameAr, setNameAr] = useState('')
  const [phone, setPhone] = useState('')
  const [area, setArea] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false) 
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ nameAr: "", phone: "", status: "active" })

  // ط±ط³ط§ط¦ظ„ ط§ظ„طھظ†ط¨ظٹظ‡
  const phoneErrorMessage = "ظٹط¬ط¨ ط£ظ† ظٹط¨ط¯ط£ ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط¨ظ€ 056 ط£ظˆ 059 ظˆظٹطھظƒظˆظ† ظ…ظ† 10 ط£ط±ظ‚ط§ظ…"
  const duplicateErrorMessage = "ط¹ظپظˆط§ظ‹! ظ‡ط°ط§ ط§ظ„ط±ظ‚ظ… ظ…ظˆط¬ظˆط¯ ظ…ط³ط¨ظ‚ط§ظ‹ ظپظٹ ط§ظ„ظ†ط¸ط§ظ…"

  // ط­ظ…ط§ظٹط© ط§ظ„طµظپط­ط© ظˆط§ظ„طھط£ظƒط¯ ظ…ظ† طµظ„ط§ط­ظٹط© ط§ظ„ط£ط¯ظ…ظ†
  useEffect(() => {
    const checkAccess = async () => {
      await requireAdmin(router)
      setIsAuthorized(true)
    }
    checkAccess()
  }, [router])

  // --- ط¯ط§ظ„ط© ظپط­طµ ط§ظ„طھظƒط±ط§ط± ---
  const checkDuplicate = (phoneToTest: string, currentId: string | null) => {
    const cleanPhone = phoneToTest.trim();
    if (!cleanPhone) return false;
    return items.some(item => 
      String(item.phone).trim() === cleanPhone && String(item.id) !== String(currentId)
    );
  }

  const fetchSupervisors = async () => {
    setLoading(true)
    try {
      const res = await fetch(API_URL)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { 
    if (isAuthorized) fetchSupervisors() 
  }, [isAuthorized])

  // ظ…ظ†ط·ظ‚ ط§ظ„طھط­ظ‚ظ‚ ظ„ظ„ط¥ط¶ط§ظپط©
  const isAddDuplicate = checkDuplicate(phone, null);
  const canSaveAdd = nameAr.trim() !== '' && area !== '' && isValidPalestinePhone(phone) && !isAddDuplicate;

  const onAdd = async () => {
    if (!canSaveAdd) return;
    setSubmitting(true)
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameAr: nameAr.trim(), phone: phone.trim(), status: 'active' }),
      })
      if (res.ok) {
        await fetchSupervisors()
        setAddOpen(false); setNameAr(''); setPhone(''); setPhoneTouched(false);
      }
    } catch (err) { console.error(err) }
    finally { setSubmitting(false) }
  }

  const onSaveEdit = async (id: string) => {
    const isDuplicate = checkDuplicate(editDraft.phone, id);
    const isInvalid = !isValidPalestinePhone(editDraft.phone);

    if (isDuplicate || isInvalid || submitting) {
      alert(isDuplicate ? duplicateErrorMessage : "ط¨ظٹط§ظ†ط§طھ ط؛ظٹط± طµط§ظ„ط­ط©");
      return;
    }
    
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nameAr: editDraft.nameAr.trim(),
            phone: editDraft.phone.trim(),
            status: editDraft.status
        }),
      })
      if (res.ok) {
        setEditingId(null);
        await fetchSupervisors();
      }
    } catch (err) { console.error(err) }
    finally { setSubmitting(false) }
  }

  // ط´ط§ط´ط© طھط­ظ…ظٹظ„ ظپظٹ ط­ط§ظ„ ط¹ط¯ظ… ط§ظƒطھظ…ط§ظ„ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„طµظ„ط§ط­ظٹط©
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="w-full p-6 text-start" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط´ط±ظپظٹظ†</h1>
        <Button onClick={() => { setAddOpen(true); setPhoneTouched(false); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="ml-2 h-4 w-4" /> ط¥ط¶ط§ظپط© ظ…ط´ط±ظپ
        </Button>
      </div>

      <Card className="shadow-sm border">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-right">ط§ظ„ط§ط³ظ…</th>
                <th className="p-4 text-right">ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ</th>
                <th className="p-4 text-right">ط§ظ„ط¥ط¬ط±ط§ط،ط§طھ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((sp: any) => {
                const isEditing = editingId === sp.id;
                const isEditDuplicate = isEditing && checkDuplicate(editDraft.phone, sp.id);
                const isEditInvalid = isEditing && !isValidPalestinePhone(editDraft.phone);

                return (
                  <tr key={sp.id} className="border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium">
                      {isEditing ? (
                        <Input value={editDraft.nameAr} onChange={(e) => setEditDraft({...editDraft, nameAr: e.target.value})} />
                      ) : sp.nameAr}
                    </td>
                    <td className="p-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 min-w-[180px]">
                          <Input 
                            value={editDraft.phone} 
                            maxLength={10}
                            onChange={(e) => setEditDraft({...editDraft, phone: normalizePhone(e.target.value)})}
                            className={(isEditInvalid || isEditDuplicate) ? "border-red-500 bg-red-50" : "border-blue-400"}
                          />
                          {isEditInvalid && <span className="text-[10px] text-red-600 font-bold">{phoneErrorMessage}</span>}
                          {isEditDuplicate && <span className="text-[10px] text-red-600 font-bold bg-yellow-100 p-1">âڑ ï¸ڈ {duplicateErrorMessage}</span>}
                        </div>
                      ) : sp.phone}
                    </td>
                    <td className="p-4 flex gap-2">
                      {isEditing ? (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => onSaveEdit(sp.id)} 
                            disabled={isEditInvalid || isEditDuplicate || submitting} 
                            className="bg-green-600"
                          >
                             {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => {
                          setEditingId(sp.id);
                          setEditDraft({ nameAr: sp.nameAr, phone: sp.phone, status: sp.status });
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="text-right">ط¥ط¶ط§ظپط© ظ…ط´ط±ظپ ط¬ط¯ظٹط¯</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 text-right">
            <div>
              <label className="block text-sm font-bold mb-1">ط§ط³ظ… ط§ظ„ظ…ط´ط±ظپ *</label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="ط£ط¯ط®ظ„ ط§ظ„ط§ط³ظ…" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ *</label>
              <Input 
                value={phone} 
                maxLength={10}
                placeholder="05XXXXXXXX"
                onChange={(e) => { setPhone(normalizePhone(e.target.value)); setPhoneTouched(true); }}
                className={phoneTouched && (phone.length > 0 && (!isValidPalestinePhone(phone) || isAddDuplicate)) ? "border-red-500" : ""}
              />
              {phoneTouched && phone.length > 0 && !isValidPalestinePhone(phone) && (
                <p className="text-[11px] text-red-600 font-bold mt-1">âڑ ï¸ڈ {phoneErrorMessage}</p>
              )}
              {phoneTouched && isAddDuplicate && (
                <p className="text-[11px] text-red-600 font-bold mt-1 bg-yellow-50 p-1">âڑ ï¸ڈ {duplicateErrorMessage}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">ط§ظ„ظ…ظ†ط·ظ‚ط© *</label>
              <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full border rounded-md p-2 bg-white">
                <option value="">ط§ط®طھط± ط§ظ„ظ…ظ†ط·ظ‚ط©</option>
                <option value="Gaza">ط؛ط²ط©</option>
                <option value="North">ط§ظ„ط´ظ…ط§ظ„</option>
                <option value="South">ط§ظ„ط¬ظ†ظˆط¨</option>
                <option value="Center">ط§ظ„ظˆط³ط·ظ‰</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={onAdd} disabled={!canSaveAdd || submitting} className={`w-full font-bold ${!canSaveAdd ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {submitting ? "ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸..." : "ط­ظپط¸ ط§ظ„ط¨ظٹط§ظ†ط§طھ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

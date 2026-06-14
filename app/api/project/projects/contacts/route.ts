import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

// --- 1. المحولات (Adapters) ---
type DbStatus = 'DONE' | 'NOT_DONE'

// تحويل الحالة لتناسب قاعدة البيانات - تم التعديل لتقبل كل الصيغ الممكنة
function toDbStatus(status: any): DbStatus {
  const s = String(status).trim()
  if (s === 'تم' || s === 'DONE') return 'DONE'
  return 'NOT_DONE'
}

// تحويل الحالة لتناسب الواجهة
function toUiStatus(status: string): string {
  return status === 'DONE' ? 'تم' : 'لم يتم'
}

function normalizeContact(contact: any) {
  return {
    id: contact.id,
    beneficiaryId: contact.beneficiaryId,
    institutionId: contact.institutionId,
    type: contact.type ?? '',
    notes: contact.notes ?? '',
    status: toUiStatus(contact.status),
    date: contact.date ? new Date(contact.date).toISOString().split('T')[0] : '',
    beneficiary: contact.beneficiary ?? null,
    institution: contact.institution ?? null,
  }
}

// --- 2. قواعد التحقق (Schemas) ---
const createSchema = z.object({
  beneficiaryId: z.string().min(1, 'المستفيد مطلوب'),
  institutionId: z.string().min(1, 'المؤسسة مطلوبة'),
  status: z.string().min(1, 'الحالة مطلوبة'),
  type: z.string().min(1, 'نوع التواصل مطلوب'),
  date: z.string().min(1, 'التاريخ مطلوب'),
  notes: z.string().optional().nullable(),
})

const updateSchema = z.object({
  beneficiaryId: z.string().min(1).optional(),
  institutionId: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  notes: z.string().optional().nullable(),
})

// --- 3. دالة GET ---
export async function GET(req: NextRequest) {
  try {
    const typeParam = req.nextUrl.searchParams.get('type')
    
    if (typeParam === 'options') {
      const [beneficiaries, institutions] = await Promise.all([
        prisma.beneficiary.findMany({ select: { id: true, name: true } }),
        prisma.institution.findMany({ select: { id: true, name: true } }),
      ])
      return NextResponse.json({ beneficiaries, institutions })
    }

    const contacts = await prisma.contact.findMany({
      orderBy: { date: 'desc' },
      include: {
        beneficiary: { select: { name: true } },
        institution: { select: { name: true } },
      },
    })

    return NextResponse.json(contacts.map(normalizeContact))
  } catch (e) {
    return NextResponse.json({ message: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

// --- 4. دالة POST (إضافة سجل) ---
export async function POST(req: NextRequest) {
  try {
    const rawData = await req.json()
    const body = createSchema.parse(rawData)

    const created = await prisma.contact.create({
      data: {
        beneficiaryId: body.beneficiaryId,
        institutionId: body.institutionId,
        status: toDbStatus(body.status),
        type: body.type,
        date: new Date(body.date),
        notes: body.notes || '',
      },
      include: { 
        beneficiary: { select: { name: true } }, 
        institution: { select: { name: true } } 
      },
    })

    return NextResponse.json(normalizeContact(created), { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: 'بيانات غير مكتملة أو خاطئة' }, { status: 400 })
  }
}

// --- 5. دالة PUT (تعديل سجل) ---
export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const rawData = await req.json()
    const contactId = id || rawData.id

    if (!contactId) return NextResponse.json({ message: 'المعرّف مفقود' }, { status: 400 })

    const body = updateSchema.parse(rawData)
    const updateData: any = {}
    
    if (body.beneficiaryId) updateData.beneficiaryId = body.beneficiaryId
    if (body.institutionId) updateData.institutionId = body.institutionId
    if (body.type) updateData.type = body.type
    if (body.status) updateData.status = toDbStatus(body.status)
    if (body.date) updateData.date = new Date(body.date)
    if (body.notes !== undefined) updateData.notes = body.notes

    const updated = await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
      include: { 
        beneficiary: { select: { name: true } }, 
        institution: { select: { name: true } } 
      },
    })

    return NextResponse.json(normalizeContact(updated))
  } catch (e: any) {
    return NextResponse.json({ message: 'فشل التحديث' }, { status: 400 })
  }
}

// --- 6. دالة DELETE ---
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  try {
    if (!id) return NextResponse.json({ message: 'المعرّف مطلوب' }, { status: 400 })
    await prisma.contact.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ message: 'فشل الحذف' }, { status: 500 })
  }
}
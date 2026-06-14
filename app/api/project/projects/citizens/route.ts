import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BeneficiaryPriority } from '@prisma/client'
import prisma from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid' // تأكد من تثبيت مكتبة uuid

function toDbPriority(priority: 'مستعجل' | 'عادي' | 'حرج'): BeneficiaryPriority {
  if (priority === 'مستعجل') return BeneficiaryPriority.URGENT
  if (priority === 'حرج') return BeneficiaryPriority.IMPORTANT
  return BeneficiaryPriority.NORMAL
}

function fromDbPriority(priority: BeneficiaryPriority): 'مستعجل' | 'عادي' | 'حرج' {
  if (priority === BeneficiaryPriority.URGENT) return 'مستعجل'
  if (priority === BeneficiaryPriority.IMPORTANT) return 'حرج'
  return 'عادي'
}

const citizenSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').trim(),
  phone: z.string().trim().min(1, 'رقم الهاتف مطلوب'),
  numberOfFamily: z.coerce.number().int().min(0),
  campId: z.string().optional().nullable(),
  priority: z.enum(['مستعجل', 'عادي', 'حرج']),
})

export async function GET() {
  try {
    const citizens = await prisma.citizens.findMany({
      orderBy: { createdAt: 'desc' },
      include: { Camps: true }, 
    })
    
    return NextResponse.json(citizens.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      numberOfFamily: c.numberOfFamily,
      campId: c.campId,
      campName: c.Camps?.name ?? 'غير محدد',
      priority: fromDbPriority(c.priority),
    })))
  } catch (e) {
    return NextResponse.json({ message: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = citizenSchema.parse(await req.json())
    
    const created = await prisma.citizens.create({
      data: {
        id: uuidv4(), // إنشاء ID يدوياً لأن الموديل عندك لا يستخدم @default(uuid)
        name: body.name,
        phone: body.phone,
        numberOfFamily: body.numberOfFamily,
        campId: body.campId,
        priority: toDbPriority(body.priority),
        updatedAt: new Date(),
      },
      include: { Camps: true }
    })

    return NextResponse.json(created)
  } catch (e) {
    console.error("POST Error:", e)
    return NextResponse.json({ message: 'فشل الإضافة، تأكد من البيانات' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  
  if (!id) return NextResponse.json({ message: 'المعرف مفقود' }, { status: 400 })

  try {
    const body = await req.json()
    const updated = await prisma.citizens.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
      include: { Camps: true }
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ message: 'فشل التعديل' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ message: 'المعرف مفقود' }, { status: 400 })
  
  try {
    await prisma.citizens.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ message: 'فشل الحذف' }, { status: 400 })
  }
}
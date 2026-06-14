import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

// --- 1. المحولات (Adapters) ---
/**
 * دالة التوحيد (Normalization)
 * تقوم بتحويل أسماء الحقول من قاعدة البيانات (area, location) 
 * إلى الأسماء التي يتوقعها الفرونت إند (city, governorate)
 */
function normalizeAddress(addr: any) {
  return {
    id: addr.id,
    campId: addr.campId,
    city: addr.area || '',         // area في بريزما تقابل city في الفرونت
    governorate: addr.location || '', // location في بريزما تقابل governorate في الفرونت
    camp: addr.camp ? { id: addr.camp.id, name: addr.camp.name } : null,
  }
}

// --- 2. قواعد التحقق (Schemas) ---
const addressSchema = z.object({
  campId: z.string().min(1, 'اسم المخيم مطلوب'),
  city: z.string().min(1, 'المنطقة مطلوبة'),        // نستقبلها كـ city
  governorate: z.string().min(1, 'الموقع مطلوب'),   // نستقبلها كـ governorate
})

// --- 3. دالة GET ---
export async function GET(req: NextRequest) {
  try {
    const addresses = await prisma.address.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        camp: { select: { id: true, name: true } }
      },
    })

    return NextResponse.json(addresses.map(normalizeAddress))
  } catch (e) {
    console.error("GET ADDRESS ERROR:", e)
    return NextResponse.json([], { status: 200 }) 
  }
}

// --- 4. دالة POST ---
export async function POST(req: NextRequest) {
  try {
    const rawData = await req.json()
    const body = addressSchema.parse(rawData)

    const created = await prisma.address.create({
      data: {
        campId: body.campId,
        area: body.city,         // تخزين city في حقل area
        location: body.governorate, // تخزين governorate في حقل location
      },
      include: { 
        camp: { select: { id: true, name: true } } 
      }
    })

    return NextResponse.json(normalizeAddress(created), { status: 201 })
  } catch (error: any) {
    console.error("POST ADDRESS ERROR:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "تأكد من إكمال جميع الحقول" }, { status: 400 })
    }

    return NextResponse.json({ message: "فشل في حفظ البيانات" }, { status: 500 })
  }
}

// --- 5. دالة PUT ---
export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const rawData = await req.json()
    const addressId = id || rawData.id

    if (!addressId) {
      return NextResponse.json({ message: "المعرف مطلوب" }, { status: 400 })
    }

    const body = addressSchema.partial().parse(rawData)

    // تحويل البيانات القادمة لتناسب أسماء الحقول في قاعدة البيانات
    const updateData: any = {}
    if (body.campId) updateData.campId = body.campId
    if (body.city) updateData.area = body.city
    if (body.governorate) updateData.location = body.governorate

    const updated = await prisma.address.update({
      where: { id: addressId },
      data: updateData,
      include: { 
        camp: { select: { id: true, name: true } } 
      }
    })

    return NextResponse.json(normalizeAddress(updated))
  } catch (error: any) {
    console.error("PUT ADDRESS ERROR:", error)
    return NextResponse.json({ message: "فشل في تحديث البيانات" }, { status: 400 })
  }
}

// --- 6. دالة DELETE ---
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ message: "المعرف مطلوب" }, { status: 400 })
    }

    await prisma.address.delete({
      where: { id }
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("DELETE ADDRESS ERROR:", error)
    return NextResponse.json({ message: "فشل في حذف السجل" }, { status: 500 })
  }
}
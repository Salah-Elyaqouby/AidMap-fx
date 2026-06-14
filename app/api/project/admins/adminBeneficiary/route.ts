import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireStaffApi } from '@/lib/api/auth'

// تعريف الأنواع بناءً على ما يتم إرساله من الفرونت إند
type CreateBeneficiaryBody = {
  name?: unknown
  phone?: unknown
  numberOfFamily?: unknown
  campId?: unknown
  role?: unknown
}

const ARABIC_NAME_REGEX = /^[\u0600-\u06FF\s]+$/
const PHONE_REGEX = /^(056|059)\d{7}$/
const FAMILY_REGEX = /^\d{1,2}$/

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 100
const MAX_CAMP_LENGTH = 100

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function parseOptionalText(
  value: unknown,
  maxLength: number
): string | null | 'INVALID' {
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (typeof value !== 'string') {
    return 'INVALID'
  }
  const normalized = normalizeSpaces(value)
  if (!normalized) return null
  if (normalized.length > maxLength) return 'INVALID'
  return normalized
}

// 1. جلب المستفيدين (تعديل اسم الجدول إلى citizens)
export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireStaffApi(req)
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(req.url)
    const campId = searchParams.get('campId')

    const where: Prisma.CitizensWhereInput = {}

    if (campId) {
      where.campId = campId
    }

    const beneficiaries = await prisma.citizens.findMany({
      where,
      include: {
        Camps: true, // في السكيما العلاقة اسمها Camps بحرف كبير
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        count: beneficiaries.length,
        data: beneficiaries,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'فشل في جلب المستفيدين',
      },
      { status: 500 }
    )
  }
}

// 2. تسجيل مستفيد جديد (تعديل الربط مع جدول Citizens)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateBeneficiaryBody
    const { name, phone, numberOfFamily, campId } = body

    // التحقق من البيانات
    if (typeof name !== 'string') {
      return NextResponse.json({ success: false, message: 'الاسم مطلوب' }, { status: 400 })
    }

    const normalizedName = normalizeSpaces(name)
    if (!normalizedName || normalizedName.length < NAME_MIN_LENGTH) {
      return NextResponse.json({ success: false, message: 'الاسم قصير جداً' }, { status: 400 })
    }

    if (!ARABIC_NAME_REGEX.test(normalizedName)) {
      return NextResponse.json({ success: false, message: 'الاسم يجب أن يكون بالعربية' }, { status: 400 })
    }

    if (typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
      return NextResponse.json({ success: false, message: 'رقم الهاتف غير صالح' }, { status: 400 })
    }

    const familyAsString = typeof numberOfFamily === 'number' ? String(numberOfFamily) : (numberOfFamily as string)
    if (!familyAsString || !FAMILY_REGEX.test(familyAsString)) {
      return NextResponse.json({ success: false, message: 'عدد أفراد الأسرة غير صالح' }, { status: 400 })
    }

    const parsedNumberOfFamily = Number(familyAsString)

    // التحقق من التكرار في جدول citizens
    const existingBeneficiary = await prisma.citizens.findFirst({
      where: { phone },
    })

    if (existingBeneficiary) {
      return NextResponse.json(
        { success: false, message: 'رقم الهاتف مسجل مسبقاً' },
        { status: 409 }
      )
    }

    // ربط المخيم
    let resolvedCampId: string | null = null
    const parsedCampName = parseOptionalText(campId, MAX_CAMP_LENGTH)
    
    if (parsedCampName && parsedCampName !== 'INVALID') {
      const existingCamp = await prisma.camps.findFirst({
        where: {
          OR: [{ name: parsedCampName }, { area: parsedCampName }],
        },
      })
      if (existingCamp) resolvedCampId = existingCamp.id
    }

    // إنشاء السجل في جدول citizens
    // ملاحظة: تم إضافة id و updatedAt يدوياً لأن السكيما الحالية تطلبهما ولا توفرهما تلقائياً
    const newBeneficiary = await prisma.citizens.create({
      data: {
        id: crypto.randomUUID(), // توليد ID فريد
        name: normalizedName,
        phone,
        numberOfFamily: parsedNumberOfFamily,
        campId: resolvedCampId,
        updatedAt: new Date(), // الحقل مطلوب في السكيما
        role: 'CITIZEN',
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'تم تسجيل البيانات بنجاح',
        data: newBeneficiary,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء حفظ البيانات في قاعدة البيانات' },
      { status: 500 }
    )
  }
}
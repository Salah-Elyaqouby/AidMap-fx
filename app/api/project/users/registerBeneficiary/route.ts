import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAdminApi, requireStaffApi } from '@/lib/api/auth'

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

  if (!normalized) {
    return null
  }

  if (normalized.length > maxLength) {
    return 'INVALID'
  }

  return normalized
}

export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireStaffApi(req)
    if (unauthorized) return unauthorized

    const { searchParams } = new URL(req.url)
    const campId = searchParams.get('campId')

    const where: Prisma.BeneficiaryWhereInput = {}

    if (campId) {
      where.campId = campId
    }

    const beneficiaries = await prisma.beneficiary.findMany({
      where,
      include: {
        camp: true,
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
    console.error('GET /api/project/admins/adminBeneficiary error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'فشل في جلب المستفيدين',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const unauthorized = await requireAdminApi(req)
    if (unauthorized) {
      return unauthorized
    }

    const body = (await req.json()) as CreateBeneficiaryBody
    const { name, phone, numberOfFamily, campId } = body

    if (typeof name !== 'string') {
      return NextResponse.json(
        { success: false, message: 'الاسم مطلوب' },
        { status: 400 }
      )
    }

    const normalizedName = normalizeSpaces(name)

    if (!normalizedName) {
      return NextResponse.json(
        { success: false, message: 'الاسم مطلوب' },
        { status: 400 }
      )
    }

    if (normalizedName.length < NAME_MIN_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `الاسم يجب أن يكون على الأقل ${NAME_MIN_LENGTH} أحرف`,
        },
        { status: 400 }
      )
    }

    if (normalizedName.length > NAME_MAX_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `الاسم يجب ألا يزيد عن ${NAME_MAX_LENGTH} حرفًا`,
        },
        { status: 400 }
      )
    }

    if (!ARABIC_NAME_REGEX.test(normalizedName)) {
      return NextResponse.json(
        { success: false, message: 'الاسم يجب أن يكون باللغة العربية فقط' },
        { status: 400 }
      )
    }

    if (/\s{2,}/.test(name)) {
      return NextResponse.json(
        { success: false, message: 'لا يمكن وضع أكثر من مسافة بين الكلمات' },
        { status: 400 }
      )
    }

    if (typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, message: 'رقم الهاتف مطلوب' },
        { status: 400 }
      )
    }

    if (!/^\d+$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: 'رقم الهاتف يجب أن يحتوي على أرقام فقط' },
        { status: 400 }
      )
    }

    if (!PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message: 'رقم الهاتف يجب أن يبدأ بـ 056 أو 059 وبعده 7 أرقام',
        },
        { status: 400 }
      )
    }

    const familyAsString =
      typeof numberOfFamily === 'number'
        ? String(numberOfFamily)
        : typeof numberOfFamily === 'string'
          ? numberOfFamily
          : ''

    if (!familyAsString) {
      return NextResponse.json(
        { success: false, message: 'عدد أفراد الأسرة مطلوب' },
        { status: 400 }
      )
    }

    if (!/^\d+$/.test(familyAsString)) {
      return NextResponse.json(
        { success: false, message: 'عدد أفراد الأسرة يجب أن يحتوي على أرقام فقط' },
        { status: 400 }
      )
    }

    if (!FAMILY_REGEX.test(familyAsString)) {
      return NextResponse.json(
        {
          success: false,
          message: 'عدد أفراد الأسرة يجب أن يكون من رقم أو رقمين فقط',
        },
        { status: 400 }
      )
    }

    const parsedNumberOfFamily = Number(familyAsString)

    if (!Number.isInteger(parsedNumberOfFamily) || parsedNumberOfFamily < 1) {
      return NextResponse.json(
        { success: false, message: 'عدد أفراد الأسرة غير صالح' },
        { status: 400 }
      )
    }

    const parsedCampName = parseOptionalText(campId, MAX_CAMP_LENGTH)
    if (parsedCampName === 'INVALID') {
      return NextResponse.json(
        { success: false, message: 'قيمة المخيم / المنطقة غير صالحة' },
        { status: 400 }
      )
    }

    const existingBeneficiary = await prisma.beneficiary.findFirst({
      where: {
        phone,
      },
    })

    if (existingBeneficiary) {
      return NextResponse.json(
        { success: false, message: 'رقم الهاتف مسجل مسبقًا' },
        { status: 409 }
      )
    }

    let resolvedCampId: string | null = null

    if (parsedCampName) {
      const existingCamp = await prisma.camps.findFirst({
        where: {
          OR: [
            { name: parsedCampName },
            { area: parsedCampName },
          ],
        },
        select: {
          id: true,
          name: true,
          area: true,
        },
      })

      if (existingCamp) {
        resolvedCampId = existingCamp.id
      }
    }

    const newBeneficiary = await prisma.beneficiary.create({
      data: {
        name: normalizedName,
        phone,
        numberOfFamily: parsedNumberOfFamily,
        campId: resolvedCampId,
      },
      include: {
        camp: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'تمت إضافة المستفيد بنجاح',
        data: newBeneficiary,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/project/admins/adminBeneficiary error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'فشل في إضافة المستفيد',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
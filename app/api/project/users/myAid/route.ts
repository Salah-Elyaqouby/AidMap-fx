import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { maskPhone } from '@/lib/phone-mask'

const NATIONAL_ID_REGEX = /^\d{9}$/
const REPEATED_DIGITS_REGEX = /^(\d)\1+$/

function normalizeStatus(status?: string | null) {
  if (!status) return 'pending'

  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'pending'
    case 'DONE':
      return 'done'
    case 'CANCELED':
      return 'canceled'
    default:
      return status.toLowerCase()
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const nationalId = searchParams.get('nationalId')

    if (!nationalId) {
      return NextResponse.json(
        {
          message: 'رقم الهوية مطلوب',
        },
        { status: 400 }
      )
    }

    if (!/^\d+$/.test(nationalId)) {
      return NextResponse.json(
        {
          message: 'رقم الهوية يجب أن يحتوي على أرقام فقط',
        },
        { status: 400 }
      )
    }

    if (!NATIONAL_ID_REGEX.test(nationalId)) {
      return NextResponse.json(
        {
          message: 'رقم الهوية يجب أن يحتوي على 9 أرقام',
        },
        { status: 400 }
      )
    }

    if (nationalId === '000000000' || REPEATED_DIGITS_REGEX.test(nationalId)) {
      return NextResponse.json(
        {
          message: 'رقم الهوية غير صالح',
        },
        { status: 400 }
      )
    }

    const requestAid = await prisma.requestAid.findFirst({
      where: {
        nationalId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!requestAid) {
      return NextResponse.json(
        {
          found: false,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        found: true,
        referenceCode: requestAid.referenceCode ?? null,
        beneficiaryName: requestAid.fullName,
        nationalId: requestAid.nationalId,
        phone: maskPhone(requestAid.phone),
        aidType: requestAid.aidType,
        numberOfFamily: requestAid.familyCount,
        address: requestAid.address,
        notes: requestAid.notes,
        adminNotes: requestAid.adminNotes,
        status: normalizeStatus(requestAid.status),
        requestNumber: requestAid.id,
        distributionDate: null,
        pickupLocation: null,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/project/users/myAid error:', error)

    return NextResponse.json(
      {
        message: 'حدث خطأ أثناء فحص حالة المساعدة',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
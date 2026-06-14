import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthFromRequest, requireAdminApi } from '@/lib/api/auth'
import { systemLog } from '@/services/system-log'

const aidOptionsMap: Record<string, string[]> = {
  غذائية: ['سلة غذائية', 'طرد غذائي', 'دقيق', 'أرز', 'معلبات'],
  مياه: ['صندوق مياه', 'جالون مياه', 'عبوات مياه'],
  دواء: ['حقيبة إسعافات أولية', 'أدوية مزمنة', 'أدوية أطفال'],
  ملابس: ['ملابس شتوية', 'ملابس أطفال', 'أحذية'],
  'مواد نظافة': ['حقيبة نظافة', 'صابون', 'شامبو', 'مناديل'],
  بطانيات: ['بطانية شتوية', 'فرشة', 'وسادة'],
}

const validStatuses = [
  'Available',
  'Partially Distributed',
  'Fully Distributed',
]

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdminApi(req)
  if (unauthorized) return unauthorized

  try {
    const body = await req.json()

    const aidType = body?.aidType?.trim()
    const aidName = body?.aidName?.trim()
    const notes = body?.notes?.trim() || null
    const donor = body?.donor?.trim() || null
    const status = body?.status?.trim()
    const quantity = Number(body?.quantity)
    const dateReceivedRaw = body?.dateReceived

    if (!aidType) {
      return NextResponse.json(
        { message: 'نوع المساعدة مطلوب' },
        { status: 400 }
      )
    }

    if (!aidOptionsMap[aidType]) {
      return NextResponse.json(
        { message: 'نوع المساعدة غير صالح' },
        { status: 400 }
      )
    }

    if (!aidName) {
      return NextResponse.json(
        { message: 'اسم المساعدة مطلوب' },
        { status: 400 }
      )
    }

    if (!aidOptionsMap[aidType].includes(aidName)) {
      return NextResponse.json(
        { message: 'اسم المساعدة لا يطابق نوع المساعدة المختار' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { message: 'الكمية يجب أن تكون رقمًا أكبر من صفر' },
        { status: 400 }
      )
    }

    if (!dateReceivedRaw) {
      return NextResponse.json(
        { message: 'تاريخ الإضافة أو الاستلام مطلوب' },
        { status: 400 }
      )
    }

    const parsedDate = new Date(dateReceivedRaw)
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { message: 'تاريخ الإضافة أو الاستلام غير صالح' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { message: 'حالة المساعدة مطلوبة' },
        { status: 400 }
      )
    }

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { message: 'حالة المساعدة غير صالحة' },
        { status: 400 }
      )
    }

    const newAid = await prisma.aid.create({
      data: {
        aidType,
        aidName,
        notes,
        quantity,
        dateReceived: parsedDate,
        donor,
        status,
      },
    })

    const auth = await getAuthFromRequest(req)
    if (auth) {
      await systemLog({
        event: 'AID_CREATED',
        userId: auth.userId,
        entityId: newAid.id,
        entityType: 'Aid',
        description: `${aidType} / ${aidName}`,
      })
    }

    return NextResponse.json(
      {
        message: 'تمت إضافة المساعدة بنجاح',
        aid: newAid,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('POST /api/project/aids error:', error)

    return NextResponse.json(
      {
        message: 'حدث خطأ في الخادم',
        error: error?.message || 'Unknown error',
        code: error?.code || null,
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdminApi(req)
  if (unauthorized) return unauthorized

  try {
    const aids = await prisma.aid.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(aids, { status: 200 })
  } catch (error: any) {
    console.error('GET /api/project/aids error:', error)

    return NextResponse.json(
      {
        message: 'فشل في جلب المساعدات',
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
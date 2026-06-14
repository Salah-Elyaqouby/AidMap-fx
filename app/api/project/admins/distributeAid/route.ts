import { NextRequest, NextResponse } from 'next/server'
import { DistributeAidFormStatus } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireStaffApi } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireStaffApi(req)
    if (unauthorized) return unauthorized

    const data = await prisma.distributeAidForm.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        count: data.length,
        data,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'فشل في جلب البيانات',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const unauthorized = await requireStaffApi(req)
    if (unauthorized) return unauthorized

    const body = await req.json()

    const {
      beneficiaryName,
      aidType,
      quantity,
      distributionDate,
      institutionId,
      status,
      notes,
    } = body

    if (!beneficiaryName || !aidType || !quantity || !distributionDate) {
      return NextResponse.json(
        {
          success: false,
          message: 'يرجى تعبئة الحقول المطلوبة',
        },
        { status: 400 }
      )
    }

    const parsedDate = new Date(distributionDate)

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: 'تاريخ غير صالح',
        },
        { status: 400 }
      )
    }

    const newData = await prisma.distributeAidForm.create({
      data: {
        beneficiaryName: String(beneficiaryName).trim(),
        aidType: String(aidType).trim(),
        quantity: Number(quantity),
        distributionDate: parsedDate,
        institutionId: institutionId ? String(institutionId).trim() : null,
        status: status ?? DistributeAidFormStatus.SCHEDULED,
        notes: notes ? String(notes).trim() : null,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'تم تسجيل التوزيع بنجاح',
        data: newData,
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'فشل في حفظ البيانات',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // تحويل البيانات
    const fullName = String(body.fullName || '').trim()
    const nationalId = String(body.nationalId || '').trim()
    const phone = String(body.phone || '').trim()
    const address = String(body.address || '').trim()
    const aidType = String(body.aidType || '').trim()
    const notes = body.notes ? String(body.notes).trim() : null
    const familyCount = parseInt(String(body.familyCount), 10)

    // التحقق من البيانات الأساسية
    if (!fullName || !nationalId || !phone || isNaN(familyCount)) {
      return NextResponse.json(
        { success: false, message: 'تأكد من إدخال جميع الحقول الإجبارية' },
        { status: 400 }
      )
    }

    // التحقق من عدم التكرار (الهوية أو الهاتف)
    const existingRequest = await prisma.requestAid.findFirst({
      where: {
        OR: [{ nationalId: nationalId }, { phone: phone }]
      }
    })

    if (existingRequest) {
      return NextResponse.json(
        { success: false, message: 'هذا الشخص مسجل بالفعل في النظام' },
        { status: 409 }
      )
    }

    // الإضافة الفعلية (مطابقة تماماً للسكيما الخاصة بكِ)
    const newRequest = await prisma.requestAid.create({
      data: {
        fullName,
        nationalId,
        phone,
        aidType,
        familyCount,
        address,
        notes,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'تم إرسال الطلب بنجاح',
      data: newRequest // هنا سيعود الكائن ومعه الـ id التلقائي
    }, { status: 201 })

  } catch (error: any) {
    console.error('SERVER_ERROR:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'حدث خطأ في السيرفر',
      technicalDetails: error.message 
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// ======================================
// GET - جلب أقسام مستشفى معين
// ======================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 👈 التعديل هنا: اسم الفولدر [id]
) {
  try {
    const { id: hospitalId } = await params // 👈 نقوم بفكها كـ id ثم إعادة تسميتها لـ hospitalId لعدم تغيير باقي الاستعلام

    const departments = await prisma.department.findMany({
      where: {
        hospitalId,
      },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const formatted = departments.map((d) => ({
      id: d.id,
      name: d.name,
      deptType: d.deptType,
      status: d.status,
      description: d.description,
      hospitalId: d.hospitalId,
      hospitalName: d.hospital?.name || '',
      createdAt: d.createdAt,
    }))

    return NextResponse.json(formatted)
  } catch (e) {
    console.error('GET /hospitals/[id]/departments error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    )
  }
}

// ======================================
// POST - إضافة قسم جديد لمستشفى معين
// ======================================
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 👈 التعديل هنا: اسم الفولدر [id]
) {
  try {
    const { id: hospitalId } = await params // 👈 فك الـ id الصحيح من المجلد
    const body = await req.json()

    // التحقق من البيانات المطلوبة
    if (!body.name?.trim() || !body.deptType?.trim()) {
      return NextResponse.json(
        { error: 'name and deptType are required' },
        { status: 400 }
      )
    }

    // التحقق من وجود المستشفى
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
    })

    if (!hospital) {
      return NextResponse.json(
        { error: 'Hospital not found' },
        { status: 404 }
      )
    }

    // إنشاء القسم
    const department = await prisma.department.create({
      data: {
        name: body.name.trim(),
        deptType: body.deptType.trim(),
        status: body.status?.trim() || 'يعمل بكفاءة',
        description: body.description?.trim() || null,
        hospitalId,
      },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        id: department.id,
        name: department.name,
        deptType: department.deptType,
        status: department.status,
        description: department.description,
        hospitalId: department.hospitalId,
        hospitalName: department.hospital?.name || '',
        createdAt: department.createdAt,
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('POST /hospitals/[id]/departments error:', e)
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    )
  }
}

// ======================================
// PATCH - تعديل قسم معين داخل مستشفى
// ======================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 👈 التعديل هنا: اسم الفولدر [id]
) {
  try {
    // في الـ PATCH نتحقق أيضاً من صحة معرّف المسار حتى لو كنا نعتمد على الـ id في الـ body
    const { id: hospitalId } = await params 
    const body = await req.json()
    const { id, name, deptType, status, description } = body

    // التحقق من إرسال المعرف (ID) الخاص بالقسم المراد تعديله
    if (!id) {
      return NextResponse.json(
        { error: 'Department ID is required for updating' },
        { status: 400 }
      )
    }

    // تحديث البيانات في قاعدة البيانات باستخدام Prisma
    const updatedDepartment = await prisma.department.update({
      where: {
        id: id, // معرف القسم المراد تعديله
      },
      data: {
        name: name ? name.trim() : undefined,
        deptType: deptType ? deptType.trim() : undefined,
        status: status ? status.trim() : undefined,
        description: description !== undefined ? description?.trim() : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Department updated successfully',
      department: updatedDepartment,
    })
  } catch (e) {
    console.error('PATCH /hospitals/[id]/departments error:', e)
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    )
  }
}
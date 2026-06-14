import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// ======================================
// GET - جلب الأقسام الخاصة بمستشفى معين
// ======================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const departments = await prisma.department.findMany({
      where: { hospitalId: id },
      include: { hospital: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
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
    console.error('GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }
}

// ======================================
// POST - إضافة قسم جديد
// ======================================
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    if (!body.name?.trim() || !body.deptType?.trim()) {
      return NextResponse.json({ error: 'name and deptType are required' }, { status: 400 })
    }

    const department = await prisma.department.create({
      data: {
        name: body.name.trim(),
        deptType: body.deptType.trim(),
        status: body.status || 'يعمل بكفاءة',
        description: body.description?.trim() || null,
        hospitalId: id,
      },
    })

    return NextResponse.json(department, { status: 201 })
  } catch (e) {
    console.error('POST error:', e)
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
  }
}

// ======================================
// PATCH - تعديل بيانات القسم
// ======================================
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id, name, deptType, status, description } = body; // الحقول القادمة من الجدول

    const updatedDepartment = await prisma.department.update({
      where: { id: id },
      data: {
        name,
        deptType,
        status,
        description
      },
    });

    return NextResponse.json(updatedDepartment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "فشل تحديث القسم" }, { status: 500 });
  }
}
// ======================================
// DELETE - حذف قسم نهائياً من قاعدة البيانات
// ======================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const deptId = searchParams.get('id') // جلب الـ id من الـ URL Query

    if (!deptId) {
      return NextResponse.json({ error: 'Department ID is required for deletion' }, { status: 400 })
    }

    await prisma.department.delete({
      where: { id: deptId },
    })

    return NextResponse.json({ success: true, message: 'Department deleted successfully' })
  } catch (e) {
    console.error('DELETE error:', e)
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 })
  }
}
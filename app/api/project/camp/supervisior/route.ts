import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

function toDbStatus(status: 'نشط' | 'موقوف') {
  return status === 'نشط' ? 'ACTIVE' : 'INACTIVE'
}

function toUiSupervisor(supervisor: {
  id: string
  name: string
  phone: string | null
  status: string
}) {
  return {
    id: supervisor.id,
    nameAr: supervisor.name,
    phone: supervisor.phone ?? '',
    status: supervisor.status === 'ACTIVE' ? 'نشط' : 'موقوف',
  }
}

const createSchema = z.object({
  nameAr: z.string().trim().min(1, 'اسم المشرف مطلوب'),
  phone: z.string().trim().min(1, 'رقم الجوال مطلوب'),
  status: z.enum(['نشط', 'موقوف']).default('نشط'),
})

const updateSchema = z.object({
  nameAr: z.string().trim().min(1, 'اسم المشرف مطلوب').optional(),
  phone: z.string().trim().min(1, 'رقم الجوال مطلوب').optional(),
  status: z.enum(['نشط', 'موقوف']).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status')

    const where: any = {
      isTrashed: false,
    }

    if (status === 'active') {
      where.status = 'ACTIVE'
    } else if (status === 'blocked') {
      where.status = 'INACTIVE'
    }

    const supervisors = await prisma.supervisor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
      },
    })

    return NextResponse.json(supervisors.map(toUiSupervisor))
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'خطأ في الخادم' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = createSchema.parse(await req.json())

    const exists = await prisma.supervisor.findFirst({
      where: {
        name: body.nameAr,
        isTrashed: false,
      },
      select: { id: true },
    })

    if (exists) {
      return NextResponse.json(
        { message: 'المشرف موجود بالفعل (اسم مكرر).' },
        { status: 409 }
      )
    }

    const phoneDuplicate = await prisma.supervisor.findFirst({
      where: {
        phone: body.phone,
        isTrashed: false,
      },
      select: { id: true },
    })

    if (phoneDuplicate) {
      return NextResponse.json(
        { message: 'رقم الهاتف مستخدم من قبل', fieldErrors: { phone: 'رقم الهاتف مكرر' } },
        { status: 409 }
      )
    }

    const created = await prisma.supervisor.create({
      data: {
        name: body.nameAr,
        phone: body.phone,
        status: toDbStatus(body.status) as any,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
      },
    })

    return NextResponse.json(toUiSupervisor(created), { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'فشل التحقق من صحة البيانات', issues: e.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'خطأ في الخادم' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ message: 'معرّف المشرف مفقود' }, { status: 400 })
  }

  try {
    const body = updateSchema.parse(await req.json())

    if (body.nameAr) {
      const exists = await prisma.supervisor.findFirst({
        where: {
          name: body.nameAr,
          isTrashed: false,
          NOT: { id },
        },
        select: { id: true },
      })

      if (exists) {
        return NextResponse.json(
          { message: 'المشرف موجود بالفعل (اسم مكرر).' },
          { status: 409 }
        )
      }
    }

    if (body.phone) {
      const phoneAlreadyUsed = await prisma.supervisor.findFirst({
        where: {
          phone: body.phone,
          NOT: { id },
          isTrashed: false,
        },
        select: { id: true },
      })

      if (phoneAlreadyUsed) {
        return NextResponse.json(
          { message: 'رقم الهاتف مستخدم من قبل', fieldErrors: { phone: 'رقم الهاتف مكرر' } },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.supervisor.update({
      where: { id },
      data: {
        name: body.nameAr,
        phone: body.phone,
        status: body.status ? (toDbStatus(body.status) as any) : undefined,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
      },
    })

    return NextResponse.json(toUiSupervisor(updated))
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'فشل التحقق من صحة البيانات', issues: e.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'خطأ في الخادم' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const all = req.nextUrl.searchParams.get('all')

  try {
    if (all === 'true') {
      await prisma.supervisor.updateMany({
        where: {
          isTrashed: false,
        },
        data: {
          isTrashed: true,
        },
      })

      return NextResponse.json({ ok: true })
    }

    if (!id) {
      return NextResponse.json({ message: 'معرّف المشرف مفقود' }, { status: 400 })
    }

    await prisma.supervisor.update({
      where: { id },
      data: {
        isTrashed: true,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'خطأ في الخادم' },
      { status: 500 }
    )
  }
}
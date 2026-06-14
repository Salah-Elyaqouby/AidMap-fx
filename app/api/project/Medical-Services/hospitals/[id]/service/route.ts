import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET - جلب جميع الخدمات لمستشفى معين
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const services = await prisma.service.findMany({
      where: {
        department: {
          hospitalId: id,
        },
      },
      include: {
        department: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = services.map(s => ({
      id: s.id,
      name: s.name,
      price: s.price,
      isAvailable: s.isAvailable,
      departmentId: s.departmentId,
      departmentName: s.department.name,
    }))

    return NextResponse.json(formatted)
  } catch (e) {
    console.error('GET services error:', e)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

// POST - إضافة خدمة جديدة
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    if (!body.name?.trim() || !body.departmentId || body.price === undefined) {
      return NextResponse.json(
        { error: 'name, departmentId, and price are required' },
        { status: 400 }
      )
    }

    const department = await prisma.department.findFirst({
      where: {
        id: body.departmentId,
        hospitalId: id,
      },
    })

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found or does not belong to this hospital' },
        { status: 404 }
      )
    }

    const service = await prisma.service.create({
      data: {
        name: body.name.trim(),
        price: Number(body.price),
        isAvailable: body.isAvailable ?? true,
        departmentId: body.departmentId,
      },
      include: {
        department: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({
      id: service.id,
      name: service.name,
      price: service.price,
      isAvailable: service.isAvailable,
      departmentId: service.departmentId,
      departmentName: service.department.name,
    }, { status: 201 })

  } catch (e) {
    console.error('POST service error:', e)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 400 })
  }
}

// PATCH - تعديل خدمة
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    if (!body.id) {
      return NextResponse.json({ error: 'service id is required' }, { status: 400 })
    }

    const existingService = await prisma.service.findFirst({
      where: {
        id: body.id,
        department: {
          hospitalId: id,
        },
      },
    })

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.service.update({
      where: { id: body.id },
      data: {
        name: body.name?.trim(),
        price: body.price !== undefined ? Number(body.price) : undefined,
        isAvailable: body.isAvailable,
        departmentId: body.departmentId,
      },
      include: {
        department: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      price: updated.price,
      isAvailable: updated.isAvailable,
      departmentId: updated.departmentId,
      departmentName: updated.department.name,
    })

  } catch (e) {
    console.error('PATCH service error:', e)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 400 })
  }
}
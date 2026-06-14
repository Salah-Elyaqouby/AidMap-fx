import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const doctors = await prisma.doctor.findMany({
      where: { hospitalId: id },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(doctors)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();

    const doctor = await prisma.doctor.create({
      data: {
        name: body.name.trim(),
        specialty: body.specialty,
        phone: body.phone,
        workSchedule: body.workSchedule,
        hospitalId: id,
        departmentId: body.departmentId || null,
      },
    });
    return NextResponse.json(doctor, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;

  try {
    const body = await req.json()

    if (!body.id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const updated = await prisma.doctor.update({
      where: { id: body.id },
      data: {
        name: body.name?.trim(),
        specialty: body.specialty,
        phone: body.phone,
        workSchedule: body.workSchedule,
        description: body.description || null,
        departmentId: body.departmentId || null,
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('PATCH error:', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 400 })
  }
}
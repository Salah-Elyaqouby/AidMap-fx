import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const departmentId = searchParams.get('departmentId')

  if (!departmentId) {
    return NextResponse.json({ error: 'departmentId required' }, { status: 400 })
  }

  try {
    // Get department to find hospitalId
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { hospitalId: true },
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    const [services, doctors] = await Promise.all([
      prisma.service.findMany({
        where: { departmentId },
        select: { id: true, name: true, price: true, isAvailable: true },
        orderBy: { name: 'asc' },
      }),
      // Return doctors assigned to this department OR doctors of the hospital with no department
      prisma.doctor.findMany({
        where: {
          hospitalId: department.hospitalId,
          OR: [
            { departmentId },
            { departmentId: null },
          ],
        },
        select: { id: true, name: true, specialty: true, workSchedule: true, phone: true },
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({ services, doctors })
  } catch (e) {
    console.error('department-detail error:', e)
    return NextResponse.json({ error: 'Failed to fetch department detail' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hospitalId = searchParams.get('hospitalId')

  if (!hospitalId) {
    return NextResponse.json({ error: 'hospitalId required' }, { status: 400 })
  }

  try {
    const departments = await prisma.department.findMany({
      where: { hospitalId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(departments)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }
}

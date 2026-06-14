import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const VALID_REGIONS = ['NORTH', 'SOUTH', 'EAST', 'WEST'] as const

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const region = searchParams.get('region')

  try {
    const hospitals = await prisma.hospital.findMany({
      where: region && VALID_REGIONS.includes(region as any) ? { region: region as any } : undefined,
      select: { id: true, name: true, region: true, phone: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(hospitals)
  } catch (e) {
    console.error('GET /query/hospitals error:', e)
    return NextResponse.json({ error: 'Failed to fetch hospitals' }, { status: 500 })
  }
}

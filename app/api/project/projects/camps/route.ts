import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma' 

// 1. جلب كافة المخيمات (GET)
export async function GET() {
  try {
    const camps = await prisma.camps.findMany({
      where: { isTrashed: false },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(camps)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch camps' }, { status: 500 })
  }
}

// 2. إضافة مخيم جديد (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const newCamp = await prisma.camps.create({
      data: {
        name: body.name,                 // موحد
        area: body.area,                 // موحد
        subArea: body.subArea,           // موحد
        capacity: Number(body.capacity) || 0,
        currentFamiliesCount: Number(body.currentFamiliesCount) || 0,
        status: Number(body.currentFamiliesCount) >= Number(body.capacity) ? 'FULL' : 'NOT_FULL'
      }
    })
    
    return NextResponse.json(newCamp)
  } catch (error) {
    console.error("POST Error:", error)
    return NextResponse.json({ error: 'Failed to create camp' }, { status: 500 })
  }
}

// 3. تحديث مخيم (PATCH)
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await req.json()
    
    const updatedCamp = await prisma.camps.update({
      where: { id },
      data: {
        name: body.name,                 // موحد
        area: body.area,                 // موحد
        subArea: body.subArea,           // موحد
        capacity: Number(body.capacity),
        currentFamiliesCount: Number(body.currentFamiliesCount),
        status: Number(body.currentFamiliesCount) >= Number(body.capacity) ? 'FULL' : 'NOT_FULL'
      }
    })
    
    return NextResponse.json(updatedCamp)
  } catch (error) {
    console.error("PATCH Error:", error)
    return NextResponse.json({ error: 'Failed to update camp' }, { status: 500 })
  }
}

// 4. حذف مخيم (DELETE)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await prisma.camps.update({
      where: { id },
      data: { isTrashed: true }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete camp' }, { status: 500 })
  }
}
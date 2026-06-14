import { NextRequest, NextResponse } from 'next/server'
import { PlaceType, PlaceStatus } from '@prisma/client'
import { randomUUID } from 'crypto'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const places = await prisma.place.findMany({
      where: { type: PlaceType.FOOD_SUPPORT_CENTER, isTrashed: false },
      orderBy: { createdAt: 'desc' },
    })

    const data = places.map(p => ({
      id: p.id,
      name: p.name,
      lat: p.latitude,
      lng: p.longitude,
      operator: p.operator ?? '',
      statusText: p.statusText ?? '',
      capacity: p.capacity ?? 0,
      occupancy: p.occupancy ?? 0,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET food error:', error)
    return NextResponse.json({ success: false, message: 'فشل في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, lat, lng, operator, statusText, capacity, occupancy } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, message: 'اسم النقطة مطلوب' }, { status: 400 })
    }

    const latitude = lat !== undefined && lat !== '' ? Number(lat) : 0
    const longitude = lng !== undefined && lng !== '' ? Number(lng) : 0

    const place = await prisma.place.create({
      data: {
        id: randomUUID(),
        name: name.trim(),
        type: PlaceType.FOOD_SUPPORT_CENTER,
        latitude,
        longitude,
        operator: operator ? String(operator).trim() : null,
        statusText: statusText ? String(statusText).trim() : null,
        capacity: capacity ? Number(capacity) : 0,
        occupancy: occupancy ? Number(occupancy) : 0,
        status: PlaceStatus.AVAILABLE,
        isActive: true,
        isTrashed: false,
      },
    })

    return NextResponse.json({ success: true, data: {
      id: place.id,
      name: place.name,
      lat: place.latitude,
      lng: place.longitude,
      operator: place.operator ?? '',
      statusText: place.statusText ?? '',
      capacity: place.capacity ?? 0,
      occupancy: place.occupancy ?? 0,
    }}, { status: 201 })
  } catch (error) {
    console.error('POST food error:', error)
    return NextResponse.json({ success: false, message: 'خطأ في السيرفر' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, message: 'معرّف مطلوب' }, { status: 400 })

    const body = await req.json()
    const { name, lat, lng, operator, statusText, capacity, occupancy } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = String(name).trim()
    if (lat !== undefined) updateData.latitude = Number(lat)
    if (lng !== undefined) updateData.longitude = Number(lng)
    if (operator !== undefined) updateData.operator = operator ? String(operator).trim() : null
    if (statusText !== undefined) updateData.statusText = statusText ? String(statusText).trim() : null
    if (capacity !== undefined) updateData.capacity = Number(capacity)
    if (occupancy !== undefined) updateData.occupancy = Number(occupancy)

    const place = await prisma.place.update({ where: { id }, data: updateData })

    return NextResponse.json({ success: true, data: {
      id: place.id,
      name: place.name,
      lat: place.latitude,
      lng: place.longitude,
      operator: place.operator ?? '',
      statusText: place.statusText ?? '',
      capacity: place.capacity ?? 0,
      occupancy: place.occupancy ?? 0,
    }})
  } catch (error) {
    console.error('PATCH food error:', error)
    return NextResponse.json({ success: false, message: 'خطأ في التعديل' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, message: 'معرّف مطلوب' }, { status: 400 })

    await prisma.place.update({ where: { id }, data: { isTrashed: true } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE food error:', error)
    return NextResponse.json({ success: false, message: 'خطأ في الحذف' }, { status: 500 })
  }
}

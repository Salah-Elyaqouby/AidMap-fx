import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      where: { isTrashed: false },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ schools })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.name) return NextResponse.json({ error: 'اسم المدرسة مطلوب' }, { status: 400 })
    const school = await prisma.school.create({
      data: {
        id: randomUUID(),
        name: body.name,
        location: body.location || null,
        region: body.region || null,
        level: body.level || null,
        studyDays: body.studyDays || null,
        timing: body.timing || null,
        fees: body.fees ? parseFloat(body.fees) : 0,
        schoolType: body.schoolType || null,
        gender: body.gender || null,
        totalCount: body.totalCount ? parseInt(body.totalCount) : 0,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
      },
    })
    return NextResponse.json(school, { status: 201 })
  } catch (e: any) {
    console.error('POST /schools error:', e)
    return NextResponse.json({ error: 'فشل إضافة المدرسة' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const body = await req.json()
    if (!id) return NextResponse.json({ error: 'ID مفقود' }, { status: 400 })
    const updated = await prisma.school.update({
      where: { id },
      data: {
        name: body.name,
        location: body.location || null,
        region: body.region || null,
        level: body.level || null,
        studyDays: body.studyDays || null,
        timing: body.timing || null,
        fees: body.fees ? parseFloat(body.fees) : 0,
        schoolType: body.schoolType || null,
        gender: body.gender || null,
        totalCount: body.totalCount ? parseInt(body.totalCount) : 0,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
      },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('PATCH /schools error:', e)
    return NextResponse.json({ error: 'فشل تعديل المدرسة' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID مفقود' }, { status: 400 })
    await prisma.school.update({ where: { id }, data: { isTrashed: true } })
    return NextResponse.json({ message: 'تم الحذف' })
  } catch (e) {
    return NextResponse.json({ error: 'فشل الحذف' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { PlaceType, PlaceStatus, Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAdminApi } from '@/lib/api/auth'

// --- أنواع البيانات والمساعدات ---
type FrontPlaceType = 'shelter' | 'hospital' | 'water' | 'food'

type CreatePlaceBody = {
  name?: unknown
  type?: unknown
  latitude?: unknown
  longitude?: unknown
  description?: unknown
  operator?: unknown
  capacity?: unknown
  occupancy?: unknown
  availableBeds?: unknown
  statusText?: unknown
}

const ARABIC_NAME_REGEX = /^[\u0600-\u06FF\s]+$/
const NAME_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 500
const STATUS_TEXT_MAX_LENGTH = 300
const OPERATOR_MAX_LENGTH = 100
const MAX_COUNT_VALUE = 1000000

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function isValidFrontPlaceType(value: unknown): value is FrontPlaceType {
  return ['shelter', 'hospital', 'water', 'food'].includes(value as string)
}

function mapFrontTypeToPrismaType(type: FrontPlaceType): PlaceType {
  const mapping: Record<FrontPlaceType, PlaceType> = {
    shelter: PlaceType.SHELTER,
    hospital: PlaceType.MEDICAL,
    water: PlaceType.WATER_POINT,
    food: PlaceType.FOOD_SUPPORT_CENTER,
  }
  return mapping[type]
}

function mapStatusTextToPrismaStatus(statusText: string | null): PlaceStatus {
  if (!statusText) return PlaceStatus.AVAILABLE
  const value = statusText.toLowerCase()
  if (value.includes('مغلق') || value.includes('closed') || value.includes('غير متاح')) return PlaceStatus.UNAVAILABLE
  if (value.includes('ممتلئ') || value.includes('full') || value.includes('مزدحم')) return PlaceStatus.FULL
  return PlaceStatus.AVAILABLE
}

function parseOptionalText(value: unknown, maxLength: number): string | null | 'INVALID' {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return 'INVALID'
  const normalized = normalizeSpaces(value)
  if (!normalized) return null
  if (normalized.length > maxLength) return 'INVALID'
  return normalized
}

function parseOptionalInteger(value: unknown): number | null | 'INVALID' {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  if (!Number.isInteger(num) || num < 0 || num > MAX_COUNT_VALUE) return 'INVALID'
  return num
}

// --- GET Method (متاحة للجميع) ---
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const typeParam = searchParams.get('type')

    const allPlaces: Array<{
      id: string; name: string; type: string
      lat: number; lng: number; operator: string
      capacity: number; occupancy: number; availableBeds: number; statusText: string
    }> = []

    // 1. Place table
    if (!typeParam || typeParam === 'shelter' || typeParam === 'hospital' || typeParam === 'water' || typeParam === 'food') {
      const where: Prisma.PlaceWhereInput = { isActive: true, isTrashed: false }
      if (typeParam && isValidFrontPlaceType(typeParam)) {
        where.type = mapFrontTypeToPrismaType(typeParam)
      }
      const places = await prisma.place.findMany({ where, orderBy: { createdAt: 'desc' } })
      for (const p of places) {
        const lat = Number(p.latitude)
        const lng = Number(p.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) continue
        allPlaces.push({
          id: p.id,
          name: p.name,
          type: p.type === PlaceType.SHELTER ? 'shelter' : p.type === PlaceType.MEDICAL ? 'hospital' : p.type === PlaceType.WATER_POINT ? 'water' : 'food',
          lat, lng,
          operator: p.operator ?? '',
          capacity: p.capacity ?? 0,
          occupancy: p.occupancy ?? 0,
          availableBeds: p.availableBeds ?? 0,
          statusText: p.statusText ?? '',
        })
      }
    }

    // 2. Hospitals table (has direct lat/lng)
    if (!typeParam || typeParam === 'hospital') {
      const hospitals = await prisma.hospital.findMany({
        select: { id: true, name: true, latitude: true, longitude: true, phone: true, type: true },
      })
      for (const h of hospitals) {
        const lat = Number(h.latitude)
        const lng = Number(h.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) continue
        // avoid duplicates if already linked via placeId
        if (allPlaces.some(p => p.id === h.id)) continue
        allPlaces.push({
          id: `hospital-${h.id}`,
          name: h.name,
          type: 'hospital',
          lat, lng,
          operator: h.phone ?? '',
          capacity: 0, occupancy: 0, availableBeds: 0,
          statusText: 'مستشفى',
        })
      }
    }

    // 3. Camps table (has direct lat/lng)
    if (!typeParam || typeParam === 'shelter') {
      const camps = await prisma.camps.findMany({
        where: { isTrashed: false },
        select: { id: true, name: true, latitude: true, longitude: true, capacity: true, currentFamiliesCount: true, status: true, area: true },
      })
      for (const c of camps) {
        const lat = Number(c.latitude)
        const lng = Number(c.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) continue
        if (allPlaces.some(p => p.id === `camp-${c.id}`)) continue
        const available = Math.max((c.capacity ?? 0) - (c.currentFamiliesCount ?? 0), 0)
        allPlaces.push({
          id: `camp-${c.id}`,
          name: c.name,
          type: 'shelter',
          lat, lng,
          operator: c.area ?? '',
          capacity: c.capacity ?? 0,
          occupancy: c.currentFamiliesCount ?? 0,
          availableBeds: available,
          statusText: c.status === 'FULL' ? 'ممتلئ' : c.status === 'ALMOST_FULL' ? 'شبه ممتلئ' : 'متاح',
        })
      }
    }

    // 4. Schools table (has lat/lng)
    if (!typeParam || typeParam === 'school' as any) {
      const schools = await prisma.school.findMany({
        where: { isTrashed: false },
        select: { id: true, name: true, latitude: true, longitude: true, level: true, schoolType: true, totalCount: true, region: true },
      })
      for (const s of schools) {
        const lat = Number(s.latitude)
        const lng = Number(s.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) continue
        allPlaces.push({
          id: `school-${s.id}`,
          name: s.name,
          type: 'school' as any,
          lat, lng,
          operator: s.schoolType ?? '',
          capacity: s.totalCount ?? 0,
          occupancy: 0,
          availableBeds: 0,
          statusText: [s.level, s.region].filter(Boolean).join(' • '),
        })
      }
    }

    return NextResponse.json({ success: true, count: allPlaces.length, data: allPlaces })
  } catch (error) {
    console.error('GET Error:', error)
    return NextResponse.json({ success: false, message: 'فشل في جلب البيانات' }, { status: 500 })
  }
}

// --- POST Method (مسؤولون فقط) ---
export async function POST(req: NextRequest) {
  try {
    const unauthorized = await requireAdminApi(req)
    if (unauthorized) return unauthorized

    const body = (await req.json()) as CreatePlaceBody
    const { name, type, latitude, longitude, description, operator, capacity, occupancy, availableBeds, statusText } = body

    if (typeof name !== 'string' || !normalizeSpaces(name)) {
      return NextResponse.json({ success: false, message: 'اسم المكان مطلوب' }, { status: 400 })
    }

    const normalizedName = normalizeSpaces(name)
    if (!ARABIC_NAME_REGEX.test(normalizedName)) {
      return NextResponse.json({ success: false, message: 'الاسم يجب أن يكون بالعربية' }, { status: 400 })
    }

    if (!isValidFrontPlaceType(type)) {
      return NextResponse.json({ success: false, message: 'نوع المكان غير صالح' }, { status: 400 })
    }

    const lat = Number(latitude)
    const lng = Number(longitude)
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ success: false, message: 'إحداثيات غير صحيحة' }, { status: 400 })
    }

    const parsedDesc = parseOptionalText(description, DESCRIPTION_MAX_LENGTH)
    const parsedOp = parseOptionalText(operator, OPERATOR_MAX_LENGTH)
    const parsedStat = parseOptionalText(statusText, STATUS_TEXT_MAX_LENGTH)
    const cap = parseOptionalInteger(capacity)
    const occ = parseOptionalInteger(occupancy)
    const avail = parseOptionalInteger(availableBeds)

    const newPlace = await prisma.place.create({
      data: {
        name: normalizedName,
        type: mapFrontTypeToPrismaType(type),
        latitude: lat,
        longitude: lng,
        description: parsedDesc === 'INVALID' ? null : parsedDesc,
        operator: parsedOp === 'INVALID' ? null : parsedOp,
        capacity: type === 'shelter' ? (cap === 'INVALID' ? 0 : (cap ?? 0)) : 0,
        occupancy: type === 'shelter' ? (occ === 'INVALID' ? 0 : (occ ?? 0)) : 0,
        availableBeds: type === 'shelter' ? (avail === 'INVALID' ? 0 : (avail ?? 0)) : 0,
        statusText: parsedStat === 'INVALID' ? null : parsedStat,
        status: mapStatusTextToPrismaStatus(parsedStat === 'INVALID' ? null : parsedStat),
        isActive: true,
        isTrashed: false,
      },
    })

    return NextResponse.json({ success: true, message: 'تم الحفظ بنجاح', data: newPlace }, { status: 201 })
  } catch (error) {
    console.error('POST Error:', error)
    return NextResponse.json({ success: false, message: 'خطأ في السيرفر' }, { status: 500 })
  }
}
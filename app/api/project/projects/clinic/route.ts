import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'

type UiClinicStatus = 'مفتوحة' | 'مغلقة'
type DbClinicStatus = 'OPEN' | 'CLOSED'

type FieldErrors = Partial<Record<'nameAr' | 'specialtyAr' | 'capacityPerDay' | 'status' | 'placeId', string>>

function toDbStatus(status: UiClinicStatus): DbClinicStatus {
  return status === 'مفتوحة' ? 'OPEN' : 'CLOSED'
}

function toUiStatus(status: string): UiClinicStatus {
  return status === 'OPEN' ? 'مفتوحة' : 'مغلقة'
}

function mapZodIssuesToFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {}

  for (const issue of error.issues) {
    const fieldName = issue.path[0]
    if (typeof fieldName === 'string' && !(fieldName in fieldErrors)) {
      fieldErrors[fieldName as keyof FieldErrors] = issue.message
    }
  }

  return fieldErrors
}

const createSchema = z.object({
  nameAr: z.string().trim().min(1, 'اسم العيادة مطلوب'),
  specialtyAr: z.string().trim().min(1, 'التخصص مطلوب'),
  capacityPerDay: z.coerce.number().int().positive('يجب أن تكون السعة اليومية أكبر من 0'),
  status: z.enum(['مفتوحة', 'مغلقة']).default('مفتوحة'),
  institutionId: z.string().uuid().optional().nullable(),
  placeId: z.string().uuid().optional().nullable(),
})

const updateSchema = z.object({
  nameAr: z.string().trim().min(1, 'اسم العيادة مطلوب').optional(),
  specialtyAr: z.string().trim().min(1, 'التخصص مطلوب').optional(),
  capacityPerDay: z.coerce.number().int().positive('يجب أن تكون السعة اليومية أكبر من 0').optional(),
  status: z.enum(['مفتوحة', 'مغلقة']).optional(),
  institutionId: z.string().uuid().optional().nullable(),
  placeId: z.string().uuid().optional().nullable(),
})

function normalizeClinic(clinic: {
  id: string
  name: string
  specialty: string | null
  capacityPerDay: number
  status: string
  institutionId?: string | null
  placeId?: string | null
  institution?: unknown
  place?: unknown
}) {
  return {
    id: clinic.id,
    nameAr: clinic.name,
    specialtyAr: clinic.specialty ?? '',
    capacityPerDay: clinic.capacityPerDay,
    status: toUiStatus(clinic.status),
    institutionId: clinic.institutionId ?? null,
    placeId: clinic.placeId ?? null,
    institution: clinic.institution ?? null,
    place: clinic.place ?? null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim() || ''
    const status = req.nextUrl.searchParams.get('status')?.trim() || ''
    const institutionId = req.nextUrl.searchParams.get('institutionId')?.trim() || ''
    const placeId = req.nextUrl.searchParams.get('placeId')?.trim() || ''

    const clinics = await prisma.clinic.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { specialty: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {},
          status === 'مفتوحة'
            ? { status: 'OPEN' }
            : status === 'مغلقة'
              ? { status: 'CLOSED' }
              : {},
          institutionId ? { institutionId } : {},
          placeId ? { placeId } : {},
        ],
      },
      orderBy: { name: 'asc' },
      include: {
        institution: true,
        place: true,
      },
    })

    return NextResponse.json(clinics.map(normalizeClinic))
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

    const exists = await prisma.clinic.findFirst({
      where: {
        AND: [
          {
            name: {
              equals: body.nameAr,
              mode: 'insensitive',
            },
          },
          {
            specialty: {
              equals: body.specialtyAr,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: { id: true },
    })

    if (exists) {
      return NextResponse.json(
        {
          message: 'البيانات مكررة',
          fieldErrors: {
            nameAr: 'البيانات مكررة',
            specialtyAr: 'البيانات مكررة',
          },
        },
        { status: 409 }
      )
    }

    if (body.placeId) {
      const placeAlreadyUsed = await prisma.clinic.findFirst({
        where: {
          placeId: body.placeId,
        },
        select: { id: true },
      })

      if (placeAlreadyUsed) {
        return NextResponse.json(
          {
            message: 'هذا المكان مرتبط بالفعل بعيادة أخرى.',
            fieldErrors: {
              placeId: 'هذا المكان مرتبط بالفعل بعيادة أخرى.',
            },
          },
          { status: 409 }
        )
      }
    }

    const created = await prisma.clinic.create({
      data: {
        name: body.nameAr,
        specialty: body.specialtyAr || null,
        capacityPerDay: body.capacityPerDay,
        status: toDbStatus(body.status),
        institutionId: body.institutionId || null,
        placeId: body.placeId || null,
      },
      include: {
        institution: true,
        place: true,
      },
    })

    return NextResponse.json(normalizeClinic(created), { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: 'فشل التحقق من صحة البيانات',
          fieldErrors: mapZodIssuesToFieldErrors(e),
          issues: e.issues,
        },
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
    return NextResponse.json(
      { message: 'معرّف العيادة مفقود' },
      { status: 400 }
    )
  }

  try {
    const body = updateSchema.parse(await req.json())

    const currentClinic = await prisma.clinic.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        specialty: true,
      },
    })

    if (!currentClinic) {
      return NextResponse.json(
        { message: 'العيادة غير موجودة' },
        { status: 404 }
      )
    }

    if (body.nameAr !== undefined || body.specialtyAr !== undefined) {
      const nextName = body.nameAr ?? currentClinic.name
      const nextSpecialty = body.specialtyAr ?? currentClinic.specialty ?? ''

      const exists = await prisma.clinic.findFirst({
        where: {
          NOT: { id },
          AND: [
            {
              name: {
                equals: nextName,
                mode: 'insensitive',
              },
            },
            {
              specialty: {
                equals: nextSpecialty,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: { id: true },
      })

      if (exists) {
        return NextResponse.json(
          {
            message: 'البيانات مكررة',
            fieldErrors: {
              nameAr: 'البيانات مكررة',
              specialtyAr: 'البيانات مكررة',
            },
          },
          { status: 409 }
        )
      }
    }

    if (body.placeId) {
      const placeAlreadyUsed = await prisma.clinic.findFirst({
        where: {
          placeId: body.placeId,
          NOT: { id },
        },
        select: { id: true },
      })

      if (placeAlreadyUsed) {
        return NextResponse.json(
          {
            message: 'هذا المكان مرتبط بالفعل بعيادة أخرى.',
            fieldErrors: {
              placeId: 'هذا المكان مرتبط بالفعل بعيادة أخرى.',
            },
          },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.clinic.update({
      where: { id },
      data: {
        name: body.nameAr,
        specialty: body.specialtyAr !== undefined ? body.specialtyAr || null : undefined,
        capacityPerDay: body.capacityPerDay,
        status: body.status ? toDbStatus(body.status) : undefined,
        institutionId: body.institutionId !== undefined ? body.institutionId || null : undefined,
        placeId: body.placeId !== undefined ? body.placeId || null : undefined,
      },
      include: {
        institution: true,
        place: true,
      },
    })

    return NextResponse.json(normalizeClinic(updated))
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: 'فشل التحقق من صحة البيانات',
          fieldErrors: mapZodIssuesToFieldErrors(e),
          issues: e.issues,
        },
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
      await prisma.clinic.deleteMany()
      return NextResponse.json({ ok: true })
    }

    if (!id) {
      return NextResponse.json(
        { message: 'معرّف العيادة مفقود' },
        { status: 400 }
      )
    }

    const currentClinic = await prisma.clinic.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!currentClinic) {
      return NextResponse.json(
        { message: 'العيادة غير موجودة' },
        { status: 404 }
      )
    }

    await prisma.clinic.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'خطأ في الخادم' },
      { status: 500 }
    )
  }
}
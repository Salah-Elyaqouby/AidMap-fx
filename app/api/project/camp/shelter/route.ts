import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { requireStaffApi } from '@/lib/api/auth'

type UiFillStatus = 'ممتلئ' | 'غير ممتلئ'
type DbFillStatus = 'FULL' | 'NOT_FULL'

type FieldErrors = Partial<
  Record<
    | 'nameAr'
    | 'areaAr'
    | 'supervisorAr'
    | 'phone'
    | 'capacity'
    | 'familiesCount'
    | 'fillStatus'
    | 'placeId',
    string
  >
>

function toDbFillStatus(status: UiFillStatus): DbFillStatus {
  return status === 'ممتلئ' ? 'FULL' : 'NOT_FULL'
}

function toUiFillStatus(status: DbFillStatus): UiFillStatus {
  return status === 'FULL' ? 'ممتلئ' : 'غير ممتلئ'
}

function inferFillStatus(familiesCount: number, capacity: number): DbFillStatus {
  return familiesCount >= capacity ? 'FULL' : 'NOT_FULL'
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

function hasEdgeSpaces(value: string) {
  return value !== value.trim()
}

function normalizeArabicText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function validateNoEdgeSpaces(fieldLabel: string) {
  return z
    .string()
    .min(1, `${fieldLabel} مطلوب`)
    .refine((val) => !hasEdgeSpaces(val), {
      message: `${fieldLabel} لا يجب أن يبدأ أو ينتهي بمسافة`,
    })
    .transform((val) => normalizeArabicText(val))
}

const phoneSchema = z
  .string()
  .min(1, 'رقم الهاتف مطلوب')
  .refine((val) => !hasEdgeSpaces(val), {
    message: 'رقم الهاتف لا يجب أن يبدأ أو ينتهي بمسافة',
  })
  .refine((val) => /^(056|059)\d{7}$/.test(val.trim()), {
    message: 'رقم الهاتف يجب أن يبدأ بـ 056 أو 059 وبعدها 7 أرقام',
  })
  .transform((val) => val.trim())

const createSchema = z.object({
  nameAr: validateNoEdgeSpaces('اسم المركز'),
  areaAr: validateNoEdgeSpaces('المنطقة'),
  supervisorAr: validateNoEdgeSpaces('اسم المشرف'),
  phone: phoneSchema,
  capacity: z.coerce.number().int().positive('يجب أن تكون السعة أكبر من 0'),
  familiesCount: z.coerce.number().int().min(0).optional().default(0),
  fillStatus: z.enum(['ممتلئ', 'غير ممتلئ']).optional(),
  placeId: z.string().uuid().optional().nullable(),
})

const updateSchema = z.object({
  nameAr: validateNoEdgeSpaces('اسم المركز').optional(),
  areaAr: validateNoEdgeSpaces('المنطقة').optional(),
  supervisorAr: validateNoEdgeSpaces('اسم المشرف').optional(),
  phone: phoneSchema.optional(),
  capacity: z.coerce.number().int().positive('يجب أن تكون السعة أكبر من 0').optional(),
  familiesCount: z.coerce.number().int().min(0).optional(),
  fillStatus: z.enum(['ممتلئ', 'غير ممتلئ']).optional(),
  placeId: z.string().uuid().optional().nullable(),
})

function normalizeShelter(shelter: {
  id: string
  name: string
  area: string
  phone: string
  familiesCount: number
  capacity: number
  fillStatus: DbFillStatus
  supervisorId: string
  placeId: string | null
  supervisor?: {
    id: string
    name: string
    phone: string | null
  } | null
  place?: unknown
}) {
  return {
    id: shelter.id,
    nameAr: shelter.name,
    areaAr: shelter.area,
    supervisorAr: shelter.supervisor?.name ?? '',
    supervisorId: shelter.supervisorId,
    phone: shelter.phone,
    familiesCount: shelter.familiesCount,
    capacity: shelter.capacity,
    fillStatus: toUiFillStatus(shelter.fillStatus),
    placeId: shelter.placeId,
    place: shelter.place ?? null,
  }
}

async function findOrCreateSupervisorByName(name: string) {
  const trimmedName = normalizeArabicText(name)

  const existing = await prisma.supervisor.findFirst({
    where: {
      name: {
        equals: trimmedName,
        mode: 'insensitive',
      },
      isTrashed: false,
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  })

  if (existing) return existing

  return prisma.supervisor.create({
    data: {
      name: trimmedName,
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim() || ''
    const status = req.nextUrl.searchParams.get('status')?.trim() || ''
    const supervisorId = req.nextUrl.searchParams.get('supervisorId')?.trim() || ''
    const placeId = req.nextUrl.searchParams.get('placeId')?.trim() || ''

    const shelters = await prisma.shelter.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { area: { contains: q, mode: 'insensitive' } },
                  { phone: { contains: q } },
                  {
                    supervisor: {
                      name: { contains: q, mode: 'insensitive' },
                    },
                  },
                ],
              }
            : {},
          status === 'ممتلئ'
            ? { fillStatus: 'FULL' }
            : status === 'غير ممتلئ'
              ? { fillStatus: 'NOT_FULL' }
              : {},
          supervisorId ? { supervisorId } : {},
          placeId ? { placeId } : {},
          { isTrashed: false },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        supervisor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        place: true,
      },
    })

    return NextResponse.json(shelters.map(normalizeShelter))
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

    const supervisor = await findOrCreateSupervisorByName(body.supervisorAr)

    // التحقق من رقم الهاتف المكرر
    const phoneDuplicate = await prisma.shelter.findFirst({
      where: {
        phone: body.phone,
        isTrashed: false,
      },
      select: { id: true },
    })

    if (phoneDuplicate) {
      return NextResponse.json(
        {
          message: 'رقم الهاتف مستخدم من قبل',
          fieldErrors: {
            phone: 'رقم الهاتف مكرر',
          },
        },
        { status: 409 }
      )
    }

    const duplicate = await prisma.shelter.findFirst({
      where: {
        name: {
          equals: body.nameAr,
          mode: 'insensitive',
        },
        area: {
          equals: body.areaAr,
          mode: 'insensitive',
        },
        supervisorId: supervisor.id,
        isTrashed: false,
      },
      select: { id: true },
    })

    if (duplicate) {
      return NextResponse.json(
        {
          message: 'يوجد مركز إيواء بنفس اسم المركز والمنطقة والمشرف',
          fieldErrors: {
            nameAr: 'القيمة مكررة مع المنطقة والمشرف',
            areaAr: 'القيمة مكررة مع اسم المركز والمشرف',
            supervisorAr: 'القيمة مكررة مع اسم المركز والمنطقة',
          },
        },
        { status: 409 }
      )
    }

    if (body.placeId) {
      const placeAlreadyUsed = await prisma.shelter.findFirst({
        where: {
          placeId: body.placeId,
          isTrashed: false,
        },
        select: { id: true },
      })

      if (placeAlreadyUsed) {
        return NextResponse.json(
          {
            message: 'هذا المكان مرتبط بالفعل بمركز إيواء آخر',
            fieldErrors: {
              placeId: 'هذا المكان مرتبط بالفعل بمركز إيواء آخر',
            },
          },
          { status: 409 }
        )
      }
    }

    const computedFillStatus = body.fillStatus
      ? toDbFillStatus(body.fillStatus)
      : inferFillStatus(body.familiesCount, body.capacity)

    const created = await prisma.shelter.create({
      data: {
        name: body.nameAr,
        area: body.areaAr,
        phone: body.phone,
        familiesCount: body.familiesCount,
        capacity: body.capacity,
        fillStatus: computedFillStatus,
        supervisorId: supervisor.id,
        placeId: body.placeId || null,
      },
      include: {
        supervisor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        place: true,
      },
    })

    return NextResponse.json(normalizeShelter(created), { status: 201 })
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
    return NextResponse.json({ message: 'معرّف مركز الإيواء مفقود' }, { status: 400 })
  }

  try {
    const body = updateSchema.parse(await req.json())

    const currentShelter = await prisma.shelter.findUnique({
      where: { id },
      include: {
        supervisor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    if (!currentShelter || currentShelter.isTrashed) {
      return NextResponse.json({ message: 'مركز الإيواء غير موجود' }, { status: 404 })
    }

    const nextName = body.nameAr ?? currentShelter.name
    const nextArea = body.areaAr ?? currentShelter.area

    let supervisorId = currentShelter.supervisorId

    if (body.supervisorAr !== undefined) {
      const supervisor = await findOrCreateSupervisorByName(body.supervisorAr)
      supervisorId = supervisor.id
    }

    // التحقق من رقم الهاتف المكرر
    if (body.phone !== undefined) {
      const phoneAlreadyUsed = await prisma.shelter.findFirst({
        where: {
          phone: body.phone,
          NOT: { id },
          isTrashed: false,
        },
        select: { id: true },
      })

      if (phoneAlreadyUsed) {
        return NextResponse.json(
          {
            message: 'رقم الهاتف مستخدم من قبل',
            fieldErrors: {
              phone: 'رقم الهاتف مكرر',
            },
          },
          { status: 409 }
        )
      }
    }

    if (
      body.nameAr !== undefined ||
      body.areaAr !== undefined ||
      body.supervisorAr !== undefined
    ) {
      const duplicate = await prisma.shelter.findFirst({
        where: {
          NOT: { id },
          name: {
            equals: nextName,
            mode: 'insensitive',
          },
          area: {
            equals: nextArea,
            mode: 'insensitive',
          },
          supervisorId,
          isTrashed: false,
        },
        select: { id: true },
      })

      if (duplicate) {
        return NextResponse.json(
          {
            message: 'يوجد مركز إيواء بنفس اسم المركز والمنطقة والمشرف',
            fieldErrors: {
              nameAr: 'القيمة مكررة مع المنطقة والمشرف',
              areaAr: 'القيمة مكررة مع اسم المركز والمشرف',
              supervisorAr: 'القيمة مكررة مع اسم المركز والمنطقة',
            },
          },
          { status: 409 }
        )
      }
    }

    const nextPlaceId =
      body.placeId !== undefined ? body.placeId || null : currentShelter.placeId

    if (nextPlaceId) {
      const placeAlreadyUsed = await prisma.shelter.findFirst({
        where: {
          AND: [{ placeId: nextPlaceId }, { NOT: { id } }, { isTrashed: false }],
        },
        select: { id: true },
      })

      if (placeAlreadyUsed) {
        return NextResponse.json(
          {
            message: 'هذا المكان مرتبط بالفعل بمركز إيواء آخر',
            fieldErrors: {
              placeId: 'هذا المكان مرتبط بالفعل بمركز إيواء آخر',
            },
          },
          { status: 409 }
        )
      }
    }

    const nextFamiliesCount =
      body.familiesCount !== undefined ? body.familiesCount : currentShelter.familiesCount

    const nextCapacity =
      body.capacity !== undefined ? body.capacity : currentShelter.capacity

    const nextFillStatus =
      body.fillStatus !== undefined
        ? toDbFillStatus(body.fillStatus)
        : body.capacity !== undefined || body.familiesCount !== undefined
          ? inferFillStatus(nextFamiliesCount, nextCapacity)
          : undefined

    const updated = await prisma.shelter.update({
      where: { id },
      data: {
        name: body.nameAr,
        area: body.areaAr,
        phone: body.phone,
        familiesCount: body.familiesCount,
        capacity: body.capacity,
        fillStatus: nextFillStatus,
        supervisorId,
        placeId: body.placeId !== undefined ? body.placeId || null : undefined,
      },
      include: {
        supervisor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        place: true,
      },
    })

    return NextResponse.json(normalizeShelter(updated))
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
  const unauthorized = await requireStaffApi(req)
  if (unauthorized) return unauthorized

  const id = req.nextUrl.searchParams.get('id')

  try {
    if (!id) {
      return NextResponse.json({ message: 'معرّف مركز الإيواء مفقود' }, { status: 400 })
    }

    const currentShelter = await prisma.shelter.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!currentShelter) {
      return NextResponse.json({ message: 'مركز الإيواء غير موجود' }, { status: 404 })
    }

    await prisma.shelter.delete({
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
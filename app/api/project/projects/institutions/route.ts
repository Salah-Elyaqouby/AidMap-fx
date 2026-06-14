import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { PresenceStatus } from '@prisma/client';

// دالة تنظيف البيانات المرسلة للفرونت
function normalizeInstitution(ins: any) {
  return {
    id: ins.id,
    nameAr: ins.name,
    email: ins.email || '',
    serviceType: ins.serviceType || '',
    presence: ins.presence === PresenceStatus.AVAILABLE ? 'متاح' : 'غير متاح',
    placeId: ins.placeId || null,
  };
}

// مخطط التحقق
const institutionSchema = z.object({
  nameAr: z.string().min(1, 'الاسم مطلوب'),
  email: z.string().email('بريد غير صالح'),
  serviceType: z.string().min(1, 'نوع الخدمة مطلوب'),
  presence: z.enum(['متاح', 'غير متاح']),
  placeId: z.string().uuid().optional().nullable(),
});

// --- GET: جلب البيانات ---
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const presence = searchParams.get('presence');

    const institutions = await prisma.institution.findMany({
      where: {
        isTrashed: false,
        ...(q && { name: { contains: q, mode: 'insensitive' } }),
        ...(presence && { 
          presence: presence === 'متاح' ? PresenceStatus.AVAILABLE : PresenceStatus.UNAVAILABLE 
        }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(institutions.map(normalizeInstitution));
  } catch (e) {
    console.error("GET ERROR:", e);
    return NextResponse.json({ message: 'فشل جلب البيانات' }, { status: 500 });
  }
}

// --- POST: إضافة مؤسسة ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = institutionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ errors: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = result.data;
    const created = await prisma.institution.create({
      data: {
        name: data.nameAr,
        email: data.email.toLowerCase().trim(),
        serviceType: data.serviceType,
        presence: data.presence === 'متاح' ? PresenceStatus.AVAILABLE : PresenceStatus.UNAVAILABLE,
        ...(data.placeId && { place: { connect: { id: data.placeId } } }),
      },
    });

    return NextResponse.json(normalizeInstitution(created), { status: 201 });
  } catch (e: any) {
    console.error("POST ERROR:", e);
    return NextResponse.json({ message: 'فشل الحفظ', detail: e.message }, { status: 500 });
  }
}

// --- PUT: تعديل مؤسسة ---
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'ID مفقود' }, { status: 400 });

    const body = await req.json();
    const result = institutionSchema.partial().safeParse(body);

    if (!result.success) return NextResponse.json({ errors: result.error.flatten() }, { status: 400 });

    const data = result.data;
    const updated = await prisma.institution.update({
      where: { id },
      data: {
        ...(data.nameAr && { name: data.nameAr }),
        ...(data.email && { email: data.email.toLowerCase().trim() }),
        ...(data.serviceType && { serviceType: data.serviceType }),
        ...(data.presence && { 
          presence: data.presence === 'متاح' ? PresenceStatus.AVAILABLE : PresenceStatus.UNAVAILABLE 
        }),
      },
    });

    return NextResponse.json(normalizeInstitution(updated));
  } catch (e) {
    console.error("PUT ERROR:", e);
    return NextResponse.json({ message: 'فشل التعديل' }, { status: 500 });
  }
}
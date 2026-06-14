import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// خرائط التحويل من العربي إلى Enum قاعدة البيانات
const statusMap: Record<string, any> = {
  'جديدة': 'NEW',
  'قيد المعالجة': 'IN_PROGRESS',
  'مغلقة': 'CLOSED'
};

const levelMap: Record<string, any> = {
  'منخفض': 'LOW',
  'متوسط': 'MEDIUM',
  'مرتفع': 'HIGH'
};

// خرائط التحويل من قاعدة البيانات إلى العربي للعرض
const statusRevMap: Record<string, string> = {
  'NEW': 'جديدة',
  'IN_PROGRESS': 'قيد المعالجة',
  'CLOSED': 'مغلقة'
};

const levelRevMap: Record<string, string> = {
  'LOW': 'منخفض',
  'MEDIUM': 'متوسط',
  'HIGH': 'مرتفع'
};

export async function GET(req: NextRequest) {
  try {
    const emergencies = await prisma.emergency.findMany({
      orderBy: { id: 'desc' },
    });

    const formatted = emergencies.map(item => ({
      ...item,
      status: statusRevMap[item.status] || item.status,
      level: levelRevMap[item.level] || item.level,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ message: 'خطأ في جلب البيانات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // جلب أول مخيم وأول مشرف موجودين فعلياً لتجنب خطأ الـ Foreign Key
    const camp = await prisma.camps.findFirst();
    const supervisor = await prisma.supervisor.findFirst();

    if (!camp || !supervisor) {
      return NextResponse.json({ message: 'تأكد من وجود مخيم ومشرف واحد على الأقل في الجداول' }, { status: 400 });
    }

    const newEmergency = await prisma.emergency.create({
      data: {
        emergencyType: body.emergencyType,
        description: body.description || "",
        status: statusMap[body.status] || 'NEW',
        level: levelMap[body.level] || 'MEDIUM',
        campId: camp.id, 
        supervisorId: supervisor.id,
      }
    });

    return NextResponse.json(newEmergency, { status: 201 });
  } catch (error: any) {
    console.error("Prisma POST Error:", error);
    return NextResponse.json({ message: 'فشل الإضافة: تأكد من إدخال بيانات في جداول المخيمات والمشرفين' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    const updated = await prisma.emergency.update({
      where: { id: id },
      data: {
        emergencyType: updateData.emergencyType,
        status: statusMap[updateData.status],
        level: levelMap[updateData.level],
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: 'فشل التعديل' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'ID missing' }, { status: 400 });
    
    await prisma.emergency.delete({ where: { id } });
    return NextResponse.json({ message: 'تم الحذف بنجاح' });
  } catch (error) {
    return NextResponse.json({ message: 'فشل الحذف' }, { status: 400 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const typeMap: Record<string, any> = { 'خاص': 'PRIVATE', 'وكالة': 'UNRWA', 'حكومية': 'GOVERNMENT' };
const regionMap: Record<string, any> = { 'شمال': 'NORTH', 'جنوب': 'SOUTH', 'شرق': 'EAST', 'غرب': 'WEST' };
const typeRevMap: Record<string, string> = Object.fromEntries(Object.entries(typeMap).map(([k, v]) => [v, k]));
const regionRevMap: Record<string, string> = Object.fromEntries(Object.entries(regionMap).map(([k, v]) => [v, k]));

function parseNullableValue(value: any) {
  return value === null || value === undefined || value === '' ? undefined : value;
}

export async function GET() {
  try {
    const [hospitals, allDoctors] = await Promise.all([
      prisma.hospital.findMany({
        include: { doctors: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.doctor.findMany()
    ]);

    const formattedHospitals = hospitals.map(h => ({
      id: h.id,
      hospitalName: h.name,
      hospitalType: typeRevMap[h.type] || h.type,
      region: regionRevMap[h.region] || h.region,
      latitude: h.latitude,
      longitude: h.longitude,
      phone: h.phone,
      doctorNames: h.doctors.map(d => d.name).join('، ')
    }));

    return NextResponse.json({ hospitals: formattedHospitals, allDoctors });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const address = await prisma.address.create({
      data: {
        title: body.hospitalName || 'مستشفى',
        region: regionMap[body.region] || 'NORTH',
        description: body.location || '',
      }
    });

    const newHospital = await prisma.hospital.create({
      data: {
        name: body.hospitalName,
        type: typeMap[body.hospitalType] || 'GOVERNMENT',
        region: regionMap[body.region] || 'NORTH',
        phone: body.phone,
        latitude: parseNullableValue(body.latitude),
        longitude: parseNullableValue(body.longitude),
        addressId: address.id,
        doctors: body.doctorId ? { connect: { id: body.doctorId } } : undefined
      }
    });
    return NextResponse.json(newHospital, { status: 201 });
  } catch (error) {
    console.error('POST /hospitals error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

// إضافة وظيفة التعديل (PATCH)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, hospitalName, hospitalType, region, phone, doctorId } = body;

    const updated = await prisma.hospital.update({
      where: { id },
      data: {
        name: hospitalName,
        type: typeMap[hospitalType],
        region: regionMap[region],
        phone: phone,
        latitude: parseNullableValue(body.latitude),
        longitude: parseNullableValue(body.longitude),
        // تحديث الطبيب إذا تم إرسال ID جديد
        doctors: doctorId ? {
          set: [{ id: doctorId }] // استبدال الأطباء القدامى بالطبيب الجديد
        } : undefined
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 400 });
  }
}
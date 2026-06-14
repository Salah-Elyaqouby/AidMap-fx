import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH - تعديل بيانات القسم
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    const { id, name, deptType, status, description } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Department ID is required" },
        { status: 400 }
      );
    }

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: {
        name,
        deptType,
        status,
        description,
      },
    });

    return NextResponse.json(updatedDepartment);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "فشل تحديث القسم" },
      { status: 500 }
    );
  }
}
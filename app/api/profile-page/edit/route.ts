import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { name, email, avatar, language, theme, country, timezone, password } = body;

    if (!name || !email) {
      return NextResponse.json(
        { message: 'Name and email are required.' },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: 'User not found.' },
        { status: 404 },
      );
    }

    // تحقق إذا الإيميل الجديد مستخدم من شخص آخر
    if (email !== existingUser.email) {
      const emailUsed = await prisma.user.findUnique({
        where: { email },
      });

      if (emailUsed) {
        return NextResponse.json(
          { message: 'This email is already in use.' },
          { status: 400 },
        );
      }
    }

    const updateData: any = {
      name,
      email,
      avatar,
      language,
      theme,
      country,
      timezone,
    };

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json(
          { message: 'New password must be at least 6 characters.' },
          { status: 400 },
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        language: true,
        theme: true,
        country: true,
        timezone: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Profile updated successfully.',
        user: updatedUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('PUT /api/profile-page/edit error:', error);

    return NextResponse.json(
      { message: 'Failed to update profile.' },
      { status: 500 },
    );
  }
}
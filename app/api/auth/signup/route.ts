import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import {
  getSignupSchema,
  SignupSchemaType,
} from '@/app/(auth)/forms/signup-schema';
import { UserStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    console.log('📝 [SIGNUP] Request started');
    
    const body = await req.json();
    console.log('📝 [SIGNUP] Body received:', { email: body.email, name: body.name });
    
    const result = getSignupSchema().safeParse(body);
    if (!result.success) {
      console.warn('⚠️ [SIGNUP] Validation failed:', result.error.flatten());
      return NextResponse.json(
        { message: 'البيانات غير صالحة.', fieldErrors },
        { status: 400 },
      );
    }

    const { email, password, name }: SignupSchemaType = result.data;
    console.log('✅ [SIGNUP] Validation passed');

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json(
        { message: 'البريد الإلكتروني مسجّل بالفعل.' },
        { status: 409 }
      );
    }

    // Get default role
    console.log('🔍 [SIGNUP] Looking for default role');
    const defaultRole = await prisma.userRole.findFirst({
      where: { isDefault: true },
    });

    if (!defaultRole) {
      console.error('❌ [SIGNUP] NO DEFAULT ROLE FOUND IN DATABASE!');
      return NextResponse.json(
        { message: 'Server setup error: No default role. Contact admin.' },
        { status: 500 }
      );
    }
    console.log('✅ [SIGNUP] Default role found:', defaultRole.id);

    // Hash password
    console.log('🔐 [SIGNUP] Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ [SIGNUP] Password hashed');

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        roleId: defaultRole.id,
      },
    });

    // ✅ SUCCESS - NO EMAIL SENDING FOR NOW
    console.log('✅ [SIGNUP] User registered successfully (email step skipped for testing)');
    
    return NextResponse.json(
      { message: 'تم التسجيل بنجاح. يمكنك تسجيل الدخول الآن.' },
      { status: 200 },
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ [SIGNUP] CRITICAL ERROR:', errorMessage, error);
    
    return NextResponse.json(
      {
        message: 'حدث خطأ أثناء التسجيل.',
        error: errorMessage, // Remove in production
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserStatus, VerificationTokenPurpose } from '@prisma/client';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token } = body;

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token is missing' }, { status: 400 });
  }

  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      token,
      purpose: VerificationTokenPurpose.EMAIL_VERIFY,
    },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return NextResponse.json(
      { message: 'Invalid or expired token' },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verificationToken.identifier },
        data: {
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });

      await tx.verificationToken.deleteMany({
        where: {
          identifier: verificationToken.identifier,
          purpose: VerificationTokenPurpose.EMAIL_VERIFY,
        },
      });
    });

    return NextResponse.json(
      { message: 'Email verified successfully!' },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

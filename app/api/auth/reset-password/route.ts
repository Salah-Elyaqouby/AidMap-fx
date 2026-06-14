import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { sendEmail } from '@/services/send-email';
import { VerificationTokenPurpose } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const recaptchaToken = req.headers.get('x-recaptcha-token');

    if (!recaptchaToken) {
      return NextResponse.json(
        { message: 'Please complete the reCAPTCHA verification.' },
        { status: 400 },
      );
    }

    const isValidToken = await verifyRecaptchaToken(recaptchaToken);

    if (!isValidToken) {
      return NextResponse.json(
        { message: 'reCAPTCHA verification failed. Please try again.' },
        { status: 400 },
      );
    }

    const { email } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        {
          message:
            'If an account with that email exists, a password reset link has been sent.',
        },
        { status: 200 },
      );
    }

    const token = crypto.randomBytes(32).toString('hex');

    await prisma.verificationToken.deleteMany({
      where: {
        identifier: user.id,
        purpose: VerificationTokenPurpose.PASSWORD_RESET,
      },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: user.id,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
        purpose: VerificationTokenPurpose.PASSWORD_RESET,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/change-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      content: {
        title: `Hello, ${user.name}`,
        subtitle:
          'You requested a password reset. Click the below link to reset your password',
        buttonLabel: 'Reset password',
        buttonUrl: resetUrl,
        description:
          'This link is valid for 1 hour. If you did not request this email you can safely ignore it.',
      },
    });

    return NextResponse.json(
      {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    console.error('Password reset error:', err);
    return NextResponse.json(
      { message: 'Failed to process request.' },
      { status: 500 },
    );
  }
}

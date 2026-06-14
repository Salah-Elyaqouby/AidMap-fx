import crypto from 'crypto';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 8-character human-friendly reference for aid requests. */
export function generateAidReferenceCode(): string {
  const bytes = crypto.randomBytes(12);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += CHARS[bytes[i]! % CHARS.length];
  }
  return out;
}

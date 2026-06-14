/** Mask phone for citizen-facing responses (e.g. 059****123). */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone || phone.length < 7) return phone ?? null;
  const start = phone.slice(0, 3);
  const end = phone.slice(-3);
  return `${start}****${end}`;
}

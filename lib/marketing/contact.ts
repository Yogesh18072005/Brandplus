/** The person signing audit reports (NEXT_PUBLIC_FOUNDER_NAME). Null when unset — never invented. */
export function founderName(): string | null {
  return process.env.NEXT_PUBLIC_FOUNDER_NAME?.trim() || null;
}

/** The public contact address (NEXT_PUBLIC_CONTACT_EMAIL), or null when unset or malformed. */
export function contactEmail(): string | null {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/**
 * A wa.me chat link with the message pre-filled (NEXT_PUBLIC_WHATSAPP_NUMBER,
 * digits with country code, e.g. 919876543210). Null when unset or malformed.
 */
export function whatsappHref(text: string): string | null {
  const digits = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[\s+()-]/g, '');
  return digits && /^\d{10,15}$/.test(digits) ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

/**
 * Where "book a call" buttons point. Set NEXT_PUBLIC_BOOKING_URL (e.g. a
 * Cal.com link) and/or NEXT_PUBLIC_CONTACT_EMAIL. Null hides the button
 * rather than shipping a dead link.
 */
export function bookingHref(subject = 'AI visibility audit'): string | null {
  const booking = process.env.NEXT_PUBLIC_BOOKING_URL?.trim();
  if (booking && /^https:\/\//.test(booking)) return booking;
  const email = contactEmail();
  return email ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : null;
}

import { randomUUID } from 'node:crypto';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { createAdminClient } from '@/lib/supabase/admin';
import { attachLeadsForUser } from '@/lib/onboarding/attach-leads';

function primaryEmail(data: {
  primary_email_address_id?: string | null;
  email_addresses?: Array<{ id: string; email_address: string }>;
}) {
  const addresses = data.email_addresses ?? [];
  return addresses.find((item) => item.id === data.primary_email_address_id)?.email_address
    ?? addresses[0]?.email_address
    ?? null;
}

export async function POST(request: Request) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.warn('[clerk-webhook] Signature verification failed', error);
    return new Response('Invalid signature', { status: 400 });
  }

  const admin = createAdminClient();

  if (event.type === 'user.deleted') {
    if (event.data.id) {
      const { error } = await admin.from('profiles').delete().eq('clerk_user_id', event.data.id);
      if (error) return new Response('Profile deletion failed', { status: 500 });
    }
    return new Response('OK');
  }

  if (event.type !== 'user.created' && event.type !== 'user.updated') {
    return new Response('OK');
  }

  const clerkUserId = event.data.id;
  const email = primaryEmail(event.data);
  const fullName = [event.data.first_name, event.data.last_name].filter(Boolean).join(' ').trim();

  const { data: existing, error: readError } = await admin
    .from('profiles').select('id').eq('clerk_user_id', clerkUserId).maybeSingle();
  if (readError) return new Response('Profile lookup failed', { status: 500 });

  let profileId = existing?.id;
  if (profileId) {
    const { error } = await admin.from('profiles')
      .update({ email, full_name: fullName || null })
      .eq('id', profileId);
    if (error) return new Response('Profile update failed', { status: 500 });
  } else {
    profileId = randomUUID();
    const { error } = await admin.from('profiles').insert({
      id: profileId,
      clerk_user_id: clerkUserId,
      email,
      full_name: fullName || null,
      plan: 'free',
      credits_remaining: 0,
      credits_reset_at: null,
      free_credit_status: 'pending',
    });
    if (error) {
      // A concurrent first authenticated request may have provisioned it.
      const { data: raced } = await admin.from('profiles')
        .select('id').eq('clerk_user_id', clerkUserId).maybeSingle();
      if (!raced) return new Response('Profile creation failed', { status: 500 });
      profileId = raced.id;
    }
  }

  await attachLeadsForUser(admin, profileId, email);
  return new Response('OK');
}

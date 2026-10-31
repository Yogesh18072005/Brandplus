import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { supabaseServerConfigured } from '@/lib/supabase/config';

type AdminClient = SupabaseClient<Database>;

export interface OperationalEvent {
  eventType: string;
  severity?: 'info' | 'warning' | 'error';
  projectId?: string | null;
  auditId?: string | null;
  metadata?: Record<string, Json | undefined>;
}

/** Best-effort structured operations logging. Never interrupts customer work. */
export async function recordOperationalEvent(
  event: OperationalEvent,
  suppliedClient?: AdminClient,
): Promise<void> {
  if (!supabaseServerConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const client = suppliedClient ?? createAdminClient();
    const { error } = await client.from('operational_events').insert({
      event_type: event.eventType.slice(0, 100),
      severity: event.severity ?? 'info',
      project_id: event.projectId ?? null,
      audit_id: event.auditId ?? null,
      metadata: (event.metadata ?? {}) as Json,
    });
    if (error) console.warn(`[ops] Unable to record ${event.eventType}: ${error.message}`);
  } catch (error) {
    console.warn(`[ops] Unable to record ${event.eventType}:`, error instanceof Error ? error.message : error);
  }
}

import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ViewerProvider } from '@/components/dashboard/ViewerContext';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isOpsUser } from '@/lib/auth/ops-access';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <ViewerProvider isOps={isOpsUser(user?.email)}>
      <DashboardShell userEmail={user?.email ?? ''}>
        {children}
      </DashboardShell>
    </ViewerProvider>
  );
}

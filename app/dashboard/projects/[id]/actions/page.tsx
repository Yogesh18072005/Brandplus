import { ActionCenter } from '@/components/dashboard/ActionCenter';
import { PageHeader } from '@/components/layout/PageHeader';

export default async function ActionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div><PageHeader title="What to change" description="Evidence-backed actions from your latest BrandPulse audits." /><ActionCenter projectId={id} /></div>;
}

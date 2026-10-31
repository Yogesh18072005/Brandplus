import { BusinessSetup } from '@/components/dashboard/BusinessSetup';

/** Adding another business: the same four steps, without the free-audit check. */
export default function NewProjectPage() {
  return <BusinessSetup mode="another" />;
}

import { PLANS, type PlanId } from './plans';

const FEATURES: Record<PlanId, string[]> = {
  free: [
    '1 business',
    '1 audit credit every 30 days',
    '10 buyer questions per audit',
    'Limited evidence preview',
    'First prioritized action',
  ],
  starter: [
    '1 business',
    '2 audit credits every 30 days',
    '40 buyer questions per audit',
    'Weekly change tracking',
    'Complete three-step action plan',
    'Before-and-after measurement',
  ],
  pro: [
    'Up to 10 businesses',
    '6 audit credits every 30 days',
    '40 buyer questions per audit',
    'Weekly and daily monitoring',
    'Deeper evidence workflows',
    'Priority audit queue',
  ],
};

export interface MarketingPlan {
  id: PlanId;
  name: string;
  price: string;
  priceInr: number;
  period: string;
  description: string;
  features: string[];
  highlight: boolean;
  cta: string;
}

export function getMarketingPlans(): MarketingPlan[] {
  const copy: Record<PlanId, { description: string; cta: string; highlight: boolean }> = {
    free: {
      description: 'Experience BrandPulse on one real business.',
      cta: 'Run the free audit',
      highlight: false,
    },
    starter: {
      description: 'One business. Ongoing improvement.',
      cta: 'Continue with Starter',
      highlight: true,
    },
    pro: {
      description: 'More businesses, more frequent monitoring, deeper workflows.',
      cta: 'Continue with Pro',
      highlight: false,
    },
  };

  return (['free', 'starter', 'pro'] as PlanId[]).map((id) => {
    const plan = PLANS[id];
    const meta = copy[id];
    return {
      id,
      name: plan.name,
      price: plan.priceInr === 0 ? '₹0' : `₹${plan.priceInr.toLocaleString('en-IN')}`,
      priceInr: plan.priceInr,
      period: plan.priceInr === 0 ? '' : '/30 days',
      description: meta.description,
      features: FEATURES[id],
      highlight: meta.highlight,
      cta: meta.cta,
    };
  });
}

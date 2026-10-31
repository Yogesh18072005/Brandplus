// Private, consistent pricing for sales calls. The website shows no prices;
// this turns a company's own audit into a scoped monthly quote from the rate
// card, so the same evidence always produces the same price.

import { snapshotTotals, type OutreachReportFile } from './model';
import { buildScorecard } from './scorecard';

export interface RateTier {
  id: string;
  name: string;
  piecesPerMonth: number;
  priceInr: number;
  priceUsd: number;
  includes: string[];
}

export interface RateCard {
  tiers: RateTier[];
  minimumMonths: number;
  foundingDiscount: number; // 0.35 = 35% off
  foundingSlots: number;
  writerCostPerPieceInr: number;
  usdInr: number;
}

export type Market = 'india' | 'global';

export interface Quote {
  market: Market;
  currency: 'INR' | 'USD';
  recommended: RateTier;
  /** The option above the recommendation, shown second so the recommendation reads as the sensible middle. */
  stretch: RateTier | null;
  monthly: number;
  foundingMonthly: number;
  minimumMonths: number;
  /** Estimated freelance writing cost per month, and the gross margin left. */
  writerCostMonthly: number;
  marginShare: number;
  reasons: string[];
}

/** Indian local businesses and India-located audits quote in INR; everything else in USD. */
export function marketFor(file: OutreachReportFile): Market {
  const where = `${file.region} ${file.report.business.city}`.toLowerCase();
  if (file.businessType === 'local') return 'india';
  return /\bindia\b|delhi|mumbai|bangalore|bengaluru|chennai|hyderabad|pune|kolkata|noida|gurgaon|gurugram/.test(where) ? 'india' : 'global';
}

/**
 * Scope from the audit itself: how many questions were lost, how dominant the
 * top rival is, and how weak the overall score is. Each step up is explained.
 */
export function buildQuote(file: OutreachReportFile, card: RateCard): Quote {
  const tiers = [...card.tiers].sort((a, b) => a.piecesPerMonth - b.piecesPerMonth);
  if (tiers.length === 0) throw new Error('Rate card has no tiers');
  const competitors = file.report.competitors.map((c) => c.name);
  const totals = snapshotTotals(file.current, competitors);
  const usable = Math.max(totals.usable, 1);
  const scorecard = buildScorecard(file);
  const lost = file.current.questions.filter((q) => q.outcome === 'absent' && q.competitors.length > 0).length;
  const rival = totals.competitors[0];
  const rivalShare = rival ? rival.count / usable : 0;

  const reasons: string[] = [];
  let level = 0;
  if (lost >= 4 || scorecard.score < 60) {
    level = 1;
    reasons.push(`${lost} of ${totals.usable} questions name a competitor instead of them; score ${scorecard.score}/100 (${scorecard.grade}).`);
  } else {
    reasons.push(`Only ${lost} lost question${lost === 1 ? '' : 's'} and a score of ${scorecard.score}/100: a focused scope covers it.`);
  }
  if (rival && rivalShare >= 0.75 && totals.appeared / usable < 0.25) {
    level += 1;
    reasons.push(`${rival.name} is named in ${rival.count} of ${totals.usable} answers: displacing an entrenched leader needs more volume.`);
  }
  if (lost >= 10) {
    level += 1;
    reasons.push(`${lost} lost questions is more than one month of pieces can cover.`);
  }
  level = Math.min(level, tiers.length - 1);
  const recommended = tiers[level]!;
  const stretch = tiers[level + 1] ?? null;

  const market = marketFor(file);
  const monthly = market === 'india' ? recommended.priceInr : recommended.priceUsd;
  const writerCostMonthly = market === 'india'
    ? recommended.piecesPerMonth * card.writerCostPerPieceInr
    : Math.round((recommended.piecesPerMonth * card.writerCostPerPieceInr) / card.usdInr);
  return {
    market,
    currency: market === 'india' ? 'INR' : 'USD',
    recommended,
    stretch,
    monthly,
    foundingMonthly: Math.round(monthly * (1 - card.foundingDiscount)),
    minimumMonths: card.minimumMonths,
    writerCostMonthly,
    marginShare: monthly ? Math.round(((monthly - writerCostMonthly) / monthly) * 100) / 100 : 0,
    reasons,
  };
}

export function formatMoney(amount: number, currency: Quote['currency']): string {
  return currency === 'INR' ? `₹${amount.toLocaleString('en-IN')}` : `$${amount.toLocaleString('en-US')}`;
}

export function validateRateCard(raw: unknown): RateCard {
  const card = raw as Partial<RateCard>;
  const ok = card && Array.isArray(card.tiers) && card.tiers.length > 0
    && card.tiers.every((t) => t && typeof t.name === 'string' && t.piecesPerMonth > 0 && t.priceInr > 0 && t.priceUsd > 0)
    && typeof card.minimumMonths === 'number' && typeof card.foundingDiscount === 'number'
    && card.foundingDiscount >= 0 && card.foundingDiscount < 1
    && typeof card.writerCostPerPieceInr === 'number' && typeof card.usdInr === 'number';
  if (!ok) throw new Error('Rate card is missing fields or has invalid values');
  return card as RateCard;
}

// Shared, dependency-free profile constants (safe to import from web pages).

export type ProfileKind =
  | 'linkedin' | 'youtube' | 'x' | 'instagram' | 'facebook' | 'github'
  | 'g2' | 'capterra' | 'producthunt' | 'trustpilot' | 'crunchbase'
  | 'justdial' | 'indiamart' | 'googlemaps' | 'practo' | 'clutch';

export const REVIEW_PROFILES: ProfileKind[] = ['g2', 'capterra', 'producthunt', 'trustpilot', 'justdial', 'indiamart', 'googlemaps', 'practo', 'clutch'];

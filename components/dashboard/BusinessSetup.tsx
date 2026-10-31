'use client';

// Setting up a business, one question at a time (the agency template's
// restraint), beside a live AI answer that builds from what they type (the
// Figma file's frosted-tile stage). Modes:
//  - 'first' (onboarding): the one-account check (network, device, VPN) runs
//    first; the landing-page form prefills it; finishing requests the first
//    audit, which waits in the founder's queue.
//  - 'another' (add a business): no free-audit check or prefill; the new
//    business page offers "Request my audit" itself.
//  - 'preview' (/demo/onboarding): the real flow with no network calls.

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, CornerDownLeft, Loader2, Sparkles, X } from 'lucide-react';
import { ensureAccountClaim } from '@/lib/client/account-claim';
import { ONBOARDING_PREFILL_KEY, type OnboardingPrefill } from '@/components/landing/AuditForm';
import { InkButton, RingTile } from '@/components/ui/InkButton';
import { AiLogo } from '@/components/brand/AiLogo';
import { Frost, Stage } from '@/components/landing/Scenes';

interface Form {
  businessName: string;
  website: string;
  category: string;
  city: string;
  competitors: string[];
}

const EMPTY: Form = { businessName: '', website: '', category: '', city: '', competitors: [] };

type StepKey = 'businessName' | 'website' | 'category' | 'city' | 'competitors' | 'review';

const STEPS: { key: StepKey; question: string; hint: string; placeholder?: string }[] = [
  { key: 'businessName', question: 'What’s your business called?', hint: 'The name your buyers know you by.', placeholder: 'Your business name' },
  { key: 'website', question: 'What’s your website?', hint: 'So we can tell when AI cites you.', placeholder: 'yourbusiness.com' },
  { key: 'category', question: 'What do you do, in a few words?', hint: 'Say it the way a buyer would search for it.', placeholder: 'e.g. cosmetic dentist, CRM software' },
  { key: 'city', question: 'Where are your buyers?', hint: 'A city, a country, or “worldwide”.', placeholder: 'e.g. Delhi, or worldwide' },
  { key: 'competitors', question: 'Who do you lose deals to?', hint: 'Up to three. We count how often AI names each of them.', placeholder: 'Type a competitor, press Enter' },
  { key: 'review', question: 'Ready to see what AI says?', hint: '' },
];

const INK = 'text-[#171425]';
const MUTED = 'text-[#524f6d]';
const FAINT = 'text-[#676480]';
const EASE = [0.65, 0, 0.35, 1] as const;

const cleanSite = (value: string) => value.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
const looksLikeSite = (value: string) => /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(cleanSite(value));

function buyerQuestion(form: Form): string {
  const cat = form.category.trim();
  if (!cat) return 'Who should I choose?';
  const place = form.city.trim() && !/worldwide|global|online/i.test(form.city) ? ` in ${form.city.trim()}` : '';
  return `Who’s the best ${cat}${place}?`;
}

/** The right side: a live AI answer, built from what they've typed so far. */
function AnswerStage({ form, step }: { form: Form; step: number }) {
  const name = form.businessName.trim() || 'Your business';
  const rivals = form.competitors.length ? form.competitors : ['A competitor', 'Another competitor'];
  const asked = step >= 2 || Boolean(form.category.trim());
  return (
    <Stage className="flex h-full min-h-[520px] flex-col items-center justify-center px-6 py-12 sm:px-12">
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
        <Frost className="size-[104px]"><AiLogo name="gemini" className="size-[56%]" /></Frost>
      </motion.div>

      <div className="mt-8 w-full max-w-[400px] space-y-2.5">
        <AnimatePresence mode="popLayout">
          {asked && (
            <motion.p key={buyerQuestion(form)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}
              className="ml-auto w-fit max-w-[90%] rounded-[16px] rounded-br-[5px] bg-[#0e0b19] px-4 py-2.5 text-[14px] text-white shadow-[0_14px_30px_-14px_rgb(11_15_25/0.6)]">
              {buyerQuestion(form)}
            </motion.p>
          )}
        </AnimatePresence>
        <motion.div layout className="rounded-[18px] bg-white/95 p-4 shadow-[0_26px_50px_-26px_rgb(20_70_170/0.6)]">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-[#41608f]"><AiLogo name="gemini" className="size-3.5" />AI answers</p>
          <ul className="mt-3 space-y-2">
            {rivals.map((r, i) => (
              <motion.li key={r} layout initial={{ opacity: 0, x: 16 }} animate={{ opacity: form.competitors.length ? 1 : 0.45, x: 0 }} transition={{ duration: 0.45, ease: EASE, delay: i * 0.06 }}
                className="flex items-center gap-2.5 rounded-[11px] bg-[#f7f6fd] px-3 py-2">
                <span className="grid size-5 place-items-center rounded-full bg-brand text-[10.5px] font-bold text-white">{i + 1}</span>
                <span className={`truncate text-[13.5px] font-semibold ${INK}`}>{r}</span>
                <span className="ml-auto text-[11px] font-semibold text-brand-deep">Named</span>
              </motion.li>
            ))}
            <motion.li layout className="flex items-center gap-2.5 rounded-[11px] border border-dashed border-[#f0a19d] bg-[#fff6f5] px-3 py-2">
              <span className="grid size-5 place-items-center rounded-full border border-[#d93036] text-[10.5px] font-bold text-[#d93036]">?</span>
              <span className="truncate text-[13.5px] font-semibold text-[#d93036]">{name}</span>
              <span className="ml-auto text-[11px] font-semibold text-[#d93036]">Named?</span>
            </motion.li>
          </ul>
        </motion.div>
      </div>
      <p className="mt-6 max-w-[22em] text-center text-[13.5px] text-[#46418f]">Your audit asks questions like this, and shows you who AI names instead of you.</p>
    </Stage>
  );
}

export function BusinessSetup({ mode }: { mode: 'first' | 'another' | 'preview' }) {
  const first = mode === 'first';
  const preview = mode === 'preview';
  const router = useRouter();
  const reduce = useReducedMotion();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [draft, setDraft] = useState('');
  const [nudge, setNudge] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState('');
  const [previewDone, setPreviewDone] = useState(false);
  const [account, setAccount] = useState<{ state: 'checking' } | { state: 'ready' } | { state: 'blocked'; message: string; retry: boolean }>({ state: first ? 'checking' : 'ready' });

  // Decide the free audit before anything else; the server records it once.
  useEffect(() => {
    if (!first) return;
    let active = true;
    ensureAccountClaim()
      .then((claim) => {
        if (!active) return;
        setAccount(claim.allowed
          ? { state: 'ready' }
          : { state: 'blocked', message: claim.message ?? 'Your account can’t request a free audit.', retry: claim.reason === 'vpn_suspected' || claim.reason === 'identity_unavailable' });
      })
      .catch((err: unknown) => {
        if (active) setAccount({ state: 'blocked', message: err instanceof Error ? err.message : 'Refresh to try again.', retry: true });
      });
    return () => { active = false; };
  }, [first]);

  // Pick up what the visitor typed on the landing page before signing up.
  useEffect(() => {
    if (!first) return;
    try {
      const stored = localStorage.getItem(ONBOARDING_PREFILL_KEY);
      if (!stored) return;
      const prefill = JSON.parse(stored) as Partial<OnboardingPrefill>;
      const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');
      const competitors = Array.isArray(prefill.competitors) ? prefill.competitors.map((item) => text(item, 80)).filter(Boolean).slice(0, 3) : [];
      setForm({
        businessName: text(prefill.businessName, 80),
        website: text(prefill.website, 120),
        category: text(prefill.category, 60),
        city: text(prefill.city, 60),
        competitors,
      });
    } catch {
      // Unreadable prefill: start empty.
    }
  }, [first]);

  // A business already exists (seeded from a lead): skip onboarding.
  useEffect(() => {
    if (preview) return;
    let active = true;
    async function loadProjects() {
      const res = await fetch('/api/projects');
      if (res.status === 401) {
        router.replace('/sign-in');
        return;
      }
      if (res.ok) {
        const projects = await res.json();
        if (first && active && Array.isArray(projects) && projects.length > 0) router.push(`/dashboard/projects/${projects[0].id}`);
      }
    }
    loadProjects();
    return () => { active = false; };
  }, [router, first, preview]);

  useEffect(() => { input.current?.focus({ preventScroll: true }); }, [step]);

  const current = STEPS[step]!;

  function value(key: StepKey): string {
    return key === 'competitors' || key === 'review' ? draft : form[key];
  }

  function setValue(key: StepKey, next: string) {
    setNudge('');
    if (key === 'competitors' || key === 'review') setDraft(next);
    else setForm((f) => ({ ...f, [key]: next }));
  }

  function addCompetitor(name = draft) {
    const clean = name.trim();
    if (!clean) return;
    setForm((f) => (f.competitors.length >= 3 || f.competitors.includes(clean) ? f : { ...f, competitors: [...f.competitors, clean] }));
    setDraft('');
  }

  function problem(key: StepKey): string {
    if (key === 'businessName' && !form.businessName.trim()) return 'Add your business name to continue.';
    if (key === 'website' && !looksLikeSite(form.website)) return 'Enter a website like yourbusiness.com';
    if (key === 'category' && !form.category.trim()) return 'Add what you do, in a few words.';
    if (key === 'city' && !form.city.trim()) return 'Add a location, or “worldwide”.';
    if (key === 'competitors' && !form.competitors.length && !draft.trim()) return 'Add at least one competitor.';
    return '';
  }

  function next() {
    if (current.key === 'competitors' && draft.trim()) addCompetitor();
    const issue = current.key === 'competitors' && draft.trim() ? '' : problem(current.key);
    if (issue) { setNudge(issue); return; }
    if (current.key === 'review') { void finish(); return; }
    setDir(1);
    setStep((s) => s + 1);
  }

  function back() {
    setNudge('');
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (current.key === 'competitors' && draft.trim() && form.competitors.length < 3) { addCompetitor(); return; }
      next();
    }
    if (event.key === 'Backspace' && current.key === 'competitors' && !draft && form.competitors.length) {
      setForm((f) => ({ ...f, competitors: f.competitors.slice(0, -1) }));
    }
  }

  async function suggestCompetitors() {
    if (!form.category || !form.city || preview) return;
    setSuggesting(true);
    try {
      const res = await fetch('/api/onboarding/suggest-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: form.category, city: form.city, businessName: form.businessName }),
      });
      if (res.ok) {
        const { competitors } = await res.json();
        if (Array.isArray(competitors) && competitors.length) setForm((f) => ({ ...f, competitors: competitors.filter((c: unknown): c is string => typeof c === 'string').slice(0, 3) }));
      }
    } catch { /* best-effort helper */ }
    setSuggesting(false);
  }

  async function finish() {
    if (preview) { setPreviewDone(true); return; }
    setSaving(true);
    setError('');
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: form.businessName.trim(),
        website: cleanSite(form.website),
        category: form.category.trim(),
        city: form.city.trim(),
        competitors: form.competitors,
        products: [],
        services: [],
        locations: [form.city.trim()],
        targetCustomers: [],
        markets: [],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setSaving(false); setError(data.error ?? 'We couldn’t create your business. Try again.'); return; }
    if (first) {
      // Request the first audit straight away; it waits for the founder to run it.
      await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: data.id }),
      }).catch(() => null);
      try { localStorage.removeItem(ONBOARDING_PREFILL_KEY); } catch { /* storage unavailable */ }
    }
    router.push(`/dashboard/projects/${data.id}`);
  }

  if (account.state === 'checking') {
    return (
      <div className="grid min-h-[60vh] place-items-center" aria-busy="true">
        <div className="flex flex-col items-center gap-4 text-center">
          <RingTile className="size-12 animate-pulse rounded-[14px]" ring="size-7" />
          <p className={`text-[15px] ${MUTED}`}>Setting up your account…</p>
        </div>
      </div>
    );
  }
  if (account.state === 'blocked') {
    return (
      <div className="mx-auto mt-16 max-w-[520px] text-center">
        <h1 className={`text-[28px] font-semibold tracking-[-0.03em] ${INK}`}>We can’t start a free audit here</h1>
        <p className={`mt-3 text-[16px] leading-relaxed ${MUTED}`}>{account.message}</p>
        {account.retry && <InkButton type="button" className="mt-6" onClick={() => window.location.reload()}>Refresh and try again</InkButton>}
      </div>
    );
  }

  const motionProps = reduce ? {} : { initial: { opacity: 0, y: dir * 18 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: dir * -18 } };
  const total = STEPS.length;

  return (
    <div className="grid min-h-[calc(100vh-120px)] gap-3 lg:grid-cols-2">
      {/* One question at a time */}
      <section className="flex flex-col rounded-[22px] bg-white px-6 py-8 ring-1 ring-[#e9e8f2] sm:px-12 sm:py-10">
        <div className="flex items-center justify-between">
          <RingTile className="size-9 rounded-[10px]" ring="size-5" />
          <span className={`text-[13px] font-medium tabular-nums ${FAINT}`}>{step + 1} / {total}</span>
        </div>
        <div className="mt-4 h-[3px] overflow-hidden rounded-full bg-[#eeeef5]">
          <motion.div className="h-full bg-brand" initial={false} animate={{ width: `${((step + 1) / total) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} />
        </div>

        <div className="flex flex-1 flex-col justify-center py-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={current.key} {...motionProps} transition={{ duration: 0.4, ease: EASE }}>
              <h1 className={`max-w-[14em] text-[clamp(30px,3.2vw,42px)] leading-[1.1] font-semibold tracking-[-0.035em] text-balance ${INK}`}>{current.question}</h1>
              {current.hint && <p className={`mt-3 text-[16px] ${FAINT}`}>{current.hint}</p>}

              {current.key !== 'review' ? (
                <>
                  {current.key === 'competitors' && form.competitors.length > 0 && (
                    <ul className="mt-8 flex flex-wrap gap-2">
                      {form.competitors.map((c) => (
                        <motion.li key={c} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: [0.94, 1.04, 1] }} transition={{ duration: 0.4, ease: EASE }}
                          className={`flex items-center gap-1.5 rounded-full bg-[#f1f0fe] py-1.5 pr-1.5 pl-3.5 text-[14.5px] font-medium ${INK}`}>
                          {c}
                          <button type="button" aria-label={`Remove ${c}`} onClick={() => setForm((f) => ({ ...f, competitors: f.competitors.filter((x) => x !== c) }))} className="grid size-6 place-items-center rounded-full text-[#5b567a] hover:bg-white"><X className="size-3.5" /></button>
                        </motion.li>
                      ))}
                    </ul>
                  )}
                  {!(current.key === 'competitors' && form.competitors.length >= 3) && (
                    <input
                      ref={input}
                      value={value(current.key)}
                      onChange={(e) => setValue(current.key, e.target.value)}
                      onKeyDown={onKey}
                      placeholder={current.placeholder}
                      inputMode={current.key === 'website' ? 'url' : undefined}
                      aria-label={current.question}
                      maxLength={current.key === 'website' ? 120 : 80}
                      className={`mt-8 w-full border-0 border-b-2 bg-transparent pb-3 text-[clamp(22px,2.2vw,28px)] font-medium tracking-[-0.02em] outline-none transition-colors placeholder:text-[#c5c3d6] ${INK} ${nudge ? 'border-[#d93036]' : 'border-[#e4e3f0] focus:border-brand'}`}
                    />
                  )}
                  {current.key === 'competitors' && (
                    <button type="button" onClick={suggestCompetitors} disabled={suggesting || preview}
                      className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand-deep disabled:opacity-50">
                      {suggesting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{suggesting ? 'Finding your rivals…' : 'Suggest them for me'}
                    </button>
                  )}
                </>
              ) : (
                <p className={`mt-8 max-w-[30em] text-[18px] leading-relaxed ${MUTED}`}>
                  We’ll ask AI what buyers of <b className={`font-semibold ${INK}`}>{form.category.trim()}</b> in <b className={`font-semibold ${INK}`}>{form.city.trim()}</b> ask,
                  and count how often it names <b className={`font-semibold ${INK}`}>{form.businessName.trim()}</b> against <b className={`font-semibold ${INK}`}>{form.competitors.join(', ')}</b>.
                  Your report lands within one working day{mode === 'another' ? '' : ', free'}.
                </p>
              )}
              {nudge && <p className="mt-3 text-[14px] text-[#d93036]" role="alert">{nudge}</p>}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-4">
          {step > 0 ? (
            <button type="button" onClick={back} className={`inline-flex items-center gap-1.5 rounded-[10px] px-2 py-2 text-[14.5px] font-semibold ${MUTED} hover:text-[#171425]`}><ArrowLeft className="size-4" />Back</button>
          ) : <span />}
          <div className="flex items-center gap-4">
            {current.key !== 'review' && <span className={`hidden items-center gap-1.5 text-[13px] sm:flex ${FAINT}`}>press Enter <CornerDownLeft className="size-3.5" /></span>}
            <InkButton type="button" onClick={next} disabled={saving}>
              {current.key === 'review' ? (saving ? 'Starting…' : mode === 'another' ? 'Add this business' : 'Start my free audit') : 'Continue'}
            </InkButton>
          </div>
        </div>
        {error && <p className="mt-4 text-[14px] text-[#d93036]" role="alert">{error}</p>}
        {previewDone && <p className="mt-4 text-[14px] text-brand-deep" role="status">Preview only: the real flow creates the business, requests the audit and opens its page.</p>}
      </section>

      {/* The answer, building as they type */}
      <aside className="hidden overflow-hidden rounded-[22px] bg-white p-2 ring-1 ring-[#e9e8f2] lg:block" aria-hidden="true">
        <AnswerStage form={form} step={step} />
      </aside>
    </div>
  );
}

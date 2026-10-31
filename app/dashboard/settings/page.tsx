'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useClerk } from '@clerk/nextjs';
import { Bell, Check, ShieldCheck, UserX } from 'lucide-react';
import { contactEmail } from '@/lib/marketing/contact';

export default function SettingsPage() {
  const { openUserProfile } = useClerk();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/account', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Could not load account');
        return data;
      })
      .then((data) => {
        if (!active) return;
        setEmail(data.email ?? '');
        setFullName(data.fullName ?? '');
        setCompany(data.companyName ?? '');
      })
      .catch((error: unknown) => {
        if (active) setProfileError(error instanceof Error ? error.message : 'Could not load account');
      });
    return () => { active = false; };
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setProfileError('');
    const response = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, companyName: company }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setProfileError(result.error ?? 'Could not save profile');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const initials = (fullName || email).trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const contact = contactEmail();
  const FIELD = 'mt-1.5 h-12 w-full rounded-[14px] bg-[#f4f4f7] px-4 text-[15px] text-[#171425] outline-none transition-[box-shadow,background-color] placeholder:text-[#9c9ab2] focus:bg-white focus:ring-2 focus:ring-brand disabled:opacity-70';

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <header className="px-1 pt-2 pb-6">
        <h1 className="text-[clamp(30px,3.2vw,44px)] leading-none font-semibold tracking-[-0.04em] text-[#171425]">Settings</h1>
        <p className="mt-3 text-[14.5px] text-[#524f6d]">Your profile, sign-in and account.</p>
      </header>

      <div className="grid gap-3 lg:grid-cols-12">
        <section className="flex flex-col items-center rounded-[24px] bg-[#121118] p-7 text-center text-white lg:col-span-4">
          <span className="grid size-20 place-items-center rounded-full bg-brand text-[26px] font-semibold">{initials}</span>
          <p className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">{fullName || 'Your name'}</p>
          <p className="mt-1 text-[13.5px] text-white/60">{email || '…'}</p>
          {company && <p className="mt-3 rounded-full bg-white/10 px-3 py-1 text-[12.5px] text-white/80">{company}</p>}
          <button type="button" onClick={() => openUserProfile()} className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13.5px] font-semibold text-[#121118]"><ShieldCheck className="size-4" />Sign-in and security</button>
        </section>

        <form onSubmit={saveProfile} className="rounded-[24px] bg-white p-7 lg:col-span-8">
          <p className="text-[15px] font-semibold text-[#171425]">Profile</p>
          <p className="mt-0.5 text-[13px] text-[#7d7a94]">Shown on your dashboard and in emails from us.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block text-[13.5px] font-semibold text-[#171425]">Full name<input className={FIELD} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
            <label className="block text-[13.5px] font-semibold text-[#171425]">Company <span className="font-normal text-[#7d7a94]">· optional</span><input className={FIELD} value={company} onChange={(e) => setCompany(e.target.value)} /></label>
            <label className="block text-[13.5px] font-semibold text-[#171425] sm:col-span-2">Email<input className={FIELD} value={email} disabled /><span className="mt-1.5 block text-[12.5px] font-normal text-[#7d7a94]">Change your sign-in email under Sign-in and security.</span></label>
          </div>
          {profileError && <p className="mt-4 text-[13.5px] text-[#c2352f]" role="alert">{profileError}</p>}
          <div className="mt-6 flex items-center gap-3">
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center rounded-full bg-[#121118] px-5 text-[13.5px] font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save profile'}</button>
            {saved && <span className="inline-flex items-center gap-1.5 text-[13.5px] text-presence"><Check className="size-4" />Saved</span>}
          </div>
        </form>

        <section className="rounded-[24px] bg-white p-7 lg:col-span-6">
          <span className="grid size-10 place-items-center rounded-full bg-[#f2f1f5] text-[#171425]"><Bell className="size-[18px]" /></span>
          <p className="mt-4 text-[15px] font-semibold text-[#171425]">Emails from us</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#524f6d]">We email {email || 'you'} when a report is ready and when a re-check finishes. Only about your businesses, never marketing lists.</p>
        </section>

        <section className="rounded-[24px] bg-white p-7 lg:col-span-6">
          <span className="grid size-10 place-items-center rounded-full bg-[#fdecec] text-[#c2352f]"><UserX className="size-[18px]" /></span>
          <p className="mt-4 text-[15px] font-semibold text-[#171425]">Close your account</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#524f6d]">We delete your businesses, reports and profile, and confirm by email.</p>
          {contact ? (
            <a href={`mailto:${contact}?subject=${encodeURIComponent('Close my BrandPulse account')}&body=${encodeURIComponent(`Please close the account for ${email}.`)}`} className="mt-5 inline-flex h-10 items-center rounded-full bg-[#f4f3f7] px-4 text-[13.5px] font-semibold text-[#c2352f]! no-underline hover:bg-[#fdecec]">Ask us to close it</a>
          ) : <p className="mt-4 text-[13px] text-[#7d7a94]">Reply to any email from us to ask.</p>}
        </section>
      </div>
    </div>
  );
}

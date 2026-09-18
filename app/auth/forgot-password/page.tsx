'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRecaptcha } from '@/hooks/useRecaptcha';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { getToken, verifying } = useRecaptcha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email) {
      setError('Email is required.');
      setIsLoading(false);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    const isHuman = await getToken('forgot_password');
    if (!isHuman) {
      setError('Security verification failed. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || '';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      });
      if (resetError) throw resetError;
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      // Don't leak whether the email exists — generic confirmation
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* ── LEFT PANEL — editorial / decorative ──────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-slate-950 flex-col justify-between p-14 overflow-hidden">
        <Image
          src="/hero_home_poster.jpg"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="52vw"
          quality={75}
        />
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

        <div
          aria-hidden="true"
          className="absolute -right-6 bottom-0 font-serif italic text-white/[0.035] leading-none pointer-events-none select-none"
          style={{ fontSize: 'clamp(10rem, 22vw, 22rem)' }}
        >
          R
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-px bg-blue-400" />
          <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">HairBudget</span>
        </div>

        <div className="relative z-10">
          <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-500 mb-6">Account Recovery</p>
          <h2
            className="font-serif italic text-white leading-[0.9]"
            style={{ fontSize: 'clamp(2.8rem, 4.5vw, 5rem)' }}
          >
            Locked out?<br />
            <span className="text-blue-400">We&apos;ve got you.</span>
          </h2>
          <p className="text-slate-400 text-sm font-light mt-8 max-w-xs leading-relaxed">
            Drop your email and we&apos;ll send a secure link to reset your password.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ───────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-16 xl:px-24 py-16 bg-white">
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="w-6 h-px bg-blue-400" />
          <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">HairBudget</span>
        </div>

        <div className="max-w-sm w-full mx-auto lg:mx-0">
          {isSubmitted ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6">
                <i className="ri-mail-send-line text-2xl text-blue-600" />
              </div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-400 mb-4">Reset Sent</p>
              <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 italic mb-2 leading-tight">
                Check your<br />
                <span className="text-slate-400 font-light">inbox</span>
              </h1>
              <p className="text-slate-500 text-sm font-light mb-8 leading-relaxed">
                If an account exists for <span className="font-serif italic text-slate-700">{email}</span>, a
                password reset link is on its way. The link expires in 60 minutes.
              </p>
              <p className="text-xs text-slate-400 mb-8">
                Didn&apos;t see it? Check your spam folder or{' '}
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-slate-900 hover:text-blue-600 font-bold transition-colors"
                >
                  try again
                </button>
                .
              </p>

              <Link
                href="/auth/login"
                className="group relative inline-flex w-full items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 text-[11px] font-black tracking-[0.3em] uppercase overflow-hidden"
              >
                <span className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
                <span className="relative z-10 flex items-center gap-3">
                  Back to Sign In <i className="ri-arrow-right-line" />
                </span>
              </Link>
            </>
          ) : (
            <>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-400 mb-4">Forgot Password</p>
              <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 italic mb-2 leading-tight">
                Reset<br />
                <span className="text-slate-400 font-light">Password</span>
              </h1>
              <p className="text-slate-400 text-sm font-light mb-10">
                Enter your email and we&apos;ll send you a secure reset link.
              </p>

              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
                  <i className="ri-error-warning-line flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-7">
                <div>
                  <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pb-3 border-b bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-400 ${
                      error ? 'border-red-400' : 'border-slate-200 focus:border-slate-900'
                    }`}
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || verifying}
                  className="w-full bg-slate-900 hover:bg-slate-700 text-white py-4 rounded-xl font-bold text-xs tracking-[0.25em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading || verifying ? (
                    <>
                      <i className="ri-loader-4-line animate-spin" /> {verifying ? 'Verifying…' : 'Sending…'}
                    </>
                  ) : (
                    <>
                      Send Reset Link <i className="ri-arrow-right-line" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-400">
                Remembered it?{' '}
                <Link href="/auth/login" className="text-slate-900 hover:text-slate-600 font-bold transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 hover:text-slate-600 transition-colors"
            >
              <i className="ri-arrow-left-line mr-1" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

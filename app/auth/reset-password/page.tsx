'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';

/**
 * Landing page for the password-reset email link.
 * Supabase appends an access token to the URL hash and the JS client
 * picks it up automatically, exchanging it for a recovery session.
 * From there we just call updateUser({ password }).
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authReady, setAuthReady] = useState<'loading' | 'ready' | 'invalid'>('loading');

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setAuthReady('ready');
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) setAuthReady('ready');
      else
        setTimeout(() => {
          setAuthReady((prev) => (prev === 'loading' ? 'invalid' : prev));
        }, 1500);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 2500);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Could not update your password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* ── LEFT PANEL ─────────────────────────────────── */}
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
          K
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-px bg-blue-400" />
          <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">HairBudget</span>
        </div>

        <div className="relative z-10">
          <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-500 mb-6">New Password</p>
          <h2
            className="font-serif italic text-white leading-[0.9]"
            style={{ fontSize: 'clamp(2.8rem, 4.5vw, 5rem)' }}
          >
            One last<br />
            <span className="text-blue-400">step.</span>
          </h2>
          <p className="text-slate-400 text-sm font-light mt-8 max-w-xs leading-relaxed">
            Pick a strong new password and you&apos;re back in.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-16 xl:px-24 py-16 bg-white">
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="w-6 h-px bg-blue-400" />
          <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">HairBudget</span>
        </div>

        <div className="max-w-sm w-full mx-auto lg:mx-0">
          {authReady === 'loading' ? (
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <i className="ri-loader-4-line animate-spin text-lg" />
              Verifying your reset link…
            </div>
          ) : authReady === 'invalid' ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-6">
                <i className="ri-close-line text-2xl text-red-500" />
              </div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-400 mb-4">Link Expired</p>
              <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 italic mb-2 leading-tight">
                Reset link<br />
                <span className="text-slate-400 font-light">no longer valid</span>
              </h1>
              <p className="text-slate-500 text-sm font-light mb-8 leading-relaxed">
                The link may have expired or already been used. Please request a fresh one.
              </p>
              <Link
                href="/auth/forgot-password"
                className="group relative inline-flex w-full items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 text-[11px] font-black tracking-[0.3em] uppercase overflow-hidden"
              >
                <span className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
                <span className="relative z-10 flex items-center gap-3">
                  Request New Link <i className="ri-arrow-right-line" />
                </span>
              </Link>
            </>
          ) : done ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6">
                <i className="ri-shield-check-line text-2xl text-blue-600" />
              </div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-400 mb-4">Password Updated</p>
              <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 italic mb-2 leading-tight">
                You&apos;re all<br />
                <span className="text-slate-400 font-light">set.</span>
              </h1>
              <p className="text-slate-500 text-sm font-light">Redirecting you to sign in…</p>
            </>
          ) : (
            <>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-400 mb-4">New Password</p>
              <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 italic mb-2 leading-tight">
                Set a new<br />
                <span className="text-slate-400 font-light">password</span>
              </h1>
              <p className="text-slate-400 text-sm font-light mb-10">
                Choose something strong — at least 8 characters.
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
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pb-3 border-b border-slate-200 focus:border-slate-900 bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-400 pr-8"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 bottom-3 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-lg`} />
                    </button>
                  </div>
                  <PasswordStrengthMeter password={password} />
                </div>

                <div>
                  <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full pb-3 border-b border-slate-200 focus:border-slate-900 bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-400 pr-8"
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-0 bottom-3 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <i className={`${showConfirm ? 'ri-eye-off-line' : 'ri-eye-line'} text-lg`} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 hover:bg-slate-700 text-white py-4 rounded-xl font-bold text-xs tracking-[0.25em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin" /> Updating…
                    </>
                  ) : (
                    <>
                      Update Password <i className="ri-arrow-right-line" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/auth/login"
              className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 hover:text-slate-600 transition-colors"
            >
              <i className="ri-arrow-left-line mr-1" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

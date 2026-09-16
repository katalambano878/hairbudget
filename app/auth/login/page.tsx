'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRecaptcha } from '@/hooks/useRecaptcha';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const { getToken, verifying } = useRecaptcha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setAuthError('');
    setIsLoading(true);

    const newErrors: any = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    const isHuman = await getToken('login');
    if (!isHuman) {
      setAuthError('Security verification failed. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.session) {
        router.push('/account');
        router.refresh();
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthError(error.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">

      {/* ── LEFT PANEL — editorial / decorative ──────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-slate-950 flex-col justify-between p-14 overflow-hidden">
        <Image
          src="/hero_portrait.jpg"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="52vw"
          quality={75}
        />
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

        {/* Ghost letter */}
        <div
          aria-hidden="true"
          className="absolute -right-6 bottom-0 font-serif italic text-white/[0.035] leading-none pointer-events-none select-none"
          style={{ fontSize: 'clamp(10rem, 22vw, 22rem)' }}
        >W</div>

        {/* Brand eyebrow */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-px bg-blue-400" />
          <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">HairBudget</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-500 mb-6">Member Access</p>
          <h2 className="font-serif italic text-white leading-[0.9]" style={{ fontSize: 'clamp(2.8rem, 4.5vw, 5rem)' }}>
            Your Style,<br />
            <span className="text-blue-400">Your Way.</span>
          </h2>
          <p className="text-slate-400 text-sm font-light mt-8 max-w-xs leading-relaxed">
            Sign in to access your orders, wishlist, and exclusive deals.
          </p>
        </div>

      </div>

      {/* ── RIGHT PANEL — form ───────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-16 xl:px-24 py-16 bg-white">

        {/* Mobile brand */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="w-6 h-px bg-blue-400" />
          <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">HairBudget</span>
        </div>

        <div className="max-w-sm w-full mx-auto lg:mx-0">

          <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-300 mb-4">Sign In</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 italic mb-2 leading-tight">
            Welcome<br />
            <span className="text-slate-300 font-light">Back</span>
          </h1>
          <p className="text-slate-400 text-sm font-light mb-10">Sign in to your account to continue.</p>

          {authError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
              <i className="ri-error-warning-line flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-7">

            {/* Email */}
            <div>
              <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full pb-3 border-b bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-300 ${
                  errors.email ? 'border-red-400' : 'border-slate-200 focus:border-slate-900'
                }`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-xs text-red-500 mt-2">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[9px] font-bold tracking-wider uppercase text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pb-3 border-b bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-300 pr-8 ${
                    errors.password ? 'border-red-400' : 'border-slate-200 focus:border-slate-900'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 bottom-3 text-slate-300 hover:text-slate-700 transition-colors"
                >
                  <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-lg`} />
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-2">{errors.password}</p>}
            </div>

            {/* Remember me — custom checkbox */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  formData.rememberMe ? 'bg-slate-900 border-slate-900' : 'border-slate-300 group-hover:border-slate-500'
                }`}
              >
                {formData.rememberMe && <i className="ri-check-line text-white text-[10px]" />}
              </div>
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                className="sr-only"
              />
              <span className="text-sm text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || verifying}
              className="w-full bg-slate-900 hover:bg-slate-700 text-white py-4 rounded-xl font-bold text-xs tracking-[0.25em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading || verifying ? (
                <><i className="ri-loader-4-line animate-spin" /> {verifying ? 'Verifying…' : 'Signing in…'}</>
              ) : (
                <>Sign In <i className="ri-arrow-right-line" /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-slate-900 hover:text-slate-600 font-bold transition-colors">
              Create one now
            </Link>
          </p>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-300 hover:text-slate-600 transition-colors"
            >
              <i className="ri-arrow-left-line mr-1" />Back to Home
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}

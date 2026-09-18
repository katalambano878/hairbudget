'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { supabase } from '@/lib/supabase';
import { useRecaptcha } from '@/hooks/useRecaptcha';

function getFriendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('email rate limit exceeded') || lower.includes('over_email_send_rate_limit')) {
    return 'Our system is experiencing high demand. Please wait a few minutes and try again, or contact us for help.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('password') && lower.includes('weak')) {
    return 'Your password is too weak. Please use at least 8 characters with a mix of letters, numbers, and symbols.';
  }
  if (lower.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Connection error. Please check your internet and try again.';
  }
  return message;
}

export default function SignupPage() {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    newsletter: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [success, setSuccess] = useState(false);
  const { getToken, verifying } = useRecaptcha();

  useEffect(() => {
    if (authError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setAuthError('');
    setIsLoading(true);

    const newErrors: any = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    const isHuman = await getToken('signup');
    if (!isHuman) {
      setAuthError('Security verification failed. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            newsletter: formData.newsletter,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'welcome',
            payload: {
              email: formData.email,
              firstName: formData.firstName,
            },
          }),
        }).catch((err) => console.error('Welcome notification error:', err));

        if (!data.session) {
          setSuccess(true);
        } else {
          router.push('/account');
          router.refresh();
        }
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setAuthError(getFriendlyError(err.message || 'Failed to sign up. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex">
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
            ✓
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-8 h-px bg-blue-400" />
            <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">HairBudget</span>
          </div>

          <div className="relative z-10">
            <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-500 mb-6">Welcome aboard</p>
            <h2
              className="font-serif italic text-white leading-[0.9]"
              style={{ fontSize: 'clamp(2.8rem, 4.5vw, 5rem)' }}
            >
              You&apos;re<br />
              <span className="text-blue-400">in.</span>
            </h2>
            <p className="text-slate-400 text-sm font-light mt-8 max-w-xs leading-relaxed">
              One small step left — verify your email and start shopping with us.
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-16 xl:px-24 py-16 bg-white">
          <div className="max-w-sm w-full mx-auto lg:mx-0">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6">
              <i className="ri-mail-send-line text-2xl text-blue-600" />
            </div>
            <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-400 mb-4">Verify Email</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 italic mb-4 leading-tight">
              Check your<br />
              <span className="text-slate-400 font-light">inbox</span>
            </h1>
            <p className="text-slate-500 text-sm font-light mb-8 leading-relaxed">
              We&apos;ve sent a confirmation link to{' '}
              <span className="font-serif italic text-slate-700">{formData.email}</span>. Click it to activate
              your HairBudget account.
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
          </div>
        </div>
      </main>
    );
  }

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
          C
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-px bg-blue-400" />
          <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">HairBudget</span>
        </div>

        <div className="relative z-10">
          <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-cream/80 mb-6">Join HairBudget</p>
          <h2
            className="font-serif italic text-white leading-[0.9]"
            style={{ fontSize: 'clamp(2.8rem, 4.5vw, 5rem)' }}
          >
            Crowns made<br />
            <span className="text-blue-400">for you.</span>
          </h2>
          <p className="text-slate-400 text-sm font-light mt-8 max-w-xs leading-relaxed">
            Save your favourites, track orders, and unlock member-only drops.
          </p>

          <div className="mt-10 flex items-center gap-4 text-[10px] font-bold tracking-[0.25em] uppercase text-slate-400">
            <span className="flex items-center gap-2">
              <i className="ri-shield-check-line text-blue-400" /> Secure
            </span>
            <span className="w-px h-3 bg-slate-700" />
            <span className="flex items-center gap-2">
              <i className="ri-truck-line text-blue-400" /> Free Delivery*
            </span>
            <span className="w-px h-3 bg-slate-700" />
            <span className="flex items-center gap-2">
              <i className="ri-gift-line text-blue-400" /> Member Perks
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-16 xl:px-24 py-16 bg-white">
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="w-6 h-px bg-blue-400" />
          <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">HairBudget</span>
        </div>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-400 mb-4">Create Account</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 italic mb-2 leading-tight">
            Start your<br />
            <span className="text-slate-400 font-light">journey</span>
          </h1>
          <p className="text-slate-400 text-sm font-light mb-10">It only takes a minute.</p>

          {authError && (
            <div
              ref={errorRef}
              className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6"
            >
              <i className="ri-error-warning-line flex-shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Name row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={`w-full pb-3 border-b bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-400 ${
                    errors.firstName ? 'border-red-400' : 'border-slate-200 focus:border-slate-900'
                  }`}
                  placeholder="Ama"
                />
                {errors.firstName && <p className="text-xs text-red-500 mt-2">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={`w-full pb-3 border-b bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-400 ${
                    errors.lastName ? 'border-red-400' : 'border-slate-200 focus:border-slate-900'
                  }`}
                  placeholder="Mensah"
                />
                {errors.lastName && <p className="text-xs text-red-500 mt-2">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full pb-3 border-b bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-400 ${
                  errors.email ? 'border-red-400' : 'border-slate-200 focus:border-slate-900'
                }`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-xs text-red-500 mt-2">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full pb-3 border-b bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-400 ${
                  errors.phone ? 'border-red-400' : 'border-slate-200 focus:border-slate-900'
                }`}
                placeholder="+233 XX XXX XXXX"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-2">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pb-3 border-b bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-400 pr-8 ${
                    errors.password ? 'border-red-400' : 'border-slate-200 focus:border-slate-900'
                  }`}
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
              <PasswordStrengthMeter password={formData.password} />
              {errors.password && <p className="text-xs text-red-500 mt-2">{errors.password}</p>}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full pb-3 border-b bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-400 pr-8 ${
                    errors.confirmPassword ? 'border-red-400' : 'border-slate-200 focus:border-slate-900'
                  }`}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 bottom-3 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <i className={`${showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-lg`} />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-2">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Newsletter */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  formData.newsletter
                    ? 'bg-slate-900 border-slate-900'
                    : 'border-slate-300 group-hover:border-slate-500'
                }`}
              >
                {formData.newsletter && <i className="ri-check-line text-white text-[10px]" />}
              </div>
              <input
                type="checkbox"
                checked={formData.newsletter}
                onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
                className="sr-only"
              />
              <span className="text-sm text-slate-500 group-hover:text-slate-700 transition-colors leading-relaxed">
                Send me styling tips and member-only drops.
              </span>
            </label>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    formData.acceptTerms
                      ? 'bg-slate-900 border-slate-900'
                      : errors.acceptTerms
                      ? 'border-red-400'
                      : 'border-slate-300 group-hover:border-slate-500'
                  }`}
                >
                  {formData.acceptTerms && <i className="ri-check-line text-white text-[10px]" />}
                </div>
                <input
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                  className="sr-only"
                />
                <span className="text-sm text-slate-500 group-hover:text-slate-700 transition-colors leading-relaxed">
                  I agree to the{' '}
                  <Link
                    href="/terms"
                    className="text-slate-900 font-bold hover:text-blue-600 transition-colors"
                  >
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/privacy"
                    className="text-slate-900 font-bold hover:text-blue-600 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {errors.acceptTerms && <p className="text-xs text-red-500 mt-2">{errors.acceptTerms}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading || verifying}
              className="w-full bg-slate-900 hover:bg-slate-700 text-white py-4 rounded-xl font-bold text-xs tracking-[0.25em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading || verifying ? (
                <>
                  <i className="ri-loader-4-line animate-spin" />{' '}
                  {verifying ? 'Verifying…' : 'Creating account…'}
                </>
              ) : (
                <>
                  Create Account <i className="ri-arrow-right-line" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Already a member?{' '}
            <Link href="/auth/login" className="text-slate-900 hover:text-slate-600 font-bold transition-colors">
              Sign in
            </Link>
          </p>

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

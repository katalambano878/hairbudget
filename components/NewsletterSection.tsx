"use client";

import { useState } from 'react';
import Image from 'next/image';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSubmitStatus('success');
      setEmail('');
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Section heading above the card ─────────────────── */}
        <div className="text-center mb-10 md:mb-14">
          <span className="inline-flex items-center gap-2 text-slate-500 text-xs tracking-[0.35em] uppercase font-semibold mb-3">
            <span className="w-5 h-[1px] bg-slate-400" />
            Stay in the Loop
            <span className="w-5 h-[1px] bg-slate-400" />
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-gray-900 leading-tight">
            Join the{' '}
            <span className="italic font-light text-slate-500">HairBudget</span>{' '}
            List
          </h2>
        </div>

        {/* ── Split editorial card ────────────────────────────── */}
        <div className="relative bg-slate-950 rounded-[28px] overflow-hidden shadow-[0_24px_80px_-24px_rgba(0,0,0,0.35)]">
          <div className="grid lg:grid-cols-2">
            {/* ── LEFT: editorial image panel ─────────────────── */}
            <div className="relative h-64 sm:h-80 lg:h-auto lg:min-h-[520px] overflow-hidden">
              <Image
                src="/hero_portrait.jpg"
                alt="HairBudget member"
                fill
                className="object-cover object-center scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
                quality={85}
              />

              {/* Cinematic overlay stack */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/40 via-slate-950/10 to-slate-950/60" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-950 lg:via-slate-950/0 lg:to-slate-950" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent lg:bg-none" />

              {/* Floating 10% badge — small editorial seal */}
              <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
                <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center rotate-[-8deg]">
                  {/* Rotating ring label */}
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full animate-slow-spin">
                    <defs>
                      <path
                        id="circlePath"
                        d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
                      />
                    </defs>
                    <text className="fill-blue-400 text-[8px] tracking-[0.35em] font-bold uppercase">
                      <textPath href="#circlePath">
                        Members Only · Members Only ·
                      </textPath>
                    </text>
                  </svg>
                  {/* Inner stamp */}
                  <div className="absolute inset-3 rounded-full border border-blue-400/40 flex flex-col items-center justify-center backdrop-blur-sm bg-slate-950/30">
                    <span className="font-serif italic text-blue-400 text-2xl md:text-3xl leading-none">10%</span>
                    <span className="text-blue-400/80 text-[8px] font-black tracking-[0.2em] uppercase mt-0.5">Off</span>
                  </div>
                </div>
              </div>

              {/* Bottom-left caption */}
              <div className="absolute bottom-5 left-6 md:bottom-6 md:left-8 z-10 flex items-center gap-2.5">
                <span className="w-6 h-px bg-blue-400/70" />
                <span className="text-blue-400/90 text-[9px] font-black tracking-[0.5em] uppercase">
                  The Inner Circle
                </span>
              </div>
            </div>

            {/* ── RIGHT: form panel ───────────────────────────── */}
            <div className="relative px-6 sm:px-10 lg:px-14 py-10 md:py-14 flex flex-col justify-center">
              {/* Decorative glow */}
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/[0.06] rounded-full blur-3xl pointer-events-none" />

              {/* Film grain */}
              <div
                className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage:
                    'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                }}
              />

              <div className="relative z-10">
                {submitStatus === 'success' ? (
                  <div className="flex flex-col items-start gap-4 py-2 animate-[fadeIn_0.6s_ease]">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400/20 to-blue-600/5 border border-blue-400/30 flex items-center justify-center">
                      <i className="ri-checkbox-circle-fill text-blue-400 text-2xl" />
                    </div>
                    <h3 className="font-serif text-white text-3xl md:text-4xl leading-tight">
                      You&apos;re in.
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                      Check your inbox — your <span className="text-blue-400 font-semibold">10% code</span> is on its way. Welcome to the HairBudget inner circle.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmitStatus('idle')}
                      className="mt-2 text-slate-500 hover:text-blue-400 text-[11px] font-black tracking-[0.3em] uppercase transition-colors"
                    >
                      <i className="ri-arrow-left-line mr-1" /> Back
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Eyebrow */}
                    <div className="inline-flex items-center gap-2.5 mb-5">
                      <span className="w-5 h-px bg-blue-400/60" />
                      <span className="text-blue-400/80 text-[9px] font-black tracking-[0.5em] uppercase">
                        Newsletter
                      </span>
                    </div>

                    {/* Heading */}
                    <h3 className="font-serif text-white text-[2rem] sm:text-4xl md:text-[2.5rem] leading-[1.1] tracking-tight mb-5">
                      Exclusive drops,{' '}
                      <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600">
                        delivered first.
                      </span>
                    </h3>

                    <p className="text-slate-400 text-sm md:text-[15px] font-light leading-relaxed mb-8 max-w-md">
                      Early access to new wig arrivals, restocks, and member-only prices — plus 10% off your first order. No spam, just hair inspiration.
                    </p>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="relative group">
                        <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 text-base transition-colors duration-300" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-12 pr-4 py-4 bg-slate-900/70 border border-slate-800 rounded-2xl text-white placeholder:text-brand-cream/50 text-sm font-medium focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/10 transition-all duration-300"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="group relative w-full inline-flex items-center justify-center gap-3 bg-blue-500 text-slate-950 px-7 py-4 rounded-2xl font-black text-[11px] tracking-[0.3em] uppercase overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.5)]"
                      >
                        {/* Hover fill */}
                        <span className="absolute inset-0 bg-blue-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
                        <span className="relative z-10 whitespace-nowrap">
                          {isSubmitting ? (
                            <span className="inline-flex items-center gap-2.5">
                              <i className="ri-loader-4-line animate-spin text-sm" /> Joining…
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2.5">
                              Claim My 10% Off
                              <i className="ri-arrow-right-up-line text-sm group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                            </span>
                          )}
                        </span>
                      </button>

                      {submitStatus === 'error' && (
                        <p className="text-red-400 text-xs flex items-center gap-2 pt-1">
                          <i className="ri-error-warning-line" /> Something went wrong. Please try again.
                        </p>
                      )}
                    </form>

                    {/* Trust row */}
                    <div className="mt-8 pt-6 border-t border-slate-800/70 grid grid-cols-3 gap-3">
                      {[
                        { icon: 'ri-shield-check-line', label: 'No spam, ever' },
                        { icon: 'ri-lock-line', label: 'Unsubscribe anytime' },
                        { icon: 'ri-gift-line', label: '10% first order' },
                      ].map((t) => (
                        <div key={t.label} className="flex flex-col items-center sm:flex-row sm:justify-start gap-1.5 sm:gap-2">
                          <i className={`${t.icon} text-blue-400/70 text-base`} />
                          <span className="text-slate-500 text-[10px] sm:text-[11px] text-center sm:text-left font-medium tracking-wide leading-tight">
                            {t.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footnote */}
                    <p className="text-slate-600 text-[10px] font-light tracking-wide mt-6 leading-relaxed">
                      By subscribing, you agree to receive marketing emails from HairBudget. You can unsubscribe at any time.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local keyframes */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { publicAsset } from '@/lib/assets';

export type PageHeroStat = { value: string; label: string };

type PageHeroProps = {
  image?: string;
  imageAlt?: string;
  eyebrow: string;
  title: ReactNode;
  description?: string;
  stats?: PageHeroStat[];
  minHeightClass?: string;
  ghostLetter?: string;
  breadcrumb?: { label: string; href?: string }[];
  children?: ReactNode;
};

export default function PageHero({
  image,
  imageAlt = '',
  eyebrow,
  title,
  description,
  stats,
  minHeightClass = 'min-h-[42vh] md:min-h-[48vh]',
  ghostLetter,
  breadcrumb,
  children,
}: PageHeroProps) {
  return (
    <section className={`relative overflow-hidden bg-brand-deep ${minHeightClass}`}>
      {image ? (
        <Image
          src={publicAsset(image)}
          alt={imageAlt}
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          quality={85}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-deep via-brand-forest to-brand-deep" />
      )}

      <div className="absolute inset-0 bg-brand-deep/78 z-0" />
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent z-20" />

      {ghostLetter ? (
        <div
          aria-hidden="true"
          className="absolute -right-6 -top-4 leading-none pointer-events-none select-none font-serif italic text-brand-ivory/[0.04] z-10"
          style={{ fontSize: 'clamp(10rem, 28vw, 22rem)' }}
        >
          {ghostLetter}
        </div>
      ) : null}

      <div className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 flex flex-col justify-center ${minHeightClass}`}>
        <div className="flex items-center justify-between gap-4 mb-8 md:mb-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-px bg-brand-gold" />
            <span className="text-brand-gold text-[9px] font-black tracking-[0.45em] uppercase">
              {eyebrow}
            </span>
          </div>
          {breadcrumb && breadcrumb.length > 0 ? (
            <div className="hidden sm:flex items-center gap-2 text-[10px] tracking-widest uppercase text-brand-cream/70">
              {breadcrumb.map((crumb, i) => (
                <span key={crumb.label} className="flex items-center gap-2">
                  {i > 0 ? <i className="ri-arrow-right-s-line text-brand-gold/80 text-xs" /> : null}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-brand-ivory transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-brand-ivory">{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-12">
          <div className="max-w-xl">
            <div className="font-serif text-white leading-[1.08] tracking-tight">{title}</div>
            {description ? (
              <p className="text-brand-cream/95 text-sm md:text-base font-normal leading-relaxed mt-4 max-w-md drop-shadow-sm">
                {description}
              </p>
            ) : null}
            {children}
          </div>

          {stats && stats.length > 0 ? (
            <div className="hidden sm:flex items-center gap-6 lg:gap-8 lg:pb-1">
              {stats.map((s, i) => (
                <div key={s.label} className="flex items-center gap-6 lg:gap-8">
                  <div>
                    <div className="text-2xl font-bold text-brand-ivory tracking-tight font-serif">{s.value}</div>
                    <div className="text-[9px] font-bold tracking-[0.3em] uppercase text-brand-gold mt-0.5">
                      {s.label}
                    </div>
                  </div>
                  {i < stats.length - 1 ? (
                    <div className="w-px h-8 bg-brand-ivory/20 hidden sm:block" />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent" />
    </section>
  );
}

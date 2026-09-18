'use client';

import Link from 'next/link';
import { useState } from 'react';
import PageHero from '@/components/PageHero';
import FounderSection from '@/components/FounderSection';
import { useCMS } from '@/context/CMSContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import WhatsAppButton from '@/components/WhatsAppButton';
import { BRAND } from '@/lib/brand';

export default function AboutPage() {
  usePageTitle('Our Story');
  const { getSetting } = useCMS();
  const [activeTab, setActiveTab] = useState('story');

  const siteName = getSetting('site_name') || BRAND.name;

  const values = [
    {
      icon: 'ri-price-tag-3-line',
      title: 'Affordability Without Compromise',
      description: 'Every woman deserves beautiful, high-quality hair at prices that respect her budget.',
    },
    {
      icon: 'ri-verified-badge-line',
      title: 'Quality You Can Trust',
      description: 'We are committed to offering durable, authentic hair products that meet a high standard every time.',
    },
    {
      icon: 'ri-customer-service-2-line',
      title: 'Customer First',
      description: 'Our customers are at the heart of everything we do. We listen, support, and deliver with care.',
    },
    {
      icon: 'ri-heart-line',
      title: 'Confidence & Empowerment',
      description: 'We exist to help women feel confident, bold, and beautiful in their everyday lives.',
    },
    {
      icon: 'ri-eye-line',
      title: 'Transparency & Honesty',
      description: 'We build trust through clear communication, fair pricing, and genuine product representation.',
    },
    {
      icon: 'ri-user-star-line',
      title: 'Style for Every Woman',
      description: 'We celebrate diversity by offering hair options that suit different tastes, identities, and lifestyles.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageHero
        image="/hero_about.jpg"
        imageAlt="HairBudget — our story since 2017"
        eyebrow="Who We Are"
        ghostLetter="H"
        minHeightClass="min-h-[58vh] md:min-h-[68vh]"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'About' },
        ]}
        title={
          <h1 className="italic leading-[0.95] drop-shadow-xl">
            <span className="block text-brand-ivory" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>Our</span>
            <span className="block text-brand-gold" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>Story</span>
            <span className="block text-brand-cream mt-2 font-medium not-italic" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
              {BRAND.tagline}
            </span>
          </h1>
        }
        description="Quality wigs, extensions and braiding hair at budget-friendly prices — retail and wholesale from Adenta since 2017."
      />

      <div className="relative z-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex justify-center gap-4">
            {[
              { key: 'story', label: 'Our Story' },
              { key: 'mission', label: 'Mission & Values' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 text-[10px] font-black tracking-[0.35em] uppercase border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'border-brand-forest text-brand-forest'
                    : 'border-transparent text-brand-taupe hover:text-brand-mid'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        {activeTab === 'story' && (
          <div className="max-w-3xl mx-auto">
            <div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-gold mb-5">Est. 2017</p>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] text-brand-ink mb-10 leading-[1.05]">
                How It All <span className="font-serif italic font-light text-brand-mid">Started</span>
              </h2>
              <div className="space-y-6 text-brand-mid text-base font-light leading-[1.85] border-l-2 border-brand-gold pl-6">
                <p>
                  <strong className="text-brand-ink font-semibold">{siteName}</strong> was founded in 2017 with a simple but powerful vision: to make high-quality women&apos;s hair accessible to every woman without the burden of excessive pricing.
                </p>
                <p>
                  What began as a passion-driven venture has grown into a trusted hair hub known for offering stylish, durable, and affordable hair solutions.
                </p>
                <p>
                  At HairBudget, we understand that hair is more than just beauty — it is a form of self-expression and confidence. That is why we carefully source and provide a wide range of hair products that cater to different styles, preferences, and occasions, ensuring every woman can find something that fits her look and lifestyle.
                </p>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'mission' && (
          <div className="space-y-10">
            <div className="bg-brand-forest p-10 rounded-2xl relative overflow-hidden">
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-gold mb-3">Our Mission</p>
              <h3 className="font-serif text-3xl italic text-brand-ivory mb-5">Help women look and feel their best</h3>
              <p className="text-brand-cream leading-relaxed text-sm max-w-3xl">
                HairBudget is committed to making high-quality women&apos;s hair accessible and affordable for every woman. We strive to provide a wide range of stylish, durable, and competitively priced hair products while delivering exceptional customer service. Our mission is to empower confidence and beauty by helping women look and feel their best without compromising on quality or budget.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-8 text-brand-ivory text-sm">
                {['Quality and Variety', 'Competitive pricing', 'Expert Guidance', 'Experienced Team'].map((item) => (
                  <p key={item} className="flex items-center gap-2">
                    <i className="ri-checkbox-circle-fill text-brand-gold" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <FounderSection />

      <div className="bg-white py-24 border-t border-brand-gold/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-forest mb-3">The Foundation</p>
            <h2 className="font-serif text-4xl lg:text-5xl italic text-brand-ink leading-[1.05]">
              Our Core Values
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-brand-gold/50">
            {values.map((value, i) => (
              <div key={i} className="bg-white p-8">
                <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-forest/50 mb-6">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <div className="w-10 h-10 rounded-lg bg-brand-forest flex items-center justify-center mb-6">
                  <i className={`${value.icon} text-xl text-brand-ivory`} />
                </div>
                <h3 className="font-serif text-xl italic text-brand-ink mb-3">{value.title}</h3>
                <p className="text-brand-forest text-xs leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white py-24 border-t border-brand-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-gold mb-3">Ready?</p>
              <h2 className="font-serif text-4xl lg:text-5xl text-brand-ink italic leading-[1.05]">
                Shop smarter,<br />
                <span className="text-brand-mid">not harder.</span>
              </h2>
              <p className="text-brand-mid text-sm font-light mt-5 max-w-sm leading-relaxed">
                Browse wigs, extensions, bundles and shapewear — or WhatsApp us for wholesale.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center gap-3 bg-brand-forest hover:bg-brand-deep text-brand-ivory px-10 py-5 rounded-xl font-bold text-xs tracking-[0.25em] uppercase transition-colors"
              >
                Start Shopping <i className="ri-arrow-right-line" />
              </Link>
              <WhatsAppButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

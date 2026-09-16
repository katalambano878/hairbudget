"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import WhatsAppButton from '@/components/WhatsAppButton';
import { BRAND, whatsappHref } from '@/lib/brand';

export default function ContactPage() {
  usePageTitle('Contact Us');
  const [pageContent, setPageContent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { getToken, verifying } = useRecaptcha();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    async function fetchContactContent() {
      const { data } = await supabase
        .from('cms_content')
        .select('*')
        .eq('section', 'contact')
        .eq('block_key', 'main')
        .single();
      if (data) setPageContent(data);
    }
    fetchContactContent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    const isHuman = await getToken('contact');
    if (!isHuman) {
      setSubmitStatus('error');
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message,
        });

      if (error) {
        console.log('Note: contact_submissions table may not exist');
      }

      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contact', payload: formData })
      }).catch(err => console.error('Contact notification error:', err));

      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      question: 'What are your delivery times?',
      answer: 'Standard delivery times depend on your location and are shown at checkout. We package every order with care.'
    },
    {
      question: 'Do you offer international shipping?',
      answer: 'Shipping options and regions are shown at checkout. Place your order and we will keep you updated every step of the way.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept mobile money (MTN, Vodafone, AirtelTigo) and credit/debit cards through our secure Moolre payment gateway.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative bg-slate-950 overflow-hidden" style={{ minHeight: '65vh' }}>
        <Image
          src="/hero_salon.jpg"
          alt="Contact Us"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          quality={82}
        />
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

        {/* Ghost letter */}
        <div
          aria-hidden="true"
          className="absolute -right-4 bottom-0 font-serif italic text-white/[0.03] leading-none pointer-events-none select-none"
          style={{ fontSize: 'clamp(12rem, 30vw, 28rem)' }}
        >G</div>

        <div
          className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col justify-center"
          style={{ minHeight: '65vh' }}
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="w-10 h-px bg-blue-400" />
            <span className="text-blue-400 text-[9px] font-black tracking-[0.55em] uppercase">Reach Out</span>
          </div>

          <h1 className="font-serif italic leading-[0.92]">
            <span className="block text-white" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 3rem)' }}>Get In</span>
            <span className="block text-blue-400" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 3rem)' }}>Touch</span>
            <span className="block text-white/40" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 3rem)' }}>We&apos;re Here</span>
          </h1>

          <p className="text-slate-400 text-sm font-light mt-10 max-w-xs leading-relaxed">
            Have a question about our collections or your order? We&apos;re here to help.
          </p>
        </div>
      </section>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20">

            {/* ── FORM ──────────────────────────────────── */}
            <div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-300 mb-4">Send a Message</p>
              <h2 className="font-serif text-3xl sm:text-4xl italic text-slate-900 mb-2 leading-tight">
                We&apos;d Love to<br />
                <span className="text-slate-400 font-light">Hear From You</span>
              </h2>
              <p className="text-slate-400 text-sm font-light mb-10 leading-relaxed">
                Fill out the form and we&apos;ll get back to you as soon as possible.
              </p>

              <form id="contactForm" onSubmit={handleSubmit} className="space-y-8">

                {/* Name + Email row */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="group">
                    <label htmlFor="name" className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                      Full Name <span className="text-blue-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pb-3 border-b border-slate-200 focus:border-slate-900 bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-300"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                      Email <span className="text-blue-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pb-3 border-b border-slate-200 focus:border-slate-900 bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-300"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {/* Phone + Subject row */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="phone" className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pb-3 border-b border-slate-200 focus:border-slate-900 bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-300"
                      placeholder="+233 XX XXX XXXX"
                    />
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                      Subject <span className="text-blue-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full pb-3 border-b border-slate-200 focus:border-slate-900 bg-transparent text-slate-900 text-sm outline-none transition-colors placeholder:text-slate-300"
                      placeholder="Order inquiry, product question…"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-[9px] font-black tracking-[0.4em] uppercase text-slate-400 mb-3">
                    Message <span className="text-blue-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    maxLength={500}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full pb-3 border-b border-slate-200 focus:border-slate-900 bg-transparent text-slate-900 text-sm outline-none transition-colors resize-none placeholder:text-slate-300"
                    placeholder="Tell us how we can help you…"
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-[9px] text-slate-300 font-medium">{formData.message.length}/500</span>
                  </div>
                </div>

                {/* Status messages */}
                {submitStatus === 'success' && (
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 text-slate-700 px-5 py-4 rounded-xl text-sm">
                    <i className="ri-check-line text-lg text-slate-500" />
                    Message sent! We&apos;ll respond within 24 hours.
                  </div>
                )}
                {submitStatus === 'error' && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm">
                    <i className="ri-error-warning-line text-lg" />
                    Failed to send. Please try again in a moment.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || verifying}
                  className="inline-flex items-center gap-3 bg-slate-900 hover:bg-slate-700 text-white px-10 py-4 rounded-xl font-bold text-xs tracking-[0.25em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting || verifying
                    ? (verifying ? 'Verifying…' : 'Sending…')
                    : (
                      <>Send Message <i className="ri-send-plane-line" /></>
                    )
                  }
                </button>
              </form>
            </div>

            {/* ── RIGHT COLUMN ──────────────────────────── */}
            <div className="space-y-12">
              <div className="space-y-6">
                <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-gold mb-2">Visit or call</p>
                <div className="space-y-5">
                  <a href={`tel:${BRAND.contact.phoneTel}`} className="flex items-start gap-4">
                    <span className="w-11 h-11 rounded-full bg-brand-gold text-brand-ink flex items-center justify-center">
                      <i className="ri-phone-line" />
                    </span>
                    <span>
                      <span className="block text-xs font-black tracking-[0.2em] uppercase text-brand-ink">Phone</span>
                      <span className="text-sm text-brand-mid">{BRAND.contact.phoneDisplay}</span>
                    </span>
                  </a>
                  <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4">
                    <span className="w-11 h-11 rounded-full bg-brand-gold text-brand-ink flex items-center justify-center">
                      <i className="ri-whatsapp-line" />
                    </span>
                    <span>
                      <span className="block text-xs font-black tracking-[0.2em] uppercase text-brand-ink">WhatsApp</span>
                      <span className="text-sm text-brand-mid">{BRAND.contact.whatsappDisplay}</span>
                    </span>
                  </a>
                  <a href={`mailto:${BRAND.contact.email}`} className="flex items-start gap-4">
                    <span className="w-11 h-11 rounded-full bg-brand-gold text-brand-ink flex items-center justify-center">
                      <i className="ri-mail-line" />
                    </span>
                    <span>
                      <span className="block text-xs font-black tracking-[0.2em] uppercase text-brand-ink">Email</span>
                      <span className="text-sm text-brand-mid">{BRAND.contact.email}</span>
                    </span>
                  </a>
                  <div className="flex items-start gap-4">
                    <span className="w-11 h-11 rounded-full bg-brand-gold text-brand-ink flex items-center justify-center">
                      <i className="ri-map-pin-line" />
                    </span>
                    <span>
                      <span className="block text-xs font-black tracking-[0.2em] uppercase text-brand-ink">Store</span>
                      <span className="text-sm text-brand-mid">{BRAND.contact.store}</span>
                    </span>
                  </div>
                </div>
                <WhatsAppButton />
              </div>

              {/* FAQ */}
              <div>
                <p className="text-[9px] font-black tracking-[0.5em] uppercase text-slate-300 mb-4">Common Questions</p>
                <h2 className="font-serif text-3xl sm:text-4xl italic text-slate-900 mb-8 leading-tight">
                  Quick<br />
                  <span className="text-slate-400 font-light">Answers</span>
                </h2>

                <div className="divide-y divide-slate-100">
                  {faqs.map((faq, i) => (
                    <div key={i}>
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between py-5 text-left group cursor-pointer"
                      >
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 pr-4 transition-colors">
                          {faq.question}
                        </span>
                        <i className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${openFaq === i ? 'ri-subtract-line rotate-0' : 'ri-add-line'}`} />
                      </button>
                      {openFaq === i && (
                        <p className="pb-5 text-slate-500 text-sm leading-relaxed">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

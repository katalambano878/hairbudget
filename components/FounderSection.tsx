'use client';

import { useEffect, useRef, useState } from 'react';

export default function FounderSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);

        const video = videoRef.current;
        if (!video) return;

        if (entry.isIntersecting) {
          const play = video.play();
          if (play) play.catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-brand-deep py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div
            className={`order-2 lg:order-1 transition-all duration-1000 ease-out motion-reduce:transition-none ${
              inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
          >
            <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-champagne mb-5">
              Our Founder
            </p>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] text-brand-ivory leading-[1.05]">
              Meet <span className="italic font-light">Yayra Yassi</span>
            </h2>
            <p className="mt-4 text-brand-champagne text-xs font-bold tracking-[0.35em] uppercase">
              Founder &amp; CEO
            </p>
            <div className="mt-8 h-px w-16 bg-brand-champagne/60" />
            <div className="mt-8 space-y-5 text-brand-cream/90 text-base font-light leading-[1.85] max-w-lg">
              <p>
                Yayra Yassi started HairBudget in 2017 with one belief: quality hair should never
                be out of reach. What began as a small passion project in Adenta now serves
                customers across Ghana, retail and wholesale.
              </p>
              <p>
                She still personally sources every texture the shop carries, because the promise
                behind the name is simple — beautiful hair that respects your budget.
              </p>
            </div>
          </div>

          <div
            className={`order-1 lg:order-2 transition-all duration-1000 ease-out motion-reduce:transition-none ${
              inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-3 rounded-[2rem] border border-brand-champagne/25" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-brand-champagne/70 bg-brand-forest">
                <video
                  ref={videoRef}
                  className="block h-full w-full object-cover aspect-[3/4]"
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/founder-poster.jpg"
                  src="/founder.mp4"
                  aria-label="Yayra Yassi, founder and CEO of HairBudget"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

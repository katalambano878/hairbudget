import Link from 'next/link';
import Image from 'next/image';
import { publicAsset } from '@/lib/assets';

const COLLECTIONS = [
  {
    title: 'Wigs & Units',
    description: 'Human hair and ready-to-wear wigs — bobs, body wave, blonde and everyday units.',
    href: '/shop?search=wig',
    thumb: '/hero_collection_wigs.jpg',
    photo: '/hero_collection_wigs.jpg',
    icon: 'ri-user-star-line',
  },
  {
    title: 'Bundles & Textures',
    description: 'Curly, wavy and straight bundles in popular lengths — shop retail or restock wholesale.',
    href: '/shop?search=bundle',
    thumb: '/hero_collection_bundles.jpg',
    photo: '/hero_collection_bundles.jpg',
    icon: 'ri-stack-line',
  },
  {
    title: 'Braiding Extensions',
    description: 'Jumbo braid and kanekalon for protective styles — durable, affordable, and full of colour.',
    href: '/shop?search=braid',
    thumb: '/hero_collection_braids.jpg',
    photo: '/hero_collection_braids.jpg',
    icon: 'ri-scissors-cut-line',
  },
  {
    title: 'Wholesale & Shapewear',
    description: 'Stock your shop or finish the look. Pickup and delivery from Adenta — chat Yassi on WhatsApp.',
    href: '/contact',
    thumb: '/hero_collection_wholesale.jpg',
    photo: '/hero_collection_wholesale.jpg',
    icon: 'ri-store-2-line',
  },
];

export default function CollectionCards() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-flex items-center gap-2 text-brand-mid text-xs tracking-[0.35em] uppercase font-semibold mb-3">
            <span className="w-5 h-[1px] bg-brand-gold" />
            Shop by look
            <span className="w-5 h-[1px] bg-brand-gold" />
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-brand-ink">
            Hair for every strand
          </h2>
          <p className="mt-4 text-brand-mid text-sm md:text-base max-w-xl mx-auto">
            Wigs, bundles, braiding hair and wholesale — stylish quality at budget-friendly prices.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
          {COLLECTIONS.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group relative flex items-center gap-4 sm:gap-5 bg-white rounded-[28px] p-5 sm:p-6 shadow-[0_10px_40px_-24px_rgba(41,37,36,0.25)] hover:shadow-[0_18px_50px_-20px_rgba(12,69,52,0.28)] transition-shadow"
            >
              <div className="relative w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full overflow-hidden flex-shrink-0 ring-2 ring-brand-cream">
                <Image
                  src={publicAsset(item.thumb)}
                  alt=""
                  fill
                  className="object-cover object-top"
                  sizes="72px"
                />
              </div>

              <div className="min-w-0 flex-1 pr-2">
                <i className={`${item.icon} text-xl text-brand-forest mb-2 block`} aria-hidden />
                <h3 className="font-serif text-xl sm:text-2xl text-brand-ink leading-tight mb-1.5">
                  {item.title}
                </h3>
                <p className="text-brand-mid text-xs sm:text-sm leading-relaxed mb-3 max-w-xs">
                  {item.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-brand-forest text-sm font-medium">
                  Shop now
                  <i className="ri-arrow-right-line text-base transition-transform group-hover:translate-x-1" />
                </span>
              </div>

              <div className="relative hidden sm:block w-[38%] max-w-[200px] aspect-[4/5] rounded-[22px] overflow-hidden flex-shrink-0">
                <Image
                  src={publicAsset(item.photo)}
                  alt={item.title}
                  fill
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
                  sizes="200px"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

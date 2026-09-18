export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Image */}
      <div className="relative aspect-[3/4] bg-brand-cream/70 rounded-[22px] overflow-hidden ring-1 ring-brand-forest/10">
        <div
          className="absolute inset-0 bg-gradient-to-r from-brand-cream/70 via-brand-cream/30 to-brand-cream/70 animate-shimmer"
          style={{ backgroundSize: '200% 100%' }}
        />
      </div>

      <div className="flex flex-col flex-grow pt-4 space-y-3">
        {/* Title */}
        <div className="space-y-1.5">
          <div className="h-4 bg-brand-cream/80 rounded w-3/4"></div>
          <div className="h-4 bg-brand-cream/80 rounded w-1/2"></div>
        </div>

        {/* Swatches */}
        <div className="flex gap-1.5">
          <div className="w-4 h-4 rounded-full bg-brand-cream/80"></div>
          <div className="w-4 h-4 rounded-full bg-brand-cream/80"></div>
          <div className="w-4 h-4 rounded-full bg-brand-cream/80"></div>
        </div>

        {/* Price rail */}
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-px bg-brand-gold/60"></div>
          <div className="h-5 bg-brand-cream/80 rounded w-24"></div>
        </div>

        {/* Mobile button */}
        <div className="mt-auto pt-2 lg:hidden">
          <div className="h-11 bg-brand-cream/60 rounded-full w-full"></div>
        </div>
      </div>
    </div>
  );
}

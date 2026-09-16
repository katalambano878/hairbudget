import Link from 'next/link';

type BrandLogoProps = {
  href?: string | null;
  className?: string;
  imgClassName?: string;
  onDark?: boolean;
  priority?: boolean;
};

export default function BrandLogo({
  href = '/',
  className = '',
  imgClassName = 'h-10 md:h-12 w-auto max-w-[220px] sm:max-w-[280px]',
  onDark = false,
  priority = false,
}: BrandLogoProps) {
  const image = (
    <img
      src={onDark ? '/logo-light.png' : '/logo.png'}
      alt="HairBudget — Confidence in every strand"
      className={`object-contain object-left ${imgClassName}`}
      {...(priority ? { fetchPriority: 'high' as const } : {})}
    />
  );

  if (!href) {
    return <span className={`inline-flex items-center ${className}`}>{image}</span>;
  }

  return (
    <Link href={href} aria-label="HairBudget home" className={`inline-flex items-center ${className}`}>
      {image}
    </Link>
  );
}

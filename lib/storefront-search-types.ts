export type StorefrontSearchHit = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  compare_at_price?: number | null;
  categoryName?: string | null;
  image: string | null;
};

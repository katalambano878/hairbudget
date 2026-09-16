/** HairBudget GH brand — colors sampled from the Jumbo Braid pack. */
export const BRAND_COLORS = {
  forest: '#0C4534',
  deep: '#093C2D',
  mid: '#194E3C',
  cream: '#EEE5D4',
  ivory: '#FFF2CB',
  gold: '#DACCA9',
  champagne: '#E8D2AD',
  taupe: '#BDBCB8',
  ink: '#292524',
  white: '#FCFCFC',
} as const;

export const BRAND = {
  name: 'HairBudget',
  legalName: 'Hair Budget GH',
  shortName: 'HairBudget by Yassi',
  tagline: 'Confidence in every strand',
  description:
    'Stylish and quality hair products at budget-friendly prices. Shop wigs, human hair, extensions, braiding hair, bundles and shapewear — retail and wholesale in Ghana.',
  url: (() => {
    const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    return env && !env.includes('localhost') ? env : 'https://hairbudgetgh.com';
  })(),
  foundedYear: 2017,
  skuPrefix: 'HB',
  smsSenderId: 'HairBudget',
  currency: 'GHS',
  currencySymbol: 'GH₵',
  locale: 'en_GH',
  countryCode: 'GH',
  themeColor: BRAND_COLORS.forest,
  colors: BRAND_COLORS,
  contact: {
    phoneDisplay: '059 892 8819',
    phoneTel: '+233598928819',
    whatsappDisplay: '054 295 0338',
    whatsappE164: '233542950338',
    whatsappUrl: 'https://wa.me/233542950338',
    email: 'info@hairbudgetgh.com',
    store: '1 Kwei-Fio St, Adenta Municipality, Ghana',
    website: 'https://hairbudgetgh.com',
  },
  social: {
    instagram: 'https://www.instagram.com/hairbudget_yassi/',
    instagramHandle: '@hairbudget_yassi',
    snapchat: 'https://www.snapchat.com/add/hairbudget',
    snapchatHandle: '@hairbudget',
    tiktok: 'https://www.tiktok.com/@hairbudget22',
    tiktokHandle: '@hairbudget22',
  },
  policies: {
    delivery: 'Pickup and delivery available across Ghana.',
    returns: 'No refunds. Exchanges are accepted within 24 hours of purchase, unused and in original condition.',
  },
} as const;

export const WHATSAPP_PREFILL =
  'Hi HairBudget! I would like to ask about your hair products.';

export function whatsappHref(message = WHATSAPP_PREFILL) {
  return `${BRAND.contact.whatsappUrl}?text=${encodeURIComponent(message)}`;
}

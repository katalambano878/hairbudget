export const FAQ_CATEGORIES = [
  { id: 'all', name: 'All Questions', icon: 'ri-question-line' },
  { id: 'orders', name: 'Orders', icon: 'ri-shopping-bag-line' },
  { id: 'shipping', name: 'Shipping', icon: 'ri-truck-line' },
  { id: 'returns', name: 'Returns', icon: 'ri-arrow-go-back-line' },
  { id: 'payment', name: 'Payment', icon: 'ri-bank-card-line' },
  { id: 'account', name: 'Account', icon: 'ri-user-line' },
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number]['id'];

export type Faq = {
  category: FaqCategory;
  question: string;
  answer: string;
};

export const FAQS: Faq[] = [
  {
    category: 'orders',
    question: 'How do I place an order?',
    answer:
      "Browse our products, add items to your cart, proceed to checkout, provide your delivery address, select payment method, and confirm your order. You'll receive an email confirmation with your order details and tracking number.",
  },
  {
    category: 'orders',
    question: 'Can I modify or cancel my order?',
    answer:
      'You can modify or cancel your order within 1 hour of placing it. Contact our customer service team as soon as possible through the contact page. Once an order is processed, modifications may not be possible.',
  },
  {
    category: 'orders',
    question: 'How do I track my order?',
    answer:
      "After your order ships, you'll receive a tracking number via email and SMS. Visit our Order Tracking page and enter your order number and email address to see real-time updates on your delivery status.",
  },
  {
    category: 'orders',
    question: 'What if I receive the wrong item?',
    answer:
      "We sincerely apologise if you receive the wrong item. Contact us within 48 hours with photos of the item received. We'll arrange for the correct item to be sent immediately and collect the wrong item at no cost to you.",
  },
  {
    category: 'shipping',
    question: 'What are your delivery times?',
    answer:
      'Standard delivery takes 2-5 business days within Ghana. Express delivery (next-day) is available for Accra and Kumasi. Orders placed before 2pm are dispatched same day. Remote areas may take 5-7 business days.',
  },
  {
    category: 'shipping',
    question: 'How much does shipping cost?',
    answer:
      'Standard shipping costs GHS 20. Express delivery costs GHS 40. Orders over GHS 300 qualify for FREE standard shipping. Store pickup is also available at no charge from our Accra location.',
  },
  {
    category: 'shipping',
    question: 'Do you ship outside Ghana?',
    answer:
      "Currently, we only ship within Ghana. We're working on expanding to neighbouring West African countries. Sign up for our newsletter to be notified when international shipping becomes available.",
  },
  {
    category: 'shipping',
    question: 'What if nobody is home for delivery?',
    answer:
      "Our delivery partner will attempt delivery twice. If unsuccessful, the package will be held at the nearest collection point for 5 days. You'll receive SMS and email notifications with collection instructions.",
  },
  {
    category: 'returns',
    question: 'What is your return policy?',
    answer:
      'We offer a 14-day return policy for unused items in original packaging. Simply initiate a return from your account, print the return label, and ship it back. Refunds are processed within 5-7 business days after we receive the item.',
  },
  {
    category: 'returns',
    question: 'Which items cannot be returned?',
    answer:
      'For hygiene reasons, we cannot accept returns on opened cosmetics, intimate apparel, earrings, or perishable goods. Custom or personalised items are also non-returnable unless defective.',
  },
  {
    category: 'returns',
    question: 'Who pays for return shipping?',
    answer:
      "If you're returning due to a defect or our error, we cover return shipping. For change-of-mind returns, customers pay return shipping costs (GHS 15 standard rate). Free shipping on returns for defective items.",
  },
  {
    category: 'returns',
    question: 'Can I exchange an item instead of returning it?',
    answer:
      'Yes! If you need a different size or colour, select "Exchange" when initiating your return. We\'ll send the replacement as soon as we receive your original item. Exchange shipping is FREE.',
  },
  {
    category: 'payment',
    question: 'What payment methods do you accept?',
    answer:
      'We accept MTN Mobile Money, Vodafone Cash, AirtelTigo Money, and Visa/Mastercard credit and debit cards via our secure Moolre payment gateway. All transactions are encrypted and processed securely.',
  },
  {
    category: 'payment',
    question: 'Is it safe to use my credit card on your site?',
    answer:
      'Absolutely. We use industry-standard SSL encryption and partner with Moolre for secure payment processing. We never store your full card details on our servers. All transactions are PCI-DSS compliant.',
  },
  {
    category: 'payment',
    question: 'Can I pay in instalments?',
    answer:
      'Yes! We offer payment plans through our partners for purchases over GHS 500. Select "Pay in Instalments" at checkout to see available options. Approval is instant and no interest is charged.',
  },
  {
    category: 'payment',
    question: 'When will my payment be charged?',
    answer:
      "For card and mobile money payments, you're charged immediately. For Cash on Delivery, you pay when you receive your order. If an item is out of stock, we'll refund you within 24 hours.",
  },
  {
    category: 'payment',
    question: 'How do refunds work?',
    answer:
      "Refunds are processed to your original payment method within 5-7 business days after we receive and inspect your return. For mobile money refunds, ensure you provide correct details. You'll receive confirmation via email.",
  },
  {
    category: 'account',
    question: 'Do I need an account to place an order?',
    answer:
      'No, you can checkout as a guest. However, creating an account lets you track orders, save addresses, view purchase history, manage your wishlist, and receive exclusive offers. It only takes 30 seconds to sign up.',
  },
  {
    category: 'account',
    question: 'How do I reset my password?',
    answer:
      'Click "Forgot Password" on the login page, enter your email address, and we\'ll send you a reset link. The link is valid for 1 hour. If you don\'t receive it, check your spam folder or contact support.',
  },
  {
    category: 'account',
    question: 'Can I have multiple delivery addresses?',
    answer:
      'Yes! You can save multiple delivery addresses in your account. During checkout, simply select the address you want to use or add a new one. This is perfect for sending gifts or alternating between work and home.',
  },
  {
    category: 'account',
    question: 'How do I update my account information?',
    answer:
      'Log in to your account and go to "Account Settings". You can update your name, email, phone number, password, and saved addresses. Changes are saved instantly and you\'ll receive a confirmation email.',
  },
  {
    category: 'account',
    question: 'What are loyalty points and how do they work?',
    answer:
      'Earn 1 point for every GHS 10 spent. 100 points = GHS 10 discount on your next purchase. Points are automatically added to your account after each order. Check your points balance in your account dashboard.',
  },
];

/** Schema.org FAQPage JSON-LD payload built from the shared FAQ list. */
export function faqPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

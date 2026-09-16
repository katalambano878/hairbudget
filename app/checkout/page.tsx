'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CheckoutSteps from '@/components/CheckoutSteps';
import OrderSummary from '@/components/OrderSummary';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import {
  parseStorePricingValue,
  resolveCartLineUnitPrice,
} from '@/lib/pricing';

// Comprehensive Ghana regions → major cities / towns.
// "Other (not listed)" lets shoppers type a town that isn't in the list.
const OTHER_CITY = 'Other (not listed)';
const GHANA_REGIONS_CITIES: Record<string, string[]> = {
  'Greater Accra': [
    'Accra', 'Tema', 'Madina', 'Ashaiman', 'Teshie', 'Nungua', 'Dansoman', 'Adenta', 'Dome',
    'Achimota', 'Lapaz', 'Spintex', 'East Legon', 'Osu', 'Labadi', 'Sakumono', 'Prampram',
    'Ada Foah', 'Dodowa', 'Amasaman', 'Pokuase', 'Weija', 'Gbawe', 'Kaneshie', 'Nima',
    'Kotobabi', 'Abeka', 'Tesano', 'Cantonments', 'Airport Residential', 'Labone', 'La',
    'Sowutuom', 'Taifa', 'Kwabenya', 'Oyibi', 'Afienya', 'Kpone', 'Tema New Town', 'Mamprobi',
    'Bortianor', 'Kasoa Toll Booth', 'Santa Maria', 'Haatso', 'Ogbojo', 'Ashaley Botwe',
  ],
  'Ashanti': [
    'Kumasi', 'Obuasi', 'Ejisu', 'Konongo', 'Mampong', 'Bekwai', 'Offinso', 'Tepa', 'Agona',
    'Effiduase', 'Juaso', 'Kuntanase', 'Nkawie', 'Bantama', 'Asokwa', 'Suame', 'Old Tafo',
    'Asokore Mampong', 'Ejura', 'Adum', 'Atonsu', 'Tanoso', 'Abuakwa', 'Kwadaso', 'Santasi',
    'Ahodwo', 'Tafo', 'Manso Nkwanta', 'New Edubiase', 'Fomena', 'Jacobu', 'Kodie',
  ],
  'Western': [
    'Sekondi-Takoradi', 'Takoradi', 'Sekondi', 'Tarkwa', 'Axim', 'Prestea', 'Shama',
    'Agona Nkwanta', 'Bogoso', 'Half Assini', 'Elubo', 'Daboase', 'Mpohor', 'Nsuaem',
    'Wassa Akropong', 'Esiama', 'Apowa', 'Inchaban', 'Anyinase', 'Bonsaso',
  ],
  'Central': [
    'Cape Coast', 'Kasoa', 'Winneba', 'Agona Swedru', 'Mankessim', 'Saltpond', 'Elmina',
    'Dunkwa-on-Offin', 'Assin Foso', 'Twifo Praso', 'Apam', 'Ajumako', 'Breman Asikuma',
    'Anomabo', 'Komenda', 'Abura Dunkwa', 'Nyakrom', 'Bawjiase', 'Gomoa Fetteh', 'Moree',
    'Assin Bereku', 'Diaso',
  ],
  'Eastern': [
    'Koforidua', 'Nkawkaw', 'Suhum', 'Akosombo', 'Begoro', 'Mpraeso', 'Akim Oda', 'Kibi',
    'Nsawam', 'Aburi', 'Akropong', 'Akuapem Mampong', 'Somanya', 'Kpong', 'Asamankese',
    'New Tafo', 'Kade', 'Akwatia', 'Donkorkrom', 'Anyinam', 'Osino', 'Kwabeng', 'Adukrom',
    'Mamfe', 'Ayirebi', 'Kyebi',
  ],
  'Volta': [
    'Ho', 'Hohoe', 'Keta', 'Aflao', 'Kpando', 'Anloga', 'Sogakope', 'Akatsi', 'Denu',
    'Dzodze', 'Kpeve', 'Adidome', 'Have', 'Vakpo', 'Peki', 'Abor', 'Kpetoe', 'Dabala',
    'Ave Dakpa', 'Adaklu', 'Tsito', 'Hodzo',
  ],
  'Northern': [
    'Tamale', 'Yendi', 'Savelugu', 'Tolon', 'Bimbilla', 'Gushegu', 'Karaga', 'Kumbungu',
    'Saboba', 'Zabzugu', 'Wulensi', 'Sang', 'Tatale', 'Nanton', 'Sagnarigu', 'Kpandai',
  ],
  'Upper East': [
    'Bolgatanga', 'Bawku', 'Navrongo', 'Zebilla', 'Paga', 'Sandema', 'Bongo', 'Garu',
    'Tongo', 'Pusiga', 'Zuarungu', 'Chiana', 'Bawku West', 'Nangodi',
  ],
  'Upper West': [
    'Wa', 'Tumu', 'Lawra', 'Jirapa', 'Nadowli', 'Nandom', 'Wechiau', 'Funsi', 'Hamile',
    'Gwollu', 'Kaleo', 'Han', 'Issa', 'Lambussie',
  ],
  'Bono': [
    'Sunyani', 'Berekum', 'Dormaa Ahenkro', 'Wenchi', 'Sampa', 'Drobo', 'Nsoatre', 'Odumase',
    'Chiraa', 'Fiapre', 'Kwatire', 'Nsawkaw', 'Dormaa Akwamu', 'Seikwa', 'Banda Ahenkro',
  ],
  'Bono East': [
    'Techiman', 'Kintampo', 'Nkoranza', 'Atebubu', 'Yeji', 'Prang', 'Kwame Danso', 'Jema',
    'Tuobodom', 'Busunya', 'Amantin', 'Kajaji', 'Sabule',
  ],
  'Ahafo': [
    'Goaso', 'Bechem', 'Duayaw Nkwanta', 'Hwidiem', 'Kukuom', 'Mim', 'Acherensua', 'Kenyasi',
    'Ntotroso', 'Sankore', 'Yamfo', 'Tepa Junction',
  ],
  'North East': [
    'Nalerigu', 'Walewale', 'Gambaga', 'Bunkpurugu', 'Chereponi', 'Nakpanduri', 'Langbinsi',
    'Yagaba', 'Wungu',
  ],
  'Savannah': [
    'Damongo', 'Bole', 'Salaga', 'Sawla', 'Daboya', 'Buipe', 'Larabanga', 'Tuna', 'Yapei',
    'Kpalbe', 'Busunu',
  ],
  'Oti': [
    'Dambai', 'Jasikan', 'Kadjebi', 'Nkwanta', 'Kete Krachi', 'Worawora', 'Kpassa',
    'Brewaniase', 'Chinderi', 'Ahamansu', 'Bowiri',
  ],
  'Western North': [
    'Sefwi Wiawso', 'Bibiani', 'Juaboso', 'Enchi', 'Akontombra', 'Bodi', 'Sefwi Bekwai',
    'Dadieso', 'Essam', 'Sefwi Asawinso', 'Awaso',
  ],
};

export default function CheckoutPage() {
  usePageTitle('Checkout');
  const router = useRouter();
  const { cart, subtotal: cartSubtotal, clearCart } = useCart();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'guest' | 'account'>('guest');
  const [saveAddress, setSaveAddress] = useState(false);
  const [savePayment, setSavePayment] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { getToken, verifying } = useRecaptcha();

  const [shippingData, setShippingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: ''
  });

  // Ghana Regions for dropdown (derived from the comprehensive region → cities map)
  const ghanaRegions = Object.keys(GHANA_REGIONS_CITIES);
  const citiesForRegion = shippingData.region
    ? GHANA_REGIONS_CITIES[shippingData.region] || []
    : [];
  // Free-text fallback when the shopper's town isn't in the dropdown
  const [customCity, setCustomCity] = useState('');
  const cityIsOther = shippingData.city === OTHER_CITY;
  const resolvedCity = cityIsOther ? customCity.trim() : shippingData.city;
  const shippingAddressForOrder = { ...shippingData, city: resolvedCity };

  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('moolre');
  const [errors, setErrors] = useState<any>({});



  // Check auth and cart
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setCheckoutType('account'); // Auto-select account checkout if logged in
        // Pre-fill email if available
        setShippingData(prev => ({ ...prev, email: session.user.email || '' }));
      }
    }
    checkUser();

    // Small delay to ensure cart load
    const timer = setTimeout(() => {
      if (cart.length === 0 && !isLoading) {
        // router.push('/cart'); // Optional: redirect if empty
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [cart, router, isLoading]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Calculate Totals
  const subtotal = cartSubtotal;
  const shippingCost = 0; // Delivery options temporarily disabled
  const tax = 0; // No Tax
  const total = subtotal + shippingCost + tax;

  const validateShipping = () => {
    const newErrors: any = {};
    if (!shippingData.firstName) newErrors.firstName = 'First name is required';
    if (!shippingData.lastName) newErrors.lastName = 'Last name is required';
    if (!shippingData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(shippingData.email)) newErrors.email = 'Invalid email';
    if (!shippingData.phone) newErrors.phone = 'Phone is required';
    if (!shippingData.address) newErrors.address = 'Address is required';
    if (!shippingData.region) newErrors.region = 'Region is required';
    if (!shippingData.city) newErrors.city = 'City / town is required';
    else if (cityIsOther && !customCity.trim()) {
      newErrors.city = 'Please enter your city / town';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToDelivery = () => {
    if (validateShipping()) {
      setCurrentStep(2);
    }
  };

  const handleContinueToPayment = async () => {
    // Skip step 3 and directly initiate payment with default method (Moolre/Mobile Money)
    await handlePlaceOrder();
  };



  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setIsLoading(true);

    // reCAPTCHA verification
    const isHuman = await getToken('checkout');
    if (!isHuman) {
      alert('Security verification failed. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      // Generate tracking number: SLI-XXXXXX (6-char alphanumeric)
      const trackingId = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
      const trackingNumber = `SLI-${trackingId}`;

      const isValidUUID = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      const resolvedLines: { item: (typeof cart)[0]; productId: string }[] = [];
      for (const item of cart) {
        let productId = item.id;
        if (!isValidUUID(productId)) {
          const { data: prodRow } = await supabase
            .from('products')
            .select('id')
            .or(`slug.eq.${productId},id.eq.${productId}`)
            .single();
          if (!prodRow) {
            throw new Error(
              `Product not found: ${item.name}. Please remove it from your cart and try again.`
            );
          }
          productId = prodRow.id;
        }
        resolvedLines.push({ item, productId });
      }

      const uniqueIds = [...new Set(resolvedLines.map((l) => l.productId))];

      const { data: pricingRow } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'store_pricing')
        .maybeSingle();
      const salesActive = parseStorePricingValue(pricingRow?.value).sales_active;

      const { data: productsFull, error: productsFullError } =
        uniqueIds.length > 0
          ? await supabase
              .from('products')
              .select(
                'id, price, sale_price, compare_at_price, metadata, product_variants(id, name, option1, option2, price, sale_price)'
              )
              .in('id', uniqueIds)
          : { data: [] as any[], error: null };

      if (productsFullError) throw productsFullError;

      const productMap = new Map((productsFull || []).map((p: any) => [p.id, p]));

      let computedSubtotal = 0;
      const orderItemsPayload: Record<string, unknown>[] = [];

      for (const { item, productId } of resolvedLines) {
        const p = productMap.get(productId);
        if (!p) {
          throw new Error(
            `Product not found: ${item.name}. Please remove it from your cart and try again.`
          );
        }
        const unit = resolveCartLineUnitPrice(p, item.variant, salesActive);
        computedSubtotal += unit * item.quantity;
        const prodMeta = p.metadata;
        orderItemsPayload.push({
          product_id: productId,
          product_name: item.name,
          variant_name: item.variant,
          quantity: item.quantity,
          unit_price: unit,
          total_price: unit * item.quantity,
          metadata: {
            image: item.image,
            slug: item.slug,
            preorder_shipping: prodMeta?.preorder_shipping || null,
          },
        });
      }

      const checkoutSubtotal = computedSubtotal;
      const checkoutTotal = checkoutSubtotal + shippingCost + tax;

      // 1. Create Order (totals from DB-resolved prices)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            order_number: orderNumber,
            user_id: user?.id || null,
            email: shippingData.email,
            phone: shippingData.phone,
            status: 'pending',
            payment_status: 'pending',
            currency: 'GHS',
            subtotal: checkoutSubtotal,
            tax_total: tax,
            shipping_total: shippingCost,
            discount_total: 0,
            total: checkoutTotal,
            shipping_method: deliveryMethod,
            payment_method: paymentMethod,
            shipping_address: shippingAddressForOrder,
            billing_address: shippingAddressForOrder,
            metadata: {
              guest_checkout: !user,
              first_name: shippingData.firstName,
              last_name: shippingData.lastName,
              tracking_number: trackingNumber,
            },
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = orderItemsPayload.map((row) => ({
        ...row,
        order_id: order.id,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Note: Stock reduction happens in mark_order_paid when payment is confirmed

      // 3. Upsert Customer Record (for both guest and registered users)
      const fullName = `${shippingData.firstName} ${shippingData.lastName}`.trim();
      await supabase.rpc('upsert_customer_from_order', {
        p_email: shippingData.email,
        p_phone: shippingData.phone,
        p_full_name: fullName,
        p_first_name: shippingData.firstName,
        p_last_name: shippingData.lastName,
        p_user_id: user?.id || null,
        p_address: shippingAddressForOrder,
      });

      // 4. Handle Payment Redirects or Completion
      if (paymentMethod === 'moolre') {
        try {
          // Payment link reminder will be sent automatically after 15 mins if unpaid (via cron)

          const paymentRes = await fetch('/api/payment/moolre', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderNumber,
              amount: checkoutTotal,
              customerEmail: shippingData.email
            })
          });

          const paymentResult = await paymentRes.json();

          if (!paymentResult.success) {
            throw new Error(paymentResult.message || 'Payment initialization failed');
          }

          // Clear cart before redirecting
          clearCart();

          // Redirect to Moolre
          window.location.href = paymentResult.url;
          return;

        } catch (paymentErr: any) {
          console.error('Payment Error:', paymentErr);
          alert('Failed to initialize payment: ' + paymentErr.message);
          setIsLoading(false);
          return; // Stop execution
        }
      }

      if (paymentMethod === 'paystack') {
        try {
          const paymentRes = await fetch('/api/payment/paystack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderNumber,
              customerEmail: shippingData.email,
            }),
          });

          const paymentResult = await paymentRes.json();

          if (!paymentResult.success) {
            throw new Error(paymentResult.message || 'Payment initialization failed');
          }

          clearCart();
          window.location.href = paymentResult.url;
          return;
        } catch (paymentErr: unknown) {
          console.error('Paystack payment error:', paymentErr);
          const msg = paymentErr instanceof Error ? paymentErr.message : 'Payment failed';
          alert('Failed to initialize card payment: ' + msg);
          setIsLoading(false);
          return;
        }
      }

      // 5. Send Notifications (For COD or others)
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order_created',
          payload: order
        })
      }).catch(err => console.error('Notification trigger error:', err));

      // 6. Clear Cart & Redirect (For COD)
      clearCart();
      router.push(`/order-success?order=${orderNumber}`);

    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('Failed to place order: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (cart.length === 0 && !isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 py-20">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <i className="ri-shopping-cart-line text-4xl text-gray-300"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">Add some items to start the checkout process.</p>
          <Link href="/shop" className="inline-block bg-slate-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors">
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/cart" className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center whitespace-nowrap">
            <i className="ri-arrow-left-line mr-2"></i>
            Back to Cart
          </Link>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        {currentStep === 1 && (
          <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Checkout As</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => !user && setCheckoutType('guest')}
                className={`p-6 rounded-xl border-2 transition-all text-left cursor-pointer ${checkoutType === 'guest'
                  ? 'border-slate-700 bg-slate-50'
                  : 'border-gray-200 hover:border-gray-300'
                  } ${user ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!!user}
              >
                <div className="flex items-center justify-between mb-3">
                  <i className="ri-user-line text-3xl text-slate-700"></i>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${checkoutType === 'guest' ? 'border-slate-700 bg-slate-700' : 'border-gray-300'
                    }`}>
                    {checkoutType === 'guest' && <i className="ri-check-line text-white text-sm"></i>}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Guest Checkout</h3>
                <p className="text-sm text-gray-600">Quick checkout without creating an account</p>
                {user && <p className="text-xs text-slate-600 mt-2">You are logged in</p>}
              </button>

              <button
                onClick={() => setCheckoutType('account')}
                className={`p-6 rounded-xl border-2 transition-all text-left cursor-pointer ${checkoutType === 'account'
                  ? 'border-slate-700 bg-slate-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <i className="ri-account-circle-line text-3xl text-slate-700"></i>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${checkoutType === 'account' ? 'border-slate-700 bg-slate-700' : 'border-gray-300'
                    }`}>
                    {checkoutType === 'account' && <i className="ri-check-line text-white text-sm"></i>}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{user ? 'My Account' : 'Create Account'}</h3>
                <p className="text-sm text-gray-600">
                  {user ? `Logged in as ${user.email}` : 'Save info, track orders & earn loyalty points'}
                </p>
              </button>
            </div>
          </div>
        )}

        <CheckoutSteps currentStep={currentStep} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2">
            {currentStep === 1 && (
              <>
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Shipping Information</h2>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={shippingData.firstName}
                          onChange={(e) => setShippingData({ ...shippingData, firstName: e.target.value })}
                          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 ${errors.firstName ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="John"
                        />
                        {errors.firstName && <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={shippingData.lastName}
                          onChange={(e) => setShippingData({ ...shippingData, lastName: e.target.value })}
                          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 ${errors.lastName ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Doe"
                        />
                        {errors.lastName && <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={shippingData.email}
                        readOnly={!!user} // Make read-only if logged in (optional, but safer)
                        onChange={(e) => setShippingData({ ...shippingData, email: e.target.value })}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 ${errors.email ? 'border-red-500' : 'border-gray-300'
                          } ${user ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="you@example.com"
                      />
                      {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={shippingData.phone}
                        onChange={(e) => setShippingData({ ...shippingData, phone: e.target.value })}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="+233 XX XXX XXXX"
                      />
                      {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={shippingData.address}
                        onChange={(e) => setShippingData({ ...shippingData, address: e.target.value })}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 ${errors.address ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="House number and street name"
                      />
                      {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Region *
                        </label>
                        <select
                          value={shippingData.region}
                          onChange={(e) => {
                            // Reset city whenever the region changes
                            setCustomCity('');
                            setShippingData({ ...shippingData, region: e.target.value, city: '' });
                          }}
                          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white ${errors.region ? 'border-red-500' : 'border-gray-300'
                            }`}
                        >
                          <option value="">Select Region</option>
                          {ghanaRegions.map((region) => (
                            <option key={region} value={region}>{region}</option>
                          ))}
                        </select>
                        {errors.region && <p className="text-sm text-red-600 mt-1">{errors.region}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          City / Town *
                        </label>
                        <select
                          value={shippingData.city}
                          onChange={(e) => {
                            setCustomCity('');
                            setShippingData({ ...shippingData, city: e.target.value });
                          }}
                          disabled={!shippingData.region}
                          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.city ? 'border-red-500' : 'border-gray-300'
                            }`}
                        >
                          <option value="">
                            {shippingData.region ? 'Select City / Town' : 'Select a region first'}
                          </option>
                          {citiesForRegion.map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                          {shippingData.region && <option value={OTHER_CITY}>{OTHER_CITY}</option>}
                        </select>
                        {cityIsOther && (
                          <input
                            type="text"
                            value={customCity}
                            onChange={(e) => setCustomCity(e.target.value)}
                            className={`w-full mt-2 px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 ${errors.city ? 'border-red-500' : 'border-gray-300'
                              }`}
                            placeholder="Enter your city / town"
                          />
                        )}
                        {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
                      </div>
                    </div>

                    {checkoutType === 'account' && (
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAddress}
                          onChange={(e) => setSaveAddress(e.target.checked)}
                          className="w-5 h-5 text-slate-700 rounded border-gray-300 focus:ring-slate-500"
                        />
                        <span className="text-sm text-gray-700">Save this address for future orders</span>
                      </label>
                    )}
                  </div>

                  <button
                    onClick={handleContinueToDelivery}
                    className="w-full mt-6 bg-slate-700 hover:bg-slate-800 text-white py-4 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Continue to Delivery
                  </button>
                </div>


              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Delivery Method</h2>
                  <div className="space-y-4">
                    <label className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${deliveryMethod === 'pickup' ? 'border-slate-700 bg-slate-50' : 'border-gray-300 hover:border-gray-400'
                      }`}>
                      <div className="flex items-center space-x-4">
                        <input
                          type="radio"
                          name="delivery"
                          value="pickup"
                          checked={deliveryMethod === 'pickup'}
                          onChange={(e) => setDeliveryMethod(e.target.value)}
                          className="w-5 h-5 text-slate-700"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">Store Pickup</p>
                          <p className="text-sm text-gray-600">Pick up from our store — Ready in 24 hours</p>
                        </div>
                      </div>
                      <p className="font-bold text-slate-700">FREE</p>
                    </label>

                    <label className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${deliveryMethod === 'doorstep' ? 'border-slate-700 bg-slate-50' : 'border-gray-300 hover:border-gray-400'
                      }`}>
                      <div className="flex items-center space-x-4">
                        <input
                          type="radio"
                          name="delivery"
                          value="doorstep"
                          checked={deliveryMethod === 'doorstep'}
                          onChange={(e) => setDeliveryMethod(e.target.value)}
                          className="w-5 h-5 text-slate-700"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">Doorstep Delivery</p>
                          <p className="text-sm text-gray-600">We will contact you with the delivery cost</p>
                        </div>
                      </div>
                      <p className="font-semibold text-blue-600 text-sm">At a Cost</p>
                    </label>

                    {/* Comprehensive delivery options - to be re-enabled later
                    <label className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${deliveryMethod === 'accra' ? 'border-slate-700 bg-slate-50' : 'border-gray-300 hover:border-gray-400'
                      }`}>
                      <div className="flex items-center space-x-4">
                        <input type="radio" name="delivery" value="accra" checked={deliveryMethod === 'accra'} onChange={(e) => setDeliveryMethod(e.target.value)} className="w-5 h-5 text-slate-700" />
                        <div>
                          <p className="font-semibold text-gray-900">Accra Delivery</p>
                          <p className="text-sm text-gray-600">Delivery within Accra</p>
                        </div>
                      </div>
                      <p className="font-bold text-gray-900">GH₵ 40.00</p>
                    </label>
                    <label className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${deliveryMethod === 'outside-accra' ? 'border-slate-700 bg-slate-50' : 'border-gray-300 hover:border-gray-400'
                      }`}>
                      <div className="flex items-center space-x-4">
                        <input type="radio" name="delivery" value="outside-accra" checked={deliveryMethod === 'outside-accra'} onChange={(e) => setDeliveryMethod(e.target.value)} className="w-5 h-5 text-slate-700" />
                        <div>
                          <p className="font-semibold text-gray-900">Outside Accra Delivery</p>
                          <p className="text-sm text-gray-600">Delivery to bus stations (VIP, OA, STC, etc.)</p>
                        </div>
                      </div>
                      <p className="font-bold text-gray-900">GH₵ 30.00</p>
                    </label>
                    */}
                  </div>

                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Payment method</h3>
                    <div className="space-y-3">
                      <label
                        className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          paymentMethod === 'moolre' ? 'border-slate-700 bg-slate-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <input
                            type="radio"
                            name="payment"
                            value="moolre"
                            checked={paymentMethod === 'moolre'}
                            onChange={() => setPaymentMethod('moolre')}
                            className="w-5 h-5 text-slate-700"
                          />
                          <div>
                            <p className="font-semibold text-gray-900">Mobile Money</p>
                            <p className="text-sm text-gray-600">Pay with MTN, Telecel, or AirtelTigo via Moolre</p>
                          </div>
                        </div>
                        <i className="ri-smartphone-line text-2xl text-slate-600" />
                      </label>

                      <label
                        className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          paymentMethod === 'paystack' ? 'border-slate-700 bg-slate-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <input
                            type="radio"
                            name="payment"
                            value="paystack"
                            checked={paymentMethod === 'paystack'}
                            onChange={() => setPaymentMethod('paystack')}
                            className="w-5 h-5 text-slate-700"
                          />
                          <div>
                            <p className="font-semibold text-gray-900">Card Payments</p>
                            <p className="text-sm text-gray-600">Visa, Mastercard, and other cards via Paystack</p>
                          </div>
                        </div>
                        <i className="ri-bank-card-line text-2xl text-slate-600" />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse md:flex-row gap-4 mt-6">
                    <button
                      onClick={() => setCurrentStep(1)}
                      disabled={isLoading}
                      className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 py-4 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleContinueToPayment}
                      disabled={isLoading}
                      className="flex-1 bg-slate-700 hover:bg-slate-800 text-white py-4 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-70 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : paymentMethod === 'paystack' ? (
                        'Pay with Card'
                      ) : (
                        'Pay with Mobile Money'
                      )}
                    </button>
                  </div>
                </div>


              </>
            )}

            {/* Step 3 removed - payment now initiates directly from step 2 */}
          </div>

          <div className="lg:col-span-1">
            <OrderSummary
              items={cart}
              subtotal={subtotal}
              shipping={shippingCost}
              tax={tax}
              total={total}
              shippingLabel={deliveryMethod === 'doorstep' ? 'At a Cost' : undefined}
              totalLabel={
                deliveryMethod === 'doorstep'
                  ? `GH₵ ${total.toFixed(2)} + delivery`
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}

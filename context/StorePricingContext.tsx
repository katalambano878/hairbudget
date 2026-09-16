'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { parseStorePricingValue } from '@/lib/pricing';

type StorePricingContextType = {
  salesActive: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const StorePricingContext = createContext<StorePricingContextType>({
  salesActive: false,
  loading: true,
  refresh: async () => {},
});

export function StorePricingProvider({ children }: { children: ReactNode }) {
  const [salesActive, setSalesActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'store_pricing')
        .maybeSingle();

      if (error) {
        console.warn('[StorePricing] fetch error:', error.message);
        setSalesActive(false);
        return;
      }

      const parsed = parseStorePricingValue(data?.value);
      setSalesActive(parsed.sales_active);
    } catch {
      setSalesActive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <StorePricingContext.Provider value={{ salesActive, loading, refresh }}>
      {children}
    </StorePricingContext.Provider>
  );
}

export function useStorePricing() {
  return useContext(StorePricingContext);
}

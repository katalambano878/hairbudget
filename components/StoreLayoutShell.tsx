'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { WhatsAppFloat } from '@/components/WhatsAppButton';
import ScrollToTop from '@/components/ScrollToTop';
import ErrorBoundary from '@/components/ErrorBoundary';
import NavigationProgress from '@/components/NavigationProgress';
import { CMSProvider } from '@/context/CMSContext';
import { StorePricingProvider } from '@/context/StorePricingContext';
import dynamic from 'next/dynamic';

const SessionTimeoutWarning = dynamic(() => import('@/components/SessionTimeoutWarning'), { ssr: false });
const PWAPrompt = dynamic(() => import('@/components/PWAPrompt'), { ssr: false });
const PWAInstaller = dynamic(() => import('@/components/PWAInstaller'), { ssr: false });

const PushNotificationManager = dynamic(() => import('@/components/PushNotificationManager'), { ssr: false });
const OfflineIndicator = dynamic(() => import('@/components/OfflineIndicator'), { ssr: false });
const NetworkStatusMonitor = dynamic(() => import('@/components/NetworkStatusMonitor'), { ssr: false });
const UpdatePrompt = dynamic(() => import('@/components/UpdatePrompt'), { ssr: false });
const LiveSalesNotification = dynamic(() => import('@/components/LiveSalesNotification'), { ssr: false });

export default function StoreLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  if (isAdmin) {
    return <div id="main-content">{children}</div>;
  }

  return (
    <CMSProvider>
      <StorePricingProvider>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <ScrollToTop />
        <div id="main-content" className="min-h-screen bg-white">

          <PWAInstaller />
          <Header />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Footer />
          <WhatsAppFloat />
          <MobileBottomNav />
          <SessionTimeoutWarning />
          <PWAPrompt />
          <PushNotificationManager />
          <OfflineIndicator />
          <NetworkStatusMonitor />
          <UpdatePrompt />
          <LiveSalesNotification />
        </div>
      </StorePricingProvider>
    </CMSProvider>
  );
}

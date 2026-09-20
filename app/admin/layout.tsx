'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminOrderBell from '@/components/admin/AdminOrderBell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (pathname === '/admin/login') {
        setIsLoading(false);
        return;
      }

      if (!session) {
        router.push('/admin/login');
        return;
      }

      document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile) {
        console.error('Failed to fetch user profile');
        router.push('/admin/login');
        return;
      }

      if (profile.role !== 'admin' && profile.role !== 'staff') {
        console.warn('User does not have admin/staff role');
        document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure';
        await supabase.auth.signOut();
        router.push('/admin/login?error=unauthorized');
        return;
      }

      setUser(session.user);
      setUserRole(profile.role);
      setIsAuthenticated(true);
      setIsLoading(false);
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;
      }
      if (event === 'SIGNED_OUT') {
        document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure';
        document.cookie = 'sb-refresh-token=; path=/; max-age=0; SameSite=Lax; Secure';
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  useEffect(() => {
    async function fetchModules() {
      try {
        const { data, error } = await supabase.from('store_modules').select('id, enabled');
        if (error) { console.warn('Error fetching modules:', error); return; }
        if (data) setEnabledModules(data.filter((m: any) => m.enabled).map((m: any) => m.id));
      } catch (err) {
        console.warn('Fetch modules failed:', err);
      }
    }
    fetchModules();
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  }, []);

  const handleLogout = async () => {
    document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure';
    document.cookie = 'sb-refresh-token=; path=/; max-age=0; SameSite=Lax; Secure';
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-deep gap-3">
        <div className="w-8 h-8 border-2 border-brand-cream/20 border-t-brand-gold rounded-full animate-spin" />
        <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-cream/60">Loading Admin</p>
      </div>
    );
  }

  const menuSections: { label: string; items: { title: string; icon: string; path: string; exact?: boolean; moduleId?: string }[] }[] = [
    {
      label: 'Core',
      items: [
        { title: 'Dashboard',    icon: 'ri-dashboard-line',    path: '/admin',        exact: true },
        { title: 'Orders',       icon: 'ri-shopping-bag-line', path: '/admin/orders' },
        { title: 'POS System',   icon: 'ri-store-3-line',      path: '/admin/pos' },
        { title: 'Products',     icon: 'ri-box-3-line',        path: '/admin/products' },
        { title: 'Sales',        icon: 'ri-price-tag-2-line',      path: '/admin/sales', exact: true },
        { title: 'End of Day',   icon: 'ri-calendar-check-line',   path: '/admin/end-of-day' },
      ]
    },
    {
      label: 'Manage',
      items: [
        { title: 'Categories',   icon: 'ri-folder-line',       path: '/admin/categories' },
        { title: 'Customers',    icon: 'ri-group-line',        path: '/admin/customers' },
        { title: 'Reviews',      icon: 'ri-chat-smile-2-line', path: '/admin/reviews' },
        { title: 'Inventory',    icon: 'ri-stack-line',        path: '/admin/inventory' },
        { title: 'Coupons',      icon: 'ri-coupon-2-line',     path: '/admin/coupons' },
      ]
    },
    {
      label: 'Insights',
      items: [
        { title: 'Analytics',         icon: 'ri-bar-chart-line',    path: '/admin/analytics' },
        { title: 'Customer Insights', icon: 'ri-user-search-line',  path: '/admin/customer-insights', moduleId: 'customer-insights' },
        { title: 'Notifications',     icon: 'ri-notification-3-line', path: '/admin/notifications',   moduleId: 'notifications' },
        { title: 'SMS Debugger',      icon: 'ri-message-2-line',    path: '/admin/test-sms' },
      ]
    },
    {
      label: 'System',
      items: [
        { title: 'Blog',    icon: 'ri-article-line', path: '/admin/blog',    moduleId: 'blog' },
        { title: 'Modules', icon: 'ri-puzzle-line',  path: '/admin/modules' },
      ]
    },
  ];

  const filteredSections = menuSections.map(section => ({
    ...section,
    items: section.items.filter(item => !item.moduleId || enabledModules.includes(item.moduleId))
  })).filter(section => section.items.length > 0);

  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <div className="min-h-screen bg-ui-100 admin-shell">

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-ui-950/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen bg-brand-deep flex flex-col
        transition-all duration-300 w-64
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarOpen ? 'lg:w-64' : 'lg:w-0 lg:overflow-hidden'}
        lg:translate-x-0
      `}>

        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 flex-shrink-0">
          <Link href="/admin" className="flex items-center gap-3 w-full min-w-0">
            <img
              src="/logo-light.png"
              alt="HairBudget"
              className="h-8 w-auto max-w-[140px] object-contain object-left"
            />
            <p className="text-[8px] font-black tracking-[0.3em] uppercase text-brand-gold hidden xl:block">Admin</p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {filteredSections.map((section) => (
            <div key={section.label}>
              <p className="text-[8px] font-black tracking-[0.5em] uppercase text-brand-cream/45 px-3 mb-2">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = item.exact ? pathname === item.path : pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer group ${
                        isActive
                          ? 'bg-white/12 text-brand-ivory'
                          : 'text-brand-cream/75 hover:bg-white/8 hover:text-brand-ivory'
                      }`}
                    >
                      <div className={`w-1 h-5 rounded-full flex-shrink-0 transition-all ${isActive ? 'bg-brand-gold' : 'bg-transparent group-hover:bg-brand-cream/30'}`} />
                      <i className={`${item.icon} text-base flex-shrink-0`} />
                      <span className="text-[13px] font-medium">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="flex-shrink-0 border-t border-white/10 p-3 space-y-1">
          <Link
            href="/"
            target="_blank"
            onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-brand-cream/75 hover:bg-white/8 hover:text-brand-ivory transition-all cursor-pointer"
          >
            <div className="w-1 h-5 rounded-full flex-shrink-0" />
            <i className="ri-external-link-line text-base flex-shrink-0" />
            <span className="text-[13px] font-medium">View Store</span>
          </Link>

          {/* User card */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-gold flex items-center justify-center flex-shrink-0 text-brand-deep font-black text-xs">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-brand-ivory capitalize">{userRole || 'Admin'}</p>
              <p className="text-[10px] text-brand-cream/55 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-brand-cream/50 hover:text-red-300 transition-colors flex-shrink-0 cursor-pointer"
            >
              <i className="ri-logout-box-line text-base" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <div className={`transition-all duration-300 ml-0 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>

        {/* Header */}
        <header className="bg-white border-b border-ui-200 sticky top-0 z-30">
          <div className="px-4 lg:px-6 py-3 flex items-center justify-between">

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-ui-500 hover:text-ui-900 hover:bg-ui-100 transition-all cursor-pointer"
              >
                <i className={`${isSidebarOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'} text-lg`} />
              </button>

              <Link
                href="/admin/sales"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide border transition-all ${
                  pathname.startsWith('/admin/sales') || pathname.startsWith('/admin/end-of-day')
                    ? 'bg-brand-forest text-brand-ivory border-brand-forest'
                    : 'bg-white text-ui-700 border-ui-200 hover:bg-ui-50'
                }`}
                title="Store-wide sale pricing"
              >
                <i className="ri-price-tag-2-line text-sm" />
                <span className="hidden sm:inline">Store-wide Sale</span>
                <span className="sm:hidden">Sale</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <AdminOrderBell />

              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-ui-100 rounded-xl transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-brand-deep text-brand-gold flex items-center justify-center font-black text-xs flex-shrink-0">
                    {user?.email?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-ui-900 capitalize">{userRole || 'Admin'}</p>
                    <p className="text-[10px] text-ui-500 max-w-[90px] truncate">{user?.email}</p>
                  </div>
                  <i className="ri-arrow-down-s-line text-ui-400 text-sm" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-ui-200 rounded-2xl shadow-xl overflow-hidden z-20">
                    <div className="px-4 py-3 border-b border-ui-100">
                      <p className="text-xs font-bold text-ui-900">{user?.email}</p>
                      <p className="text-[10px] text-ui-500 capitalize mt-0.5">{userRole}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left cursor-pointer"
                    >
                      <i className="ri-logout-box-line text-red-500" />
                      <span className="text-red-600 text-sm font-semibold">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6 tracking-normal [&_input]:tracking-normal [&_select]:tracking-normal [&_textarea]:tracking-normal">
          {children}
        </main>
      </div>
    </div>
  );
}

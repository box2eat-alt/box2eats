import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, UtensilsCrossed, ShoppingBag, Clock, X, Settings, LogOut, User as UserIcon, Shield, Heart, Info, LayoutDashboard, Package, ChefHat, CreditCard, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";

const navigationItems = [
{ title: "Home", url: createPageUrl("Home"), icon: Home },
{ title: "Menu", url: createPageUrl("Menu"), icon: UtensilsCrossed },
{ title: "Favorites", url: createPageUrl("Favorites"), icon: Heart },
{ title: "My Cart", url: createPageUrl("Cart"), icon: ShoppingBag },
{ title: "Order History", url: createPageUrl("Orders"), icon: Clock },
{ title: "How to Order", url: createPageUrl("HowToOrder"), icon: Info }];

const adminNavigationItems = [
{ title: "Dashboard", url: createPageUrl("Admin"), icon: LayoutDashboard },
{ title: "Products", url: createPageUrl("AdminProducts"), icon: Package },
{ title: "Shopify Products", url: createPageUrl("MarysKitchen"), icon: ChefHat },
{ title: "Payments", url: createPageUrl("Payments"), icon: CreditCard }];


export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('cart_items').select('*').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user
  });

  const isAdmin = user?.role === 'admin';
  const isAdminPage = location.pathname === createPageUrl("AdminPanel") ||
  location.pathname === createPageUrl("Admin") ||
  location.pathname === createPageUrl("AdminProducts") ||
  location.pathname === createPageUrl("MarysKitchen") ||
  location.pathname === createPageUrl("Payments");

  return (
    <div className="min-h-screen bg-amber-50 relative">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 rounded-r-3xl p-6 shadow-2xl transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`
        }>

        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 md:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors">

          <X className="w-5 h-5 text-gray-300" />
        </button>

        {/* Logo */}
        <div className="mb-6">
          <img
            src="/box2eats-logo.png"
            alt="Box2Eats Logo"
            className="w-32 mx-auto" />

        </div>

        <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          <nav className="space-y-2 flex-1 overflow-y-auto pr-2 pb-4 min-h-0">
            {isAdminPage && isAdmin ? (
              <>
                <button
                  onClick={() => navigate(createPageUrl("Home"))}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all mb-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">Back to App</span>
                </button>
                <div className="border-b border-gray-800 mb-2" />
                <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</p>
                {adminNavigationItems.map((item) =>
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === item.url ?
                  'text-white' :
                  'text-gray-400 hover:bg-gray-800 hover:text-white'}`
                  }
                  style={location.pathname === item.url ? { backgroundColor: '#c0282d' } : {}}>
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                )}
              </>
            ) : (
              <>
                {navigationItems.map((item) =>
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === item.url ?
                  'text-white' :
                  'text-gray-400 hover:bg-gray-800 hover:text-white'}`
                  }
                  style={location.pathname === item.url ? { backgroundColor: '#c0282d' } : {}}>
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                )}
              </>
            )}
          </nav>

          <div className="shrink-0 pt-4 pb-4 border-t border-gray-800 space-y-2">
            {/* User Profile */}
            <div className="mb-2">
              <div className="flex items-center gap-3 bg-gray-800 rounded-2xl p-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Hello,</p>
                  <p className="font-semibold text-white">
                    {user
                      ? (user.full_name?.trim()?.split(/\s+/)[0] || user.email?.split('@')[0] || 'there')
                      : 'Guest'}
                  </p>
                </div>
              </div>
            </div>

            {isAdmin && !isAdminPage && (
              <Link
                to={createPageUrl("AdminPanel")}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
              >
                <Shield className="w-5 h-5" />
                <span className="font-medium">Admin Panel</span>
              </Link>
            )}

            <Link
              to={createPageUrl("Profile")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              location.pathname === createPageUrl("Profile") ?
              'text-white' :
              'text-gray-400 hover:bg-gray-800 hover:text-white'}`
              }
              style={location.pathname === createPageUrl("Profile") ? { backgroundColor: '#c0282d' } : {}}>

              <Settings className="w-5 h-5" />
              <span className="font-medium">Setting</span>
            </Link>

            {user ? (
              <button
                type="button"
                onClick={() => {
                  supabase.auth.signOut().catch(() => {});
                  window.location.replace('/login');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer z-50"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full px-4 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen &&
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={() => setSidebarOpen(false)} />

      }

      {/* Main Content */}
      <div className="md:pl-64">
        <header className="bg-gray-900 px-6 py-4 flex items-center justify-between md:hidden sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors">

            <div className="space-y-1">
              <div className="w-5 h-0.5 bg-white"></div>
              <div className="w-5 h-0.5 bg-white"></div>
              <div className="w-5 h-0.5 bg-white"></div>
            </div>
          </button>
          <img
            src="/box2eats-logo.png"
            alt="Box2Eats Logo"
            className="h-8" />

          <div className="w-10"></div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>);

}

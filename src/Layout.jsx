import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, UtensilsCrossed, ShoppingBag, Clock, X, Settings, LogOut, User as UserIcon, Shield, ChevronDown, LayoutDashboard, Package, ChefHat, Heart, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";

const navigationItems = [
{ title: "Home", url: createPageUrl("Home"), icon: Home },
{ title: "Menu", url: createPageUrl("Menu"), icon: UtensilsCrossed },
{ title: "Favorites", url: createPageUrl("Favorites"), icon: Heart },
{ title: "My Cart", url: createPageUrl("Cart"), icon: ShoppingBag },
{ title: "Order History", url: createPageUrl("Orders"), icon: Clock },
{ title: "How to Order", url: createPageUrl("HowToOrder"), icon: Info }];


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
  const isAdminPage = location.pathname === createPageUrl("Admin") ||
  location.pathname === createPageUrl("AdminProducts") ||
  location.pathname === createPageUrl("MarysKitchen");

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

        <div className="flex flex-col h-[calc(100vh-140px)]">
          <nav className="space-y-2 flex-1 overflow-y-auto pr-2 pb-8">
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

            {/* Admin Panel Dropdown - Only visible to admins */}
            {isAdmin &&
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isAdminPage ?
                  'text-white' :
                  'text-gray-400 hover:bg-gray-800 hover:text-white'}`
                  }
                  style={isAdminPage ? { backgroundColor: '#c0282d' } : {}}>

                    <Shield className="w-5 h-5" />
                    <span className="font-medium flex-1 text-left">Admin Panel</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                className="w-56 bg-gray-800 border-gray-700"
                side="bottom"
                align="start">

                  <DropdownMenuItem asChild>
                    <Link
                    to={createPageUrl("Admin")}
                    className={`flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer ${
                    location.pathname === createPageUrl("Admin") ? 'bg-gray-700 text-white' : ''}`
                    }>

                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                    to={createPageUrl("AdminProducts")}
                    className={`flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer ${
                    location.pathname === createPageUrl("AdminProducts") ? 'bg-gray-700 text-white' : ''}`
                    }>

                      <Package className="w-4 h-4" />
                      Products
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div
                        className={`flex items-center justify-between gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer ${
                        location.pathname === createPageUrl("MarysKitchen") ? 'bg-gray-700 text-white' : ''}`
                        }>
                        <div className="flex items-center gap-3">
                          <ChefHat className="w-4 h-4" />
                          <span>Mary's Kitchen</span>
                        </div>
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56 bg-gray-800 border-gray-700"
                      side="bottom"
                      align="start">
                      <DropdownMenuItem asChild>
                        <Link
                          to={createPageUrl("MarysKitchen")}
                          className={`flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer ${
                          location.pathname === createPageUrl("MarysKitchen") ? 'bg-gray-700 text-white' : ''}`
                          }>
                          Shopify Products
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          to={createPageUrl("Payments")}
                          className={`flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer ${
                          location.pathname === createPageUrl("Payments") ? 'bg-gray-700 text-white' : ''}`
                          }>
                          Payments
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          </nav>

          <div className="mt-8 mb-10 pt-8 border-t border-gray-800 space-y-2">
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

            {user ?
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try { await logout(); } catch (_) {}
                window.location.href = '/login';
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all cursor-pointer">

                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button> :

            <button
              onClick={() => navigate('/login')}
              className="w-full px-4 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors">

                Sign In
              </button>
            }
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

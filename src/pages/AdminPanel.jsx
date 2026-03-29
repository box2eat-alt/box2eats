import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Package, ChefHat, CreditCard, ArrowLeft } from "lucide-react";

const adminNavItems = [
  { title: "Dashboard", url: createPageUrl("Admin"), icon: LayoutDashboard },
  { title: "Products", url: createPageUrl("AdminProducts"), icon: Package },
  { title: "Shopify Products", url: createPageUrl("MarysKitchen"), icon: ChefHat },
  { title: "Payments", url: createPageUrl("Payments"), icon: CreditCard },
];

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user && user.role !== 'admin') {
      window.location.href = '/';
    }
  }, [user, isAuthenticated, navigate]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(createPageUrl("Home"))}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Manage your store, products, and orders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminNavItems.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              className="group block p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
                  <item.icon className="w-6 h-6 text-gray-600 group-hover:text-red-600 transition-colors" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
              </div>
              <p className="text-sm text-gray-500">
                {item.title === "Dashboard" && "View orders, users, and analytics"}
                {item.title === "Products" && "Add, edit, and manage products"}
                {item.title === "Shopify Products" && "Sync products from Shopify"}
                {item.title === "Payments" && "View and manage payments"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

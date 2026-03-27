import React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, ChevronRight, Clock, MapPin, Calendar, Info, Truck, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProductCard from "../components/menu/ProductCard";

const categories = [
{ name: "Breakfast", image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=400&fit=crop", value: "breakfast" },
{ name: "Lunch", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop", value: "lunch" },
{ name: "Dinner", image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop", value: "dinner" },
{ name: "Snacks", image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop", value: "snacks" },
{ name: "Desserts", image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop", value: "desserts" }];



export default function Home() {
  const { user } = useAuth();

  const { data: allActiveProducts = [], isLoading } = useQuery({
    queryKey: ['activeProducts'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').eq('in_stock', true);
      return data || [];
    }
  });

  const featuredProducts = React.useMemo(() => {
    if (allActiveProducts.length === 0) return [];
    const shuffled = [...allActiveProducts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 8);
  }, [allActiveProducts]);

  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      {/* Red Banner - Full Width Behind Nav */}
      <div className="bg-[#c0282d] text-white py-4 -mx-6 md:-mx-8 md:mr-0 md:-ml-64 mb-6">
        <div className="px-6 md:pl-64 md:pr-8">
          <div className="max-w-4xl md:ml-8">
            <p className="text-2xl font-bold text-center md:text-left">A meal prep service that prioritizes health, taste and convenience!</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <p className="text-gray-500 text-sm mb-1">What's on your bucket</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Grab your<br />delicious meal!
        </h1>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Input
            placeholder="Search for meals..."
            className="bg-white h-12 pl-4 pr-12 rounded-lg border-gray-200" />

          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Explore Categories</h2>
            <Link to={createPageUrl("Menu")}>
              <button className="text-[#bd261e] text-sm font-medium flex items-center gap-1">
                see all
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {categories.map((category) =>
            <Link
              key={category.name}
              to={createPageUrl("Menu")}
              className="flex flex-col items-center">

                <div className="w-full aspect-square bg-white rounded-3xl shadow-sm overflow-hidden mb-2 hover:shadow-md transition-shadow">
                  <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover" />

                </div>
                <span className="text-xs font-medium text-gray-700">{category.name}</span>
              </Link>
            )}
          </div>
        </div>

        {/* How to Order & Delivery Schedule */}
        <section className="mb-10 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-[#d71e14] opacity-10 transform skew-x-12"></div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <span className="bg-white/10 text-blue-300 p-2 rounded-lg mr-3">
                  <Info className="w-4 h-4" />
                </span>
                How to Order
              </h3>
              <div className="space-y-6 relative pl-2">
                <div className="absolute left-[27px] top-8 bottom-4 w-0.5 bg-gray-600/50"></div>
                <div className="relative flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white text-gray-900 flex items-center justify-center font-bold z-10 shadow-lg">1</div>
                  <div className="pt-1">
                    <h4 className="font-bold text-base text-white">Select Your Meals</h4>
                    <p className="text-sm text-gray-300 mt-1">Browse our menu and add your favorite healthy meals to the cart.</p>
                  </div>
                </div>
                <div className="relative flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white text-gray-900 flex items-center justify-center font-bold z-10 shadow-lg">2</div>
                  <div className="pt-1">
                    <h4 className="font-bold text-base text-white">Choose Delivery Date</h4>
                    <p className="text-sm text-gray-300 mt-1">Delivery every Tuesday from your preferred location or drop off.</p>
                  </div>
                </div>
                <div className="relative flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white text-gray-900 flex items-center justify-center font-bold z-10 shadow-lg">3</div>
                  <div className="pt-1">
                    <h4 className="font-bold text-base text-white">Enjoy & Repeat</h4>
                    <p className="text-sm text-gray-300 mt-1">Heat up your meals in minutes and enjoy fresh, macro-balanced food.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <span className="bg-white/10 text-green-300 p-2 rounded-lg mr-3">
                  <Truck className="w-4 h-4" />
                </span>
                Delivery Schedule
              </h3>
              <div className="flex-1 flex flex-col justify-center space-y-4">
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">ORDER DEADLINE</span>
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="font-bold text-lg text-white">Every Sunday by 11:59 AM</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Delivery Day</span>
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="font-bold text-lg text-white">Every Tuesday</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">ORDER WINDOW</span>
                    <Bell className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="font-bold text-lg text-white">Friday, Saturday & Sunday Only</p>
                </div>
                <div className="bg-[#c0282d] backdrop-blur-sm p-4 rounded-xl border border-red-400/20">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">Menu Updates</span>
                    <ChevronRight className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-bold text-lg text-white">Menu Meals Change Weekly</p>
                </div>

                </div>
            </div>
          </div>
        </section>

        {/* Most Popular */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Most Popular</h2>
            <Link to={createPageUrl("Menu")}>
              <button className="text-[#bd261e] text-sm font-medium flex items-center gap-1">
                see all
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          {isLoading ?
          <div className="space-y-4">
              {[1, 2, 3].map((i) =>
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse"></div>
            )}
            </div> :

          <div className="space-y-3">
              {featuredProducts.slice(0, 3).map((product) =>
            <ProductCard key={product.id} product={product} compact />
            )}
            </div>
          }
        </div>


      </div>
    </div>);

}

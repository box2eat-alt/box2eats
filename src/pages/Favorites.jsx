import React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import ProductCard from "../components/menu/ProductCard";

export default function Favorites() {
  const { user, isAuthenticated } = useAuth();

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*');
      return data ?? [];
    },
  });

  const favoriteProducts = products.filter(p => 
    favorites.some(f => f.product_id === p.id)
  );

  const isLoading = favoritesLoading || productsLoading;

  if (!isAuthenticated) {
    return (
      <div className="bg-[#ffffff] p-6 min-h-screen md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Please sign in to view your favorites</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#ffffff] p-6 min-h-screen md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-8 h-8 text-[#d71e14] fill-[#d71e14]" />
            <h1 className="text-3xl font-bold text-[#2C2C2C]">My Favorites</h1>
          </div>
          <p className="text-gray-600">Your saved favorite meals</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white/50 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : favoriteProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No favorites yet</p>
            <p className="text-sm text-gray-400">
              Start adding products to your favorites by clicking the heart icon
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

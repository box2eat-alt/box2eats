import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Star, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function ProductCard({ product, compact = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const getPriceDisplay = () => {
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants.map(v => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      if (minPrice === maxPrice) {
        return { type: 'single', price: minPrice };
      }
      return { type: 'range', min: minPrice, max: maxPrice };
    }
    
    if (product.large_price) {
      return { type: 'sizes', regular: product.price, large: product.large_price };
    }
    
    return { type: 'single', price: product.price };
  };

  const priceDisplay = getPriceDisplay();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', product.id],
    queryFn: async () => {
      const { data } = await supabase.from('reviews').select('*').eq('product_id', product.id);
      return data ?? [];
    },
  });

  const isFavorited = favorites.some(f => f.product_id === product.id);
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "4.8";

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      if (isFavorited) {
        const favorite = favorites.find(f => f.product_id === product.id);
        await supabase.from('favorites').delete().eq('id', favorite.id);
      } else {
        await supabase.from('favorites').insert({
          product_id: product.id,
          user_id: user.id
        }).select().single();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    toggleFavoriteMutation.mutate();
  };

  if (compact) {
    return (
      <Link to={createPageUrl("ProductDetails") + `?id=${product.id}`}>
        <div className="bg-stone-100 my-5 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
          <img
            src={product.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"}
            alt={product.name}
            className="w-24 h-24 object-cover rounded-xl" />

          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-[#2C2C2C] mb-1">{product.name}</h3>
                <p className="text-xs text-[#2C2C2C]/50 line-clamp-1">{product.description}</p>
              </div>
              <button 
                onClick={handleFavoriteClick}
                className="p-2 hover:bg-[#F4C430]/10 rounded-lg"
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-[#d71e14] text-[#d71e14]' : 'text-[#2C2C2C]/30'}`} />
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  {priceDisplay.type === 'range' ? (
                    <span className="text-lg font-bold text-[#2C2C2C]">
                      ${priceDisplay.min} - ${priceDisplay.max}
                    </span>
                  ) : priceDisplay.type === 'sizes' ? (
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-xs text-[#2C2C2C]/60 block">Regular</span>
                        <span className="text-lg font-bold text-[#2C2C2C]">${priceDisplay.regular}</span>
                      </div>
                      <div className="h-8 w-px bg-gray-300"></div>
                      <div>
                        <span className="text-xs text-[#2C2C2C]/60 block">Large</span>
                        <span className="text-lg font-bold text-[#2C2C2C]">${priceDisplay.large}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-[#2C2C2C]">${priceDisplay.price}</span>
                    )}
                    </div>
                    </div>
            </div>
          </div>
        </div>
      </Link>);

  }

  return (
    <Link to={createPageUrl("ProductDetails") + `?id=${product.id}`}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="relative">
          <img
            src={product.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
            alt={product.name}
            className="w-full h-48 object-cover" />

          <button 
            onClick={handleFavoriteClick}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-[#F4C430]/10"
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-[#d71e14] text-[#d71e14]' : 'text-[#2C2C2C]/30'}`} />
          </button>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-[#2C2C2C] mb-2 line-clamp-1">{product.name}</h3>
          <p className="text-sm text-[#2C2C2C]/50 mb-3 line-clamp-2">{product.description}</p>
          <div className="flex items-center justify-between">
            <div>
              {priceDisplay.type === 'range' ? (
                <span className="text-xl font-bold text-[#2C2C2C]">
                  ${priceDisplay.min} - ${priceDisplay.max}
                </span>
              ) : priceDisplay.type === 'sizes' ? (
                <div className="flex items-baseline gap-3">
                  <div>
                    <span className="text-xs text-[#2C2C2C]/60 block">Regular</span>
                    <span className="text-xl font-bold text-[#2C2C2C]">${priceDisplay.regular}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#2C2C2C]/60 block">Large</span>
                    <span className="text-xl font-bold text-[#2C2C2C]">${priceDisplay.large}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-xl font-bold text-[#2C2C2C]">${priceDisplay.price}</span>
                  <span className="text-sm text-[#2C2C2C]/30 line-through ml-2">${(priceDisplay.price * 1.2).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 bg-[#F4C430] px-3 py-1 rounded-lg">
              <Star className="w-4 h-4 fill-white text-white" />
              <span className="text-sm font-semibold text-white">{averageRating}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>);

}

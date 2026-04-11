import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Minus, Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReviewCard from "../components/reviews/ReviewCard";
import ReviewForm from "../components/reviews/ReviewForm";

export default function ProductDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("regular");
  const [selectedVariant, setSelectedVariant] = useState(null);
  const { user } = useAuth();
  
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*');
      const products = data ?? [];
      return products.find(p => p.id === productId);
    },
    enabled: !!productId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const { data } = await supabase.from('reviews').select('*').eq('product_id', productId).order('created_date', { ascending: false });
      return data ?? [];
    },
    enabled: !!productId,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const isFavorited = favorites.some(f => f.product_id === productId);
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "4.8";

  React.useEffect(() => {
    if (product?.variants && product.variants.length > 0 && !selectedVariant) {
      setSelectedVariant(product.variants[0]);
    }
  }, [product]);

  const getCurrentPrice = () => {
    if (selectedVariant) {
      return selectedVariant.price;
    }
    return selectedSize === "large" && product.large_price ? product.large_price : product.price;
  };

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      const currentPrice = getCurrentPrice();
      let productName = product.name;
      if (selectedVariant) {
        productName = `${product.name} - ${selectedVariant.size} ${selectedVariant.name}`;
      } else if (selectedSize === "large") {
        productName = `${product.name} (Large)`;
      }

      const { data: existingItems } = await supabase.from('cart_items').select('*').eq('user_id', user.id).eq('product_id', productId);
      const items = existingItems ?? [];

      if (items.length > 0) {
        await supabase.from('cart_items').update({
          quantity: items[0].quantity + quantity
        }).eq('id', items[0].id);
      } else {
        await supabase.from('cart_items').insert({
          product_id: productId,
          product_name: productName,
          product_price: currentPrice,
          product_image: product.image_url,
          quantity: quantity,
          user_id: user.id
        }).select().single();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      navigate(createPageUrl("Cart"));
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      if (isFavorited) {
        const favorite = favorites.find(f => f.product_id === productId);
        await supabase.from('favorites').delete().eq('id', favorite.id);
      } else {
        await supabase.from('favorites').insert({
          product_id: productId,
          user_id: user.id
        }).select().single();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData) => {
      if (!user) {
        navigate('/login');
        return;
      }
      await supabase.from('reviews').insert({
        product_id: productId,
        user_id: user.id,
        user_name: user.full_name || 'Anonymous',
        rating: reviewData.rating,
        comment: reviewData.comment
      }).select().single();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-[#2C2C2C]/50">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-6 md:p-12">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#2C2C2C]/60 mb-8 hover:text-[#2C2C2C] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="relative">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-12 flex items-center justify-center">
              <img
                src={product.image_url || "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600"}
                alt={product.name}
                className="w-full max-w-md object-contain drop-shadow-2xl"
              />
            </div>
            <button 
              onClick={() => toggleFavoriteMutation.mutate()}
              className="absolute top-6 right-6 p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            >
              <Heart className={`w-6 h-6 ${isFavorited ? 'fill-[#d71e14] text-[#d71e14]' : 'text-[#2C2C2C]/30'}`} />
            </button>
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            <div className="mb-6">
              <div className="mb-4">
                <h1 className="text-4xl font-bold text-[#2C2C2C]">{product.name}</h1>
              </div>
              <p className="text-[#2C2C2C]/60 text-lg mb-6">{product.description}</p>
              
              {/* Dietary Tags */}
              {product.dietary_tags && product.dietary_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {product.dietary_tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Nutrition Info */}
              {(product.calories || product.protein) && (
                <div className="flex gap-6 mb-6">
                  {product.calories && (
                    <div>
                      <p className="text-sm text-[#2C2C2C]/50">Calories</p>
                      <p className="text-lg font-semibold text-[#2C2C2C]">{product.calories}</p>
                    </div>
                  )}
                  {product.protein && (
                    <div>
                      <p className="text-sm text-[#2C2C2C]/50">Protein</p>
                      <p className="text-lg font-semibold text-[#2C2C2C]">{product.protein}g</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Variant Selection */}
              {product.variants && product.variants.length > 0 ? (
                <div className="mb-6">
                  <span className="text-lg font-semibold text-[#2C2C2C] block mb-3">Select Option:</span>
                  <div className="grid grid-cols-2 gap-3">
                    {product.variants.map((variant, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedVariant(variant)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedVariant === variant
                            ? "border-[#c0282d] bg-red-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold text-[#2C2C2C] capitalize text-sm">
                          {variant.size} - {variant.name}
                        </div>
                        <div className="text-xl font-bold text-[#c0282d]">${variant.price}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : product.large_price ? (
                <div className="mb-6">
                  <span className="text-lg font-semibold text-[#2C2C2C] block mb-3">Select Size:</span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedSize("regular")}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        selectedSize === "regular"
                          ? "border-[#c0282d] bg-red-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold text-[#2C2C2C]">Regular</div>
                      <div className="text-2xl font-bold text-[#c0282d]">${product.price}</div>
                    </button>
                    <button
                      onClick={() => setSelectedSize("large")}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        selectedSize === "large"
                          ? "border-[#c0282d] bg-red-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold text-[#2C2C2C]">Large</div>
                      <div className="text-2xl font-bold text-[#c0282d]">${product.large_price}</div>
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex items-baseline gap-3 mb-8">
                <span className="text-5xl font-bold text-[#2C2C2C]">${getCurrentPrice()}</span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-6 mb-8">
              <span className="text-lg font-semibold text-[#2C2C2C]">Quantity:</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Minus className="w-5 h-5 text-[#2C2C2C]" />
                </button>
                <span className="text-2xl font-bold text-[#2C2C2C] w-16 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-5 h-5 text-[#2C2C2C]" />
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={() => {
                if (!user) { navigate('/login'); return; }
                addToCartMutation.mutate();
              }}
              disabled={addToCartMutation.isPending}
              className="w-full h-16 bg-[#c0282d] hover:bg-[#a02125] text-white rounded-2xl text-lg font-semibold"
            >
              {addToCartMutation.isPending ? "Adding..." : `Add to Cart - $${(getCurrentPrice() * quantity).toFixed(2)}`}
            </Button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[#2C2C2C] mb-8">Customer Reviews</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-[#2C2C2C] mb-4">Write a Review</h3>
              <ReviewForm 
                onSubmit={(data) => submitReviewMutation.mutate(data)}
                isSubmitting={submitReviewMutation.isPending}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-[#2C2C2C] mb-4">
                All Reviews ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No reviews yet. Be the first to review!</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

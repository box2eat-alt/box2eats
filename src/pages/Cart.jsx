import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CartItemCard from "../components/cart/CartItemCard";
import CheckoutForm from "../components/cart/CheckoutForm";

export default function Cart() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cartItems', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('cart_items').select('*').eq('user_id', user.id);
      return data ?? [];
    },
    enabled: !!user
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }) => {
      const { data } = await supabase.from('cart_items').update({ quantity }).eq('id', itemId).select().single();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId) => {
      await supabase.from('cart_items').delete().eq('id', itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
    }
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const orderNumber = `ORD-${Date.now()}`;

      const { data: products } = await supabase.from('products').select('*');
      const productMap = new Map((products ?? []).map(p => [p.id, p]));

      const items = cartItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.product_price,
        shopify_variant_id: productMap.get(item.product_id)?.shopify_variant_id
      }));

      const subtotalForOrder = cartItems.reduce((sum, item) => sum + item.product_price * item.quantity, 0);
      const deliveryFee = orderData.order_type === "delivery" ? 10 : 5;
      const totalForOrder = subtotalForOrder + deliveryFee;

      const { error: orderError } = await supabase.from('orders').insert({
        order_number: orderNumber,
        items,
        total: totalForOrder,
        user_id: user.id,
        user_email: orderData.email || user.email,
        customer_first_name: orderData.first_name,
        customer_last_name: orderData.last_name,
        phone_number: orderData.phone_number,
        order_type: orderData.order_type || 'pickup',
        pickup_location: orderData.pickup_location,
        pickup_address: orderData.pickup_address || null,
        delivery_address: orderData.order_type === 'delivery' ? orderData.delivery_address : null,
        delivery_instructions: orderData.delivery_instructions || null,
        status: 'pending'
      });
      if (orderError) throw orderError;

      const { error: cartError } = await supabase.from('cart_items').delete().eq('user_id', user.id);
      if (cartError) throw cartError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      navigate(createPageUrl("Orders"));
    }
  });

  const subtotal = cartItems.reduce((sum, item) => sum + item.product_price * item.quantity, 0);

  if (!user) return null;

  if (showCheckout) {
    return <CheckoutForm
      total={subtotal}
      onBack={() => setShowCheckout(false)}
      onSubmit={(data) => placeOrderMutation.mutate(data)}
      isProcessing={placeOrderMutation.isPending} />;
  }

  return (
    <div className="bg-[#ffffff] p-6 min-h-screen md:p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#2C2C2C]/60 mb-6 hover:text-[#2C2C2C]">

          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <h1 className="text-3xl font-bold text-[#2C2C2C] mb-6">My Cart</h1>

        {cartItems.length === 0 ?
        <div className="bg-stone-100 py-16 text-center rounded-2xl">
            <ShoppingBag className="w-16 h-16 text-[#2C2C2C]/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#2C2C2C] mb-2">Your cart is empty</h3>
            <p className="text-[#2C2C2C]/50 mb-6">Start adding delicious meals</p>
            <Button
            onClick={() => navigate(createPageUrl("Menu"))} className="bg-[#d71e14] text-white px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-[#E5B000]">


              Browse Menu
            </Button>
          </div> :

        <>
            <div className="space-y-4 mb-6">
              {cartItems.map((item) =>
            <CartItemCard
              key={item.id}
              item={item}
              onUpdateQuantity={(quantity) =>
              updateQuantityMutation.mutate({ itemId: item.id, quantity })
              }
              onRemove={() => removeItemMutation.mutate(item.id)} />

            )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm mb-24">
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-[#2C2C2C]">Total</span>
                  <span className="text-[#d71e14] text-2xl font-bold">${subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 md:left-64 p-6 bg-gradient-to-t from-white via-white to-transparent">
              <div className="max-w-2xl mx-auto">
                <Button
                onClick={() => setShowCheckout(true)}
                className="w-full h-14 bg-[#2C2C2C] hover:bg-[#2C2C2C]/90 text-white rounded-2xl text-base font-semibold">

                  Proceed to Checkout
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </>
        }
      </div>
    </div>);

}

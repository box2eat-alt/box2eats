import React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderCard from "../components/orders/OrderCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Orders() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user
  });

  const reorderMutation = useMutation({
    mutationFn: async (order) => {
      const { data: products } = await supabase.from('products').select('*');
      const productMap = new Map((products ?? []).map(p => [p.id, p]));

      for (const item of order.items) {
        const product = productMap.get(item.product_id);
        if (!product || !product.in_stock) continue;

        const { data: existingItems } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('product_id', item.product_id);

        if (existingItems && existingItems.length > 0) {
          await supabase
            .from('cart_items')
            .update({ quantity: existingItems[0].quantity + item.quantity })
            .eq('id', existingItems[0].id)
            .select()
            .single();
        } else {
          await supabase.from('cart_items').insert({
            product_id: item.product_id,
            product_name: product.name,
            product_price: product.price,
            product_image: product.image_url,
            quantity: item.quantity,
            user_id: user.id
          }).select().single();
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartItems'] });
      navigate(createPageUrl("Cart"));
    },
  });

  if (!user) return null;

  return (
    <div className="bg-[#ffffff] p-6 min-h-screen from-orange-50 to-white md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Your Orders</h1>
          <p className="text-gray-600">Track and view your order history</p>
        </div>

        {isLoading ?
        <div className="space-y-4">
            {[1, 2, 3].map((i) =>
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
          )}
          </div> :
        orders.length === 0 ?
        <div className="bg-stone-100 py-16 text-center rounded-2xl shadow-sm">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600">Your order history will appear here</p>
          </div> :

        <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id}>
                <OrderCard order={order} />
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reorderMutation.mutate(order)}
                    disabled={reorderMutation.isPending}
                    className="text-[#d71e14] border-[#d71e14] hover:bg-[#d71e14] hover:text-white"
                  >
                    {reorderMutation.isPending ? "Adding to Cart..." : "Reorder"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>);

}

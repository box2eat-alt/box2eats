import React, { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calendar, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Payments() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*');
      return data ?? [];
    },
    enabled: !!user
  });

  const paidOrders = orders.filter(order => order.status !== 'cancelled');

  // Calculate costs and profits
  const calculateOrderBreakdown = (order) => {
    const productMap = new Map(products.map(p => [p.id, p]));
    let totalCost = 0;
    let totalRevenue = 0;

    order.items.forEach(item => {
      const product = productMap.get(item.product_id);
      if (product) {
        const itemCost = product.cost || 0;
        totalCost += itemCost * item.quantity;
        totalRevenue += item.price * item.quantity;
      } else {
        totalRevenue += item.price * item.quantity;
      }
    });

    return {
      revenue: totalRevenue,
      costToMary: totalCost,
      profit: totalRevenue - totalCost
    };
  };

  const totals = paidOrders.reduce((acc, order) => {
    const breakdown = calculateOrderBreakdown(order);
    return {
      revenue: acc.revenue + breakdown.revenue,
      costToMary: acc.costToMary + breakdown.costToMary,
      profit: acc.profit + breakdown.profit
    };
  }, { revenue: 0, costToMary: 0, profit: 0 });

  if (!user) return null;

  return (
    <div className="bg-white p-6 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Payments</h1>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">${totals.revenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Owed to Mary</CardTitle>
              <DollarSign className="w-5 h-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">${totals.costToMary.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Our Profit</CardTitle>
              <DollarSign className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">${totals.profit.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Paid Orders</CardTitle>
              <CreditCard className="w-5 h-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{paidOrders.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Order #</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Revenue</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Owed to Mary</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Profit</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paidOrders.map((order) => {
                    const breakdown = calculateOrderBreakdown(order);
                    return (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{order.order_number}</td>
                        <td className="py-3 px-4 text-sm">{order.customer_first_name} {order.customer_last_name}</td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(order.created_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold">${breakdown.revenue.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-orange-600">${breakdown.costToMary.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-green-600">${breakdown.profit.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            Paid
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

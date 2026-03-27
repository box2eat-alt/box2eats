import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, DollarSign, TrendingUp, Users, Clock, CheckCircle, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['allOrders'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['allProducts'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*');
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleSyncProducts = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      // TODO: Implement Supabase Edge Function for Shopify sync
      console.warn('Shopify sync not yet migrated to Supabase Edge Functions');
      setSyncResult({ error: 'Shopify sync not yet migrated to Supabase Edge Functions' });
    } catch (error) {
      setSyncResult({ error: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }) => {
      const { data } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId).select().single();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
    },
  });

  if (!user || user.role !== 'admin') {
    return null;
  }

  const todayOrders = orders.filter(order => {
    const orderDateVancouver = formatInTimeZone(new Date(order.created_date), "America/Vancouver", "yyyy-MM-dd");
    const todayVancouver = formatInTimeZone(new Date(), "America/Vancouver", "yyyy-MM-dd");
    return orderDateVancouver === todayVancouver;
  });

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
  const completedOrders = orders.filter(o => o.status === 'delivered');

  const statusConfig = {
    pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pending" },
    confirmed: { color: "bg-blue-100 text-blue-800", icon: CheckCircle, label: "Confirmed" },
    preparing: { color: "bg-purple-100 text-purple-800", icon: Package, label: "Preparing" },
    out_for_delivery: { color: "bg-orange-100 text-orange-800", icon: Package, label: "Out for Delivery" },
    delivered: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Delivered" },
    cancelled: { color: "bg-red-100 text-red-800", icon: Clock, label: "Cancelled" }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage orders, products, and view analytics</p>
            </div>
            <Button
              onClick={handleSyncProducts}
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Products'}
            </Button>
          </div>

          {syncResult && (
            <div className={`p-4 rounded-lg mb-4 ${
              syncResult.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
            }`}>
              {syncResult.error ? (
                <p className="font-semibold">Sync Failed: {syncResult.error}</p>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold">✓ Sync Successful!</p>
                  <p className="text-sm">
                    Synced {syncResult.synced} products • 
                    Created {syncResult.created} new • 
                    Updated {syncResult.updated} existing
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Today's Orders</p>
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{todayOrders.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total: {orders.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Today's Revenue</p>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">${todayRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Total: ${totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Pending Orders</p>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{pendingOrders.length}</p>
              <p className="text-xs text-gray-500 mt-1">Needs attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Products</p>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{products.length}</p>
              <p className="text-xs text-gray-500 mt-1">In catalog</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All Orders</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4 mt-4">
                {isLoading ? (
                  <p className="text-center py-8 text-gray-500">Loading orders...</p>
                ) : orders.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No orders yet</p>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{order.order_number}</p>
                          <p className="text-sm text-gray-600">{order.user_email}</p>
                          <p className="text-xs text-gray-500">
                            {formatInTimeZone(new Date(order.created_date), "America/Vancouver", "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <div className="text-right">
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) => updateOrderStatusMutation.mutate({ orderId: order.id, newStatus })}
                          >
                            <SelectTrigger className="w-40 mb-2">
                              <SelectValue>
                                <Badge className={statusConfig[order.status]?.color || statusConfig.pending.color}>
                                  {statusConfig[order.status]?.label || order.status}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-lg font-bold text-gray-900">${order.total.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p className="font-medium mb-1">Items:</p>
                        {order.items?.map((item, idx) => (
                          <p key={idx} className="text-xs">• {item.product_name} x{item.quantity}</p>
                        ))}
                      </div>
                      {order.delivery_address && (
                        <p className="text-xs text-gray-500 mt-2">📍 {order.delivery_address}</p>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="pending" className="space-y-4 mt-4">
                {pendingOrders.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No pending orders</p>
                ) : (
                  pendingOrders.map(order => (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{order.order_number}</p>
                          <p className="text-sm text-gray-600">{order.user_email}</p>
                          <p className="text-xs text-gray-500">
                            {formatInTimeZone(new Date(order.created_date), "America/Vancouver", "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <div className="text-right">
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) => updateOrderStatusMutation.mutate({ orderId: order.id, newStatus })}
                          >
                            <SelectTrigger className="w-40 mb-2">
                              <SelectValue>
                                <Badge className={statusConfig[order.status]?.color || statusConfig.pending.color}>
                                  {statusConfig[order.status]?.label || order.status}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-lg font-bold text-gray-900">${order.total.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p className="font-medium mb-1">Items:</p>
                        {order.items?.map((item, idx) => (
                          <p key={idx} className="text-xs">• {item.product_name} x{item.quantity}</p>
                        ))}
                      </div>
                      {order.delivery_address && (
                        <p className="text-xs text-gray-500 mt-2">📍 {order.delivery_address}</p>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4 mt-4">
                {completedOrders.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No completed orders</p>
                ) : (
                  completedOrders.map(order => (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{order.order_number}</p>
                          <p className="text-sm text-gray-600">{order.user_email}</p>
                          <p className="text-xs text-gray-500">
                            {formatInTimeZone(new Date(order.created_date), "America/Vancouver", "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-100 text-green-800">
                            Delivered
                          </Badge>
                          <p className="text-lg font-bold text-gray-900 mt-2">${order.total.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p className="font-medium mb-1">Items:</p>
                        {order.items?.map((item, idx) => (
                          <p key={idx} className="text-xs">• {item.product_name} x{item.quantity}</p>
                        ))}
                      </div>
                      {order.delivery_address && (
                        <p className="text-xs text-gray-500 mt-2">📍 {order.delivery_address}</p>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

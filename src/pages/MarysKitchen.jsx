
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, Package, ExternalLink, Search } from "lucide-react";

export default function MarysKitchen() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user && user.role !== 'admin') {
      window.location.href = '/';
    }
  }, [user, isAuthenticated, navigate]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['allProducts'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').order('updated_date', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleSyncProducts = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-products');
      if (error) throw error;
      setSyncResult(data);
      queryClient.invalidateQueries({ queryKey: ['allProducts'] });
    } catch (error) {
      setSyncResult({ error: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      product.shopify_id?.includes(query) ||
      product.dietary_tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const activeProducts = filteredProducts.filter(p => p.in_stock);
  const inactiveProducts = filteredProducts.filter(p => !p.in_stock);
  const featuredProducts = filteredProducts.filter(p => p.featured);

  const SHOPIFY_STORE_URL = "box2eats.myshopify.com";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Mary's Kitchen</h1>
              <p className="text-gray-600">Shopify product sync & overview</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => window.open(`https://${SHOPIFY_STORE_URL}/admin/products`, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Shopify
              </Button>
              <Button
                onClick={handleSyncProducts}
                disabled={isSyncing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </div>

          {syncResult && (
            <div className={`p-4 rounded-lg mb-6 ${
              syncResult.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
            }`}>
              {syncResult.error ? (
                <p className="font-semibold">❌ Sync Failed: {syncResult.error}</p>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold">✓ Sync Successful!</p>
                  <p className="text-sm">
                    Updated {syncResult.updated} existing products • 
                    Skipped {syncResult.skipped} products not in your catalog
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Products</p>
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{filteredProducts.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {searchQuery ? `Filtered from ${products.length}` : 'In catalog'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Active</p>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-600">{activeProducts.length}</p>
              <p className="text-xs text-gray-500 mt-1">In stock</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Inactive</p>
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-red-600">{inactiveProducts.length}</p>
              <p className="text-xs text-gray-500 mt-1">Out of stock</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Featured</p>
                <Package className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold text-yellow-600">{featuredProducts.length}</p>
              <p className="text-xs text-gray-500 mt-1">Highlighted</p>
            </CardContent>
          </Card>
        </div>

        {/* Product List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Products</CardTitle>
              {/* Search Bar */}
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search products, categories, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-gray-500">Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'No products match your search' : 'No products synced yet'}
                </p>
                {!searchQuery && (
                  <Button onClick={handleSyncProducts} className="bg-blue-600 hover:bg-blue-700">
                    Sync Products from Shopify
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map(product => (
                  <div key={product.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    <img
                      src={product.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100"}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-600">{product.category}</p>
                        </div>
                        <div className="flex gap-2">
                          {product.featured && (
                            <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>
                          )}
                          <Badge variant={product.in_stock ? "default" : "secondary"}>
                            {product.in_stock ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-bold text-gray-900">${product.price}</span>
                        {product.shopify_id && (
                          <span className="text-gray-500">Shopify ID: {product.shopify_id}</span>
                        )}
                        {product.dietary_tags && product.dietary_tags.length > 0 && (
                          <div className="flex gap-1">
                            {product.dietary_tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus, Trash2, Search, RefreshCw } from "lucide-react";

export default function AdminProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [expandedVariants, setExpandedVariants] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const queryClient = useQueryClient();

  const toggleVariantExpansion = (index) => {
    setExpandedVariants(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['allProducts'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const createProductMutation = useMutation({
    mutationFn: async (productData) => {
      const { data } = await supabase.from('products').insert(productData).select().single();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProducts'] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data: productData }) => {
      const { data } = await supabase.from('products').update(productData).eq('id', id).select().single();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProducts'] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id) => {
      await supabase.from('products').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProducts'] });
    },
  });

  const handleSyncShopify = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      // TODO: Implement Supabase Edge Function for Shopify sync
      console.warn('Shopify sync not yet migrated to Supabase Edge Functions');
      setSyncResult({ error: 'Shopify sync not yet migrated to Supabase Edge Functions' });
      setTimeout(() => setSyncResult(null), 5000);
    } catch (error) {
      setSyncResult({ error: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    regular_variant: "",
    large_price: 0,
    large_variant: "",
    cost: 0,
    large_cost: 0,
    variants: [],
    image_url: "",
    images: [],
    categories: [],
    calories: 0,
    protein: 0,
    in_stock: true,
    featured: false,
    dietary_tags: [],
    shopify_id: ""
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      regular_variant: "",
      large_price: 0,
      large_variant: "",
      cost: 0,
      large_cost: 0,
      variants: [],
      image_url: "",
      images: [],
      categories: [],
      calories: 0,
      protein: 0,
      in_stock: true,
      featured: false,
      dietary_tags: []
    });
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      description: product.description || "",
      price: product.price || 0,
      regular_variant: product.regular_variant || "",
      large_price: product.large_price || 0,
      large_variant: product.large_variant || "",
      cost: product.cost || 0,
      large_cost: product.large_cost || 0,
      variants: product.variants || [],
      image_url: product.image_url || "",
      images: product.images || [],
      categories: product.categories || (product.category ? [product.category] : []),
      calories: product.calories || 0,
      protein: product.protein || 0,
      in_stock: product.in_stock ?? true,
      featured: product.featured ?? false,
      dietary_tags: product.dietary_tags || [],
      shopify_id: product.shopify_id || ""
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    resetForm();
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createProductMutation.mutate(formData);
    }
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const filePath = `products/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage.from('product-images').upload(filePath, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
        return publicUrl;
      });
      const newImageUrls = await Promise.all(uploadPromises);
      
      setFormData(prev => ({ 
        ...prev, 
        images: [...prev.images, ...newImageUrls],
        image_url: prev.images.length === 0 ? newImageUrls[0] : prev.image_url
      }));
    } catch (error) {
      alert('Failed to upload images: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: newImages,
        image_url: newImages.length > 0 ? newImages[0] : ""
      };
    });
  };

  const calculateMargin = (price, cost) => {
    if (!cost || !price || cost <= 0 || price <= 0) return { dollar: 0, percent: 0 };
    const dollar = price - cost;
    const percent = ((dollar / price) * 100).toFixed(1);
    return { dollar: dollar.toFixed(2), percent };
  };

  const addVariant = () => {
    if (formData.variants.length < 15) {
      setFormData({
        ...formData,
        variants: [...formData.variants, { name: "", size: "regular", price: 0, cost: 0 }]
      });
    }
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  const removeVariant = (index) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== index)
    });
  };

  const toggleDietaryTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag)
        ? prev.dietary_tags.filter(t => t !== tag)
        : [...prev.dietary_tags, tag]
    }));
  };

  const toggleCategory = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const categories = [
    { name: "Breakfast", value: "breakfast" },
    { name: "Lunch", value: "lunch" },
    { name: "Dinner", value: "dinner" },
    { name: "Snacks", value: "snacks" },
    { name: "Drinks", value: "drinks" },
    { name: "Desserts", value: "desserts" }
  ];

  const dietaryOptions = ["vegan", "vegetarian", "gluten-free", "dairy-free", "keto", "paleo", "high-protein"];

  if (!user || user.role !== 'admin') {
    return null;
  }

  // Filter products based on search query
  const searchFilteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      product.shopify_id?.includes(query) ||
      product.dietary_tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Filter by active tab
  const getFilteredProducts = () => {
    switch (activeTab) {
      case "active":
        return searchFilteredProducts.filter(p => p.in_stock);
      case "inactive":
        return searchFilteredProducts.filter(p => !p.in_stock);
      case "featured":
        return searchFilteredProducts.filter(p => p.featured);
      case "linked":
        return searchFilteredProducts.filter(p => p.shopify_id);
      case "unlinked":
        return searchFilteredProducts.filter(p => !p.shopify_id);
      default:
        return searchFilteredProducts;
    }
  };

  const filteredProducts = getFilteredProducts();
  const activeProducts = products.filter(p => p.in_stock);
  const inactiveProducts = products.filter(p => !p.in_stock);
  const featuredProducts = products.filter(p => p.featured);
  const linkedProducts = products.filter(p => p.shopify_id);
  const unlinkedProducts = products.filter(p => !p.shopify_id);

  const renderProductGrid = (productsToRender) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {productsToRender.map(product => (
        <Card key={product.id} className="hover:shadow-lg transition-shadow flex flex-col">
          <CardHeader>
            <div className="relative">
              <img
                src={product.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
                alt={product.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                {product.featured && (
                  <Badge className="bg-yellow-500">Featured</Badge>
                )}
                <Badge variant={product.in_stock ? "default" : "secondary"} className={product.in_stock ? "bg-green-600" : "bg-gray-400"}>
                  {product.in_stock ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="absolute top-2 left-2">
                {product.shopify_id ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    🔗 Shopify: {product.shopify_id}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                    Not Linked
                  </Badge>
                )}
              </div>
            </div>
            <CardTitle className="line-clamp-1">{product.name}</CardTitle>
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{product.description}</p>
            <div className="flex flex-wrap gap-1">
              {(product.categories && product.categories.length > 0
                ? product.categories
                : product.category ? [product.category] : []
              ).map((cat) => (
                <Badge key={cat} variant="outline" className="capitalize text-xs">
                  {cat}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3">
              <div className="space-y-3 max-h-80 overflow-y-auto">
                  {product.variants && product.variants.length > 0 ? (
                    <div className="space-y-2">
                      {product.variants.map((variant, idx) => (
                        <div key={idx} className="border-b pb-2 last:border-b-0">
                          <p className="text-xs text-gray-600 italic capitalize">{variant.size} {variant.name}</p>
                          <p className="text-xl font-bold text-gray-900">${variant.price}</p>
                          {variant.cost && (
                            <>
                              <p className="text-xs text-orange-600 font-semibold">
                                Cost: ${variant.cost}
                              </p>
                              <p className="text-xs text-green-700 font-semibold">
                                Profit: ${(variant.price - variant.cost).toFixed(2)} ({(((variant.price - variant.cost) / variant.price) * 100).toFixed(1)}%)
                              </p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Regular Size</p>
                        <p className="text-2xl font-bold text-gray-900">${product.price}</p>
                        {product.regular_variant && (
                          <p className="text-xs text-gray-600 italic">{product.regular_variant}</p>
                        )}
                        {product.cost && (
                          <>
                            <p className="text-sm text-orange-600 font-semibold">
                              Cost: ${product.cost}
                            </p>
                            <p className="text-xs text-green-700 font-semibold">
                              Profit: ${(product.price - product.cost).toFixed(2)} ({(((product.price - product.cost) / product.price) * 100).toFixed(1)}%)
                            </p>
                          </>
                        )}
                      </div>
                      {product.large_price && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Large Size</p>
                          <p className="text-2xl font-bold text-gray-900">${product.large_price}</p>
                          {product.large_variant && (
                            <p className="text-xs text-gray-600 italic">{product.large_variant}</p>
                          )}
                          {product.large_cost && (
                            <>
                              <p className="text-sm text-orange-600 font-semibold">
                                Cost: ${product.large_cost}
                              </p>
                              <p className="text-xs text-green-700 font-semibold">
                                Profit: ${(product.large_price - product.large_cost).toFixed(2)} ({(((product.large_price - product.large_cost) / product.large_price) * 100).toFixed(1)}%)
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              {product.dietary_tags && product.dietary_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {product.dietary_tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <div className="p-4 border-t bg-gray-50 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleEdit(product)}
            >
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to delete this product?')) {
                  deleteProductMutation.mutate(product.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );

  if (isDialogOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingProduct ? "Edit Product" : "Create Product"}
              </h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingProduct(null);
                  resetForm();
                }}
              >
                ✕ Close
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shopify_id">Shopify ID (optional)</Label>
                  <Input
                    id="shopify_id"
                    value={formData.shopify_id || ""}
                    onChange={(e) => setFormData({ ...formData, shopify_id: e.target.value })}
                    placeholder="Leave empty if not synced"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="h-20"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-lg font-semibold">Product Variants</Label>
                    <p className="text-sm text-gray-500">Add up to 15 variants with different sizes and options</p>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={addVariant}
                    disabled={formData.variants.length >= 15}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Variant ({formData.variants.length}/15)
                  </Button>
                </div>

                {formData.variants.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="text-4xl mb-3">🍽️</div>
                    <p className="text-sm text-gray-600 font-medium mb-1">No variants added yet</p>
                    <p className="text-xs text-gray-400">Click "Add Variant" to create your first product variant</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.variants.map((variant, index) => {
                      const isExpanded = expandedVariants[index];
                      return (
                        <div key={index} className="bg-white border-2 border-gray-200 rounded-lg hover:border-blue-200 transition-colors">
                          <div 
                            className="flex items-center justify-between p-3 cursor-pointer"
                            onClick={() => toggleVariantExpansion(index)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Badge variant="secondary" className="font-semibold">#{index + 1}</Badge>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium capitalize">{variant.size || "regular"}</span>
                                {variant.name && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-sm text-gray-700">{variant.name}</span>
                                  </>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-blue-600 ml-auto">${variant.price || 0}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeVariant(index);
                                }}
                                className="h-8 w-8 p-0 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                              <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                ▼
                              </div>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="p-4 pt-0 space-y-3 border-t">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label htmlFor={`variant-size-${index}`} className="text-xs font-semibold text-gray-700">Size</Label>
                                  <Select
                                    value={variant.size || "regular"}
                                    onValueChange={(value) => updateVariant(index, 'size', value)}
                                  >
                                    <SelectTrigger id={`variant-size-${index}`} className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="regular">Regular</SelectItem>
                                      <SelectItem value="large">Large</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1">
                                  <Label htmlFor={`variant-name-${index}`} className="text-xs font-semibold text-gray-700">Option Name</Label>
                                  <Input
                                    id={`variant-name-${index}`}
                                    value={variant.name}
                                    onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                    placeholder="e.g., with Rice"
                                    required
                                    className="h-9"
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label htmlFor={`variant-price-${index}`} className="text-xs font-semibold text-gray-700">Price ($)</Label>
                                  <Input
                                    id={`variant-price-${index}`}
                                    type="number"
                                    step="0.01"
                                    value={variant.price}
                                    onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                                    required
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`variant-cost-${index}`} className="text-xs font-semibold orange-700">Cost ($)</Label>
                                  <Input
                                    id={`variant-cost-${index}`}
                                    type="number"
                                    step="0.01"
                                    value={variant.cost || 0}
                                    onChange={(e) => updateVariant(index, 'cost', parseFloat(e.target.value) || 0)}
                                    className="h-9 border-orange-200 focus:border-orange-400"
                                  />
                                </div>
                              </div>
                              
                              {variant.cost > 0 && variant.price > 0 && (
                                <div className="flex items-center justify-between pt-2 border-t">
                                  <span className="text-xs text-gray-600">Profit:</span>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-green-700">
                                      ${(variant.price - variant.cost).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-green-600">
                                      {(((variant.price - variant.cost) / variant.price) * 100).toFixed(1)}% margin
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Categories</Label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <Badge
                          key={cat.value}
                          variant={formData.categories.includes(cat.value) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-blue-100"
                          onClick={() => toggleCategory(cat.value)}
                        >
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Dietary Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {dietaryOptions.map(tag => (
                        <Badge
                          key={tag}
                          variant={formData.dietary_tags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-green-100 text-xs"
                          onClick={() => toggleDietaryTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="calories" className="text-sm">Calories</Label>
                      <Input
                        id="calories"
                        type="number"
                        value={formData.calories}
                        onChange={(e) => setFormData({ ...formData, calories: parseInt(e.target.value) || 0 })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="protein" className="text-sm">Protein (g)</Label>
                      <Input
                        id="protein"
                        type="number"
                        value={formData.protein}
                        onChange={(e) => setFormData({ ...formData, protein: parseInt(e.target.value) || 0 })}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image_upload">Product Images</Label>
                    <div className="space-y-3">
                      {formData.images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {formData.images.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img 
                                src={img} 
                                alt={`Product ${idx + 1}`} 
                                className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Input
                        id="image_upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="h-9"
                      />
                      {uploadingImage && <p className="text-sm text-blue-600">Uploading images...</p>}
                      <p className="text-xs text-gray-500">Select multiple images to upload</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <Label htmlFor="in_stock" className="text-sm font-medium">Active (Show on menu)</Label>
                      <Switch
                        id="in_stock"
                        checked={formData.in_stock}
                        onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <Label htmlFor="featured" className="text-sm font-medium">Featured Product</Label>
                      <Switch
                        id="featured"
                        checked={formData.featured}
                        onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white border-t py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProductMutation.isPending || createProductMutation.isPending}
                >
                  {updateProductMutation.isPending || createProductMutation.isPending ? "Saving..." : editingProduct ? "Save Changes" : "Create Product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Product Management</h1>
            <p className="text-gray-600">View and manage your product catalog</p>
            <div className="flex gap-4 mt-2 text-sm flex-wrap">
              <span className="text-green-600 font-semibold">Active: {activeProducts.length}</span>
              <span className="text-gray-500">Inactive: {inactiveProducts.length}</span>
              <span className="text-blue-600">Featured: {featuredProducts.length}</span>
              <span className="text-purple-600">🔗 Linked: {linkedProducts.length}</span>
              <span className="text-orange-600">🔗 Unlinked: {unlinkedProducts.length}</span>
              <span className="text-gray-700">Total: {products.length}</span>
            </div>
            {syncResult && (
              <div className={`mt-3 text-sm ${syncResult.error ? 'text-red-600' : 'text-green-600'}`}>
                {syncResult.error ? `Error: ${syncResult.error}` : `Synced: ${syncResult.updated} updated, ${syncResult.skipped} skipped`}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleSyncShopify} 
              disabled={syncing}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync from Shopify'}
            </Button>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Product
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search products by name, category, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              Showing {filteredProducts.length} of {products.length} products
            </p>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="all">
              All Products ({searchFilteredProducts.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({searchFilteredProducts.filter(p => p.in_stock).length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive ({searchFilteredProducts.filter(p => !p.in_stock).length})
            </TabsTrigger>
            <TabsTrigger value="featured">
              Featured ({searchFilteredProducts.filter(p => p.featured).length})
            </TabsTrigger>
            <TabsTrigger value="linked">
              🔗 Linked ({searchFilteredProducts.filter(p => p.shopify_id).length})
            </TabsTrigger>
            <TabsTrigger value="unlinked">
              Unlinked ({searchFilteredProducts.filter(p => !p.shopify_id).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {isLoading ? (
              <div className="text-center py-16">
                <p className="text-gray-500">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <p className="text-gray-500 mb-2">
                  {searchQuery ? 'No products match your search' : 'No products yet'}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              renderProductGrid(filteredProducts)
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <p className="text-gray-500">No active products found</p>
              </div>
            ) : (
              renderProductGrid(filteredProducts)
            )}
          </TabsContent>

          <TabsContent value="inactive" className="mt-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <p className="text-gray-500">No inactive products found</p>
              </div>
            ) : (
              renderProductGrid(filteredProducts)
            )}
          </TabsContent>

          <TabsContent value="featured" className="mt-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <p className="text-gray-500">No featured products found</p>
              </div>
            ) : (
              renderProductGrid(filteredProducts)
            )}
          </TabsContent>

          <TabsContent value="linked" className="mt-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <p className="text-gray-500">No products linked to Shopify</p>
              </div>
            ) : (
              renderProductGrid(filteredProducts)
            )}
          </TabsContent>

          <TabsContent value="unlinked" className="mt-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl">
                <p className="text-gray-500">All products are linked!</p>
              </div>
            ) : (
              renderProductGrid(filteredProducts)
            )}
          </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}

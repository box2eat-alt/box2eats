import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProductCard from "../components/menu/ProductCard";
import AdvancedFilters from "../components/menu/AdvancedFilters";

const categories = [
  { name: "All", value: "all", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop" },
  { name: "Breakfast", value: "breakfast", image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=400&fit=crop" },
  { name: "Lunch", value: "lunch", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop" },
  { name: "Dinner", value: "dinner", image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop" },
  { name: "Snacks", value: "snacks", image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop" },
  { name: "Desserts", value: "desserts", image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop" }
];

export default function Menu() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dietaryTags: [],
    maxCalories: "",
    minProtein: ""
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('in_stock', true)
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const filteredProducts = products.filter((product) => {
    const categoryMatch = selectedCategory === "all" || 
      (product.categories && product.categories.includes(selectedCategory)) ||
      product.category === selectedCategory;
    
    const searchMatch = searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const dietaryMatch = filters.dietaryTags.length === 0 ||
      filters.dietaryTags.every(tag => product.dietary_tags?.includes(tag));
    
    const caloriesMatch = !filters.maxCalories || 
      !product.calories || 
      product.calories <= parseInt(filters.maxCalories);
    
    const proteinMatch = !filters.minProtein || 
      !product.protein || 
      product.protein >= parseInt(filters.minProtein);
    
    return categoryMatch && searchMatch && dietaryMatch && caloriesMatch && proteinMatch;
  });

  return (
    <div className="bg-[#ffffff] p-6 min-h-screen md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#2C2C2C] mb-4">Our Menu</h1>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2C2C2C]/40" />
            <Input
              placeholder="Search for meals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 h-14 bg-white border-0 rounded-2xl shadow-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <SlidersHorizontal className="w-5 h-5 text-[#2C2C2C]/60" />
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mb-6">
              <AdvancedFilters 
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          )}

          {/* Categories */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#2C2C2C] mb-3">Categories</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`w-full aspect-square rounded-2xl overflow-hidden transition-all ${
                    selectedCategory === cat.value
                      ? "ring-4 ring-[#d71e14] shadow-lg"
                      : "ring-2 ring-gray-200 hover:ring-gray-300"
                  }`}>
                    <img 
                      src={cat.image} 
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    selectedCategory === cat.value ? "text-[#d71e14]" : "text-[#2C2C2C]/70"
                  }`}>
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#2C2C2C]">
            {selectedCategory === "all" ? "All Items" : categories.find((c) => c.value === selectedCategory)?.name}
            <span className="text-[#2C2C2C]/40 ml-2">({filteredProducts.length})</span>
          </h2>
        </div>

        {isLoading ?
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) =>
              <div key={i} className="h-32 bg-white/50 rounded-2xl animate-pulse"></div>
            )}
          </div> :
          filteredProducts.length === 0 ?
            <div className="text-center py-16 bg-white rounded-2xl">
              <p className="text-[#2C2C2C]/50">No items found</p>
            </div> :
            <div className="space-y-4">
              {filteredProducts.map((product) =>
                <ProductCard key={product.id} product={product} compact />
              )}
            </div>
        }
      </div>
    </div>
  );
}

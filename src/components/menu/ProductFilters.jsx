import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function ProductFilters({ filters, setFilters }) {
  const categories = [
    { value: "all", label: "All" },
    { value: "breakfast", label: "Breakfast" },
    { value: "lunch", label: "Lunch" },
    { value: "dinner", label: "Dinner" },
    { value: "snacks", label: "Snacks" },
    { value: "drinks", label: "Drinks" },
    { value: "desserts", label: "Desserts" }
  ];

  const dietaryOptions = [
    "vegan",
    "vegetarian",
    "gluten-free",
    "dairy-free",
    "keto",
    "paleo",
    "high-protein"
  ];

  const toggleDietary = (tag) => {
    setFilters(prev => ({
      ...prev,
      dietary: prev.dietary.includes(tag)
        ? prev.dietary.filter(t => t !== tag)
        : [...prev.dietary, tag]
    }));
  };

  return (
    <div className="space-y-6 mb-8">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
        <Tabs value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
          <TabsList className="bg-white border">
            {categories.map(cat => (
              <TabsTrigger key={cat.value} value={cat.value} className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Dietary Preferences</h3>
        <div className="flex flex-wrap gap-2">
          {dietaryOptions.map(tag => (
            <Badge
              key={tag}
              variant={filters.dietary.includes(tag) ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                filters.dietary.includes(tag)
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "hover:bg-orange-50"
              }`}
              onClick={() => toggleDietary(tag)}
            >
              {filters.dietary.includes(tag) && <Check className="w-3 h-3 mr-1" />}
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
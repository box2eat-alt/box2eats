import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sliders } from "lucide-react";

const dietaryOptions = ["vegan", "vegetarian", "gluten-free", "dairy-free", "keto", "paleo", "high-protein"];

export default function AdvancedFilters({ filters, onFiltersChange }) {
  const toggleDietaryTag = (tag) => {
    const newTags = filters.dietaryTags.includes(tag)
      ? filters.dietaryTags.filter(t => t !== tag)
      : [...filters.dietaryTags, tag];
    onFiltersChange({ ...filters, dietaryTags: newTags });
  };

  return (
    <div className="bg-white rounded-2xl p-4 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sliders className="w-5 h-5 text-[#d71e14]" />
        <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm text-gray-700 mb-2 block">Dietary Preferences</Label>
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map(tag => (
              <Badge
                key={tag}
                variant={filters.dietaryTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer capitalize"
                style={filters.dietaryTags.includes(tag) ? { backgroundColor: '#d71e14' } : {}}
                onClick={() => toggleDietaryTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm text-gray-700 mb-1 block">Max Calories</Label>
            <Input
              type="number"
              placeholder="e.g., 500"
              value={filters.maxCalories || ""}
              onChange={(e) => onFiltersChange({ ...filters, maxCalories: e.target.value })}
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-sm text-gray-700 mb-1 block">Min Protein (g)</Label>
            <Input
              type="number"
              placeholder="e.g., 20"
              value={filters.minProtein || ""}
              onChange={(e) => onFiltersChange({ ...filters, minProtein: e.target.value })}
              className="h-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
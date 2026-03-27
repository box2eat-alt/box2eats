import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Phone, Check, Plus, Trash2 } from "lucide-react";

export default function Profile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuthenticated, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
    delivery_address: "",
    dietary_preferences: [],
    saved_addresses: []
  });
  const [newAddress, setNewAddress] = useState({ label: "", address: "" });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        phone_number: user.phone_number || "",
        delivery_address: user.delivery_address || "",
        dietary_preferences: user.dietary_preferences || [],
        saved_addresses: user.saved_addresses || []
      });
    }
  }, [user, isAuthenticated, navigate]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  });

  const dietaryOptions = ["vegan", "vegetarian", "gluten-free", "dairy-free", "keto", "paleo", "high-protein"];

  const toggleDietaryPreference = (pref) => {
    setFormData((prev) => ({
      ...prev,
      dietary_preferences: prev.dietary_preferences.includes(pref) ?
      prev.dietary_preferences.filter((p) => p !== pref) :
      [...prev.dietary_preferences, pref]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const addSavedAddress = () => {
    if (newAddress.label && newAddress.address) {
      setFormData((prev) => ({
        ...prev,
        saved_addresses: [...prev.saved_addresses, { ...newAddress }]
      }));
      setNewAddress({ label: "", address: "" });
    }
  };

  const removeSavedAddress = (index) => {
    setFormData((prev) => ({
      ...prev,
      saved_addresses: prev.saved_addresses.filter((_, i) => i !== index)
    }));
  };

  if (!user) return null;

  return (
    <div className="bg-[#ffffff] p-6 min-h-screen from-orange-50 to-white md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your name" />

              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-gray-50" />

                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+1 (555) 123-4567" />

              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_address" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Delivery Address
                </Label>
                <Textarea
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                  placeholder="123 Main St, Apt 4B, City, State ZIP"
                  className="h-24" />

              </div>

              <div className="space-y-3">
                <Label>Dietary Preferences</Label>
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map((pref) =>
                  <Badge
                    key={pref}
                    variant={formData.dietary_preferences.includes(pref) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                    formData.dietary_preferences.includes(pref) ?
                    "bg-orange-500 hover:bg-orange-600" :
                    "hover:bg-orange-50"}`
                    }
                    onClick={() => toggleDietaryPreference(pref)}>

                      {formData.dietary_preferences.includes(pref) &&
                    <Check className="w-3 h-3 mr-1" />
                    }
                      {pref}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Saved Addresses</Label>
                <div className="space-y-2">
                  {formData.saved_addresses.map((addr, index) =>
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{addr.label}</p>
                        <p className="text-xs text-gray-600">{addr.address}</p>
                      </div>
                      <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSavedAddress(index)}>

                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="border-t pt-3 space-y-2">
                  <Input
                    placeholder="Address label (e.g., Home, Work)"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} />

                  <Textarea
                    placeholder="Full address"
                    value={newAddress.address}
                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                    className="h-20" />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSavedAddress}
                    className="w-full">

                    <Plus className="w-4 h-4 mr-2" />
                    Add Address
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#d71e14] hover:bg-[#c0282d]"
                disabled={updateProfileMutation.isPending}>

                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>

              {updateProfileMutation.isSuccess &&
              <p className="text-green-600 text-center text-sm">Profile updated successfully!</p>
              }
            </form>
          </CardContent>
        </Card>
      </div>
    </div>);

}

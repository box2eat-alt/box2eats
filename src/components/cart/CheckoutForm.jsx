import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Truck, Lock, CreditCard } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createPageUrl } from "@/utils";

const locations = [
  {
    id: "cloverdale",
    name: "CLOVERDALE",
    address: "17767 64 Avenue, Surrey, BC",
    phone: "(778)-384-6284"
  },
  {
    id: "whiterock",
    name: "White Rock",
    address: "1522 Finlay Street, White Rock unit 216",
    phone: ""
  },
  {
    id: "langley",
    name: "LANGLEY BYPASS",
    address: "20560 LANGLEY BYPASS",
    phone: ""
  }
];

export default function CheckoutForm({ total, onBack, onSubmit, isProcessing }) {
  const { user } = useAuth();
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [cloverLoaded, setCloverLoaded] = useState(false);
  const [clover, setClover] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldValid, setFieldValid] = useState({ CARD_NUMBER: false, CARD_DATE: false, CARD_CVV: false, CARD_POSTAL_CODE: false });

  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    order_type: "pickup",
    pickup_location: "cloverdale",
    delivery_address: "",
    phone_number: "",
    delivery_instructions: ""
  });

  useEffect(() => {
    if (user) {
      const nameParts = user.full_name?.split(' ') || [];
      setFormData({
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(' ') || "",
        email: user.email || "",
        order_type: "pickup",
        pickup_location: "cloverdale",
        delivery_address: user.delivery_address || "",
        phone_number: user.phone_number || "",
        delivery_instructions: ""
      });
    }
  }, [user]);

  useEffect(() => {
    const loadClover = async () => {
      try {
        console.log('🔵 Step 1: Calling initialize-clover-payment…');
        const { data: initData, error: initError } = await supabase.functions.invoke(
          'initialize-clover-payment',
          { body: {} }
        );
        if (initError) {
          throw new Error(initError.message || 'Failed to initialize payment');
        }
        if (initData?.error) {
          throw new Error(initData.error);
        }
        const { clover_public_token, merchant_id } = initData ?? {};
        if (!clover_public_token || !merchant_id) {
          throw new Error('Missing credentials from backend');
        }
        console.log('✅ Step 2: Clover config loaded');
        
        console.log('🔵 Step 3: Loading Clover SDK from production...');
        
        const script = document.createElement('script');
        script.src = 'https://checkout.clover.com/sdk.js';
        script.async = true;
        
        script.onload = async () => {
          console.log('✅ Step 4: Clover SDK loaded successfully');
          
          try {
            console.log('🔵 Step 5: Initializing Clover with public token');
            const cloverInstance = new window.Clover(clover_public_token);
            
            console.log('✅ Step 6: Clover instance created');
            
            const elements = cloverInstance.elements();
            console.log('✅ Step 7: Elements created');
            
            const cardNumberElement = elements.create('CARD_NUMBER');
            const cardDateElement = elements.create('CARD_DATE');
            const cardCvvElement = elements.create('CARD_CVV');
            const cardPostalElement = elements.create('CARD_POSTAL_CODE');

            await new Promise(resolve => setTimeout(resolve, 100));

            const mountTargets = [
              { el: cardNumberElement, id: '#card-number', key: 'CARD_NUMBER' },
              { el: cardDateElement, id: '#card-date', key: 'CARD_DATE' },
              { el: cardCvvElement, id: '#card-cvv', key: 'CARD_CVV' },
              { el: cardPostalElement, id: '#card-postal', key: 'CARD_POSTAL_CODE' },
            ];

            mountTargets.forEach(({ el, id, key }) => {
              el.mount(id);
              el.addEventListener('change', (event) => {
                setFieldErrors(prev => ({ ...prev, [key]: event.error?.message || null }));
                setFieldValid(prev => ({ ...prev, [key]: !event.error }));
              });
            });

            console.log('✅ Step 8: Card elements mounted');

            setClover(cloverInstance);
            setCloverLoaded(true);
          } catch (initError) {
            console.error('❌ Error during initialization:', initError);
            setPaymentError(`Setup error: ${initError.message}`);
          }
        };
        
        script.onerror = () => {
          console.error('❌ Failed to load Clover SDK script');
          setPaymentError('Failed to load Clover payment system');
        };
        
        document.body.appendChild(script);
        
        return () => {
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
        };
      } catch (error) {
        console.error('❌ Error in loadClover:', error);
        setPaymentError(error.message);
      }
    };
    
    loadClover();
  }, []);

  const handleCheckout = async (e) => {
    e.preventDefault();
    
    console.log('🔵 === STARTING CHECKOUT PROCESS ===');
    
    if (!cloverLoaded || !clover) {
      const errorMsg = 'Payment system not ready. Please refresh and try again.';
      console.error('❌', errorMsg);
      setPaymentError(errorMsg);
      return;
    }
    
    setIsPaymentProcessing(true);
    setPaymentError(null);

    try {
      const deliveryFee = 0;
      const finalTotal = total + deliveryFee;
      console.log('💰 Final total:', finalTotal);

      console.log('🔵 Fetching cart items...');
      const { data: cartItemsData } = await supabase.from('cart_items').select('*').eq('user_id', user.id);
      const cartItems = cartItemsData ?? [];
      console.log('✅ Cart items:', cartItems.length);

      const { data: productsData } = await supabase.from('products').select('*');
      const products = productsData ?? [];
      const productMap = new Map(products.map(p => [p.id, p]));

      const items = cartItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.product_price,
        shopify_variant_id: productMap.get(item.product_id)?.shopify_variant_id
      }));
      console.log('✅ Prepared items:', items);

      console.log('🔵 Creating token with Clover SDK...');
      const result = await Promise.race([
        clover.createToken(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Payment timed out. Please check your card details and try again.')), 20000))
      ]);
      console.log('📦 Token result:', result);
      
      if (result.errors) {
        console.error('❌ Clover token errors:', result.errors);
        const errorMessages = Object.entries(result.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
        throw new Error(errorMessages || 'Card validation failed');
      }
      
      if (!result.token) {
        console.error('❌ No token in result:', result);
        throw new Error('Failed to create payment token');
      }
      
      const token = result.token;
      console.log('✅ Token created:', token);

      console.log('🔵 Calling backend payment function...');
      console.log('📤 Sending:', {
        token_preview: token.substring(0, 10) + '...',
        amount: finalTotal,
        order_data: {
          phone_number: formData.phone_number,
          order_type: formData.order_type,
          items_count: items.length
        }
      });

      const selectedLocation = locations.find(loc => loc.id === formData.pickup_location);

      const { data: payData, error: payError } = await supabase.functions.invoke(
        'process-clover-iframe-payment',
        {
          body: {
            token,
            amount: finalTotal,
            order_data: {
              first_name: formData.first_name,
              last_name: formData.last_name,
              email: formData.email,
              phone_number: formData.phone_number,
              order_type: formData.order_type,
              pickup_location: formData.pickup_location,
              pickup_address: selectedLocation
                ? `${selectedLocation.name} - ${selectedLocation.address}`
                : '',
              delivery_address: formData.delivery_address,
              delivery_instructions: formData.delivery_instructions,
              items
            }
          }
        }
      );

      console.log('📥 Backend response:', { payData, payError });

      if (payError) {
        throw new Error(payError.message || 'Payment request failed');
      }
      if (!payData?.success) {
        throw new Error(payData?.error || 'Payment failed');
      }

      console.log('✅ Payment successful!');

      for (const item of cartItems) {
        await supabase.from('cart_items').delete().eq('id', item.id);
      }

      window.location.href = createPageUrl('Orders');

    } catch (error) {
      console.error('❌ === CHECKOUT ERROR ===', error.message);
      
      let errorMessage = error.message || 'Payment failed. Please try again.';
      if (error.response?.data) {
        errorMessage = error.response.data.error || error.response.data.message || errorMessage;
      }
      
      setPaymentError(errorMessage);
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const deliveryFee = 0;
  const finalTotal = total + deliveryFee;

  const buildOrderPayload = () => {
    const selectedLocation = locations.find((loc) => loc.id === formData.pickup_location);
    return {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      order_type: formData.order_type,
      pickup_location: formData.pickup_location,
      pickup_address: selectedLocation ? `${selectedLocation.name} - ${selectedLocation.address}` : '',
      delivery_address: formData.delivery_address,
      phone_number: formData.phone_number,
      delivery_instructions: formData.delivery_instructions
    };
  };

  const handleDevPlaceOrder = (e) => {
    e.preventDefault();
    if (!onSubmit) return;
    if (formData.order_type === 'delivery' && (!formData.delivery_address || formData.delivery_address.length < 10)) {
      setPaymentError('Enter a full delivery address (10+ characters) for test order.');
      return;
    }
    setPaymentError(null);
    onSubmit(buildOrderPayload());
  };

  return (
    <div className="bg-[#ffffff] p-6 min-h-screen md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Button>

        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle>Checkout</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleCheckout} className="space-y-6">
                {/* Customer Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@example.com"
                  />
                </div>

                {/* Order Type Selection */}
                <div className="space-y-3">
                <Label className="text-base font-semibold">Order Type *</Label>
                <RadioGroup
                  value={formData.order_type}
                  onValueChange={(value) => setFormData({ ...formData, order_type: value })}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.order_type === "pickup" ? "border-[#d71e14] bg-red-50" : "border-gray-200 hover:bg-gray-50"
                  }`}>
                    <RadioGroupItem value="pickup" id="pickup" />
                    <label htmlFor="pickup" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#d71e14]" />
                        <div>
                          <div className="font-semibold text-[#2C2C2C]">Pickup</div>
                          <div className="text-xs text-[#2C2C2C]/60">$0.00 fee</div>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.order_type === "delivery" ? "border-[#d71e14] bg-red-50" : "border-gray-200 hover:bg-gray-50"
                  }`}>
                    <RadioGroupItem value="delivery" id="delivery" />
                    <label htmlFor="delivery" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-[#d71e14]" />
                        <div>
                          <div className="font-semibold text-[#2C2C2C]">Delivery</div>
                          <div className="text-xs text-[#2C2C2C]/60">$0.00 fee</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Pickup Location Selection */}
              {formData.order_type === "pickup" && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base font-semibold">
                    <MapPin className="w-5 h-5 text-[#d71e14]" />
                    Select Pickup Location *
                  </Label>
                  <RadioGroup
                    value={formData.pickup_location}
                    onValueChange={(value) => setFormData({ ...formData, pickup_location: value })}
                    className="space-y-3"
                  >
                    {locations.map((location) => (
                      <div key={location.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value={location.id} id={location.id} className="mt-1" />
                        <label htmlFor={location.id} className="flex-1 cursor-pointer">
                          <div className="font-semibold text-[#2C2C2C]">{location.name}</div>
                          <div className="text-sm text-[#2C2C2C]/60">{location.address}</div>
                          {location.phone && (
                            <div className="text-sm text-[#2C2C2C]/60 mt-1">Phone: {location.phone}</div>
                          )}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Delivery Address */}
              {formData.order_type === "delivery" && (
                <div className="space-y-2">
                  <Label htmlFor="delivery_address">Delivery Address *</Label>
                  <Textarea
                    id="delivery_address"
                    required
                    minLength="10"
                    value={formData.delivery_address}
                    onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                    placeholder="123 Main St, Apt 4B, Surrey, BC V3S 2A1"
                    className="h-20"
                  />
                  <p className="text-xs text-gray-500">Full address including postal code required</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number *</Label>
                <Input
                  id="phone_number"
                  required
                  type="tel"
                  pattern="[\d\s\-\+\(\)]+"
                  minLength="10"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+1 (604) 555-1234"
                />
                <p className="text-xs text-gray-500">Required for order confirmation and delivery</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_instructions">Special Instructions (Optional)</Label>
                <Textarea
                  id="delivery_instructions"
                  value={formData.delivery_instructions}
                  onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
                  placeholder="e.g., Extra napkins, no ice, etc."
                  className="h-20"
                />
              </div>

              {/* Clover Card Elements */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <CreditCard className="w-5 h-5 text-[#d71e14]" />
                  Payment Information *
                </Label>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600 mb-1 block">Card Number</Label>
                    <div id="card-number" className={`border-2 rounded-lg p-3 min-h-[45px] bg-white transition-colors ${fieldValid.CARD_NUMBER ? 'border-green-400' : fieldErrors.CARD_NUMBER ? 'border-red-400' : 'border-gray-200'}`}>
                      {!cloverLoaded && (
                        <div className="flex items-center justify-center text-gray-400 text-sm">Loading payment form...</div>
                      )}
                    </div>
                    {fieldErrors.CARD_NUMBER && <p className="text-red-600 text-xs mt-1">{fieldErrors.CARD_NUMBER}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm text-gray-600 mb-1 block">Expiry</Label>
                      <div id="card-date" className={`border-2 rounded-lg p-3 min-h-[45px] bg-white transition-colors ${fieldValid.CARD_DATE ? 'border-green-400' : fieldErrors.CARD_DATE ? 'border-red-400' : 'border-gray-200'}`}></div>
                      {fieldErrors.CARD_DATE && <p className="text-red-600 text-xs mt-1">{fieldErrors.CARD_DATE}</p>}
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600 mb-1 block">CVV</Label>
                      <div id="card-cvv" className={`border-2 rounded-lg p-3 min-h-[45px] bg-white transition-colors ${fieldValid.CARD_CVV ? 'border-green-400' : fieldErrors.CARD_CVV ? 'border-red-400' : 'border-gray-200'}`}></div>
                      {fieldErrors.CARD_CVV && <p className="text-red-600 text-xs mt-1">{fieldErrors.CARD_CVV}</p>}
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600 mb-1 block">Postal Code</Label>
                      <div id="card-postal" className={`border-2 rounded-lg p-3 min-h-[45px] bg-white transition-colors ${fieldValid.CARD_POSTAL_CODE ? 'border-green-400' : fieldErrors.CARD_POSTAL_CODE ? 'border-red-400' : 'border-gray-200'}`}></div>
                      {fieldErrors.CARD_POSTAL_CODE && <p className="text-red-600 text-xs mt-1">{fieldErrors.CARD_POSTAL_CODE}</p>}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  <Lock className="w-3 h-3 inline mr-1" />
                  Your payment information is secure and encrypted
                </p>
              </div>

              {paymentError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  <p className="font-semibold mb-1">Payment Error:</p>
                  <p className="text-sm">{paymentError}</p>
                  <p className="text-xs mt-2 text-red-600">Check browser console (F12) for detailed logs</p>
                </div>
              )}

              <div className="border-t pt-6">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-[#2C2C2C]/60">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#2C2C2C]">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#2C2C2C]/60">
                    <span>{formData.order_type === "delivery" ? "Delivery Fee" : "Pickup Fee"}</span>
                    <span className="font-semibold text-[#2C2C2C]">$0.00</span>
                  </div>
                </div>
                <div className="flex justify-between text-2xl font-bold mb-6">
                  <span>Total Amount</span>
                  <span className="text-[#d71e14]">${finalTotal.toFixed(2)}</span>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#d71e14] hover:bg-[#c0282d] text-lg py-6"
                  disabled={isProcessing || isPaymentProcessing || !cloverLoaded || Object.values(fieldValid).some(v => !v)}
                >
                  <Lock className="w-5 h-5 mr-2" />
                  {isPaymentProcessing ? "Processing Payment..." : `Pay $${finalTotal.toFixed(2)}`}
                </Button>

                {import.meta.env.DEV && onSubmit && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-3 border-dashed border-amber-500 text-amber-900 hover:bg-amber-50"
                    disabled={isProcessing || isPaymentProcessing}
                    onClick={handleDevPlaceOrder}
                  >
                    Place test order (skip payment — local dev only)
                  </Button>
                )}

                <p className="text-xs text-center text-gray-500 mt-4">
                  <Lock className="w-3 h-3 inline mr-1" />
                  Powered by Clover - Secure payment processing
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

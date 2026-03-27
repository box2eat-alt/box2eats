import React from "react";
import { Clock, Calendar, Info, Truck, Bell, MapPin } from "lucide-react";

export default function HowToOrder() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">How to Order</h1>
        <p className="text-gray-600 mb-8">Everything you need to know about ordering from Box2Eats</p>

        {/* Ordering Steps */}
        <section className="mb-10 bg-white rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
              <Info className="w-5 h-5" />
            </span>
            Ordering Process
          </h2>
          <div className="space-y-6 relative pl-2">
            <div className="absolute left-[27px] top-8 bottom-4 w-0.5 bg-gray-300"></div>
            <div className="relative flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#d71e14] text-white flex items-center justify-center font-bold z-10 shadow-lg">1</div>
              <div className="pt-1">
                <h4 className="font-bold text-lg text-gray-900">Select Your Meals</h4>
                <p className="text-gray-600 mt-1">Browse our menu and add your favorite healthy meals to the cart. You can customize portions and choose from various options.</p>
              </div>
            </div>
            <div className="relative flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#d71e14] text-white flex items-center justify-center font-bold z-10 shadow-lg">2</div>
              <div className="pt-1">
                <h4 className="font-bold text-lg text-gray-900">Choose Delivery Date</h4>
                <p className="text-gray-600 mt-1">Delivery every Tuesday from your preferred location or drop off.</p>
              </div>
            </div>
            <div className="relative flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#d71e14] text-white flex items-center justify-center font-bold z-10 shadow-lg">3</div>
              <div className="pt-1">
                <h4 className="font-bold text-lg text-gray-900">Complete Payment</h4>
                <p className="text-gray-600 mt-1">Securely checkout with your payment method of choice. We accept all major credit cards.</p>
              </div>
            </div>
            <div className="relative flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#d71e14] text-white flex items-center justify-center font-bold z-10 shadow-lg">4</div>
              <div className="pt-1">
                <h4 className="font-bold text-lg text-gray-900">Enjoy & Repeat</h4>
                <p className="text-gray-600 mt-1">Heat up your meals in minutes and enjoy fresh, macro-balanced food. Save your favorites for easy reordering.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Delivery Schedule */}
        <section className="mb-10 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-6 md:p-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="bg-white/10 text-green-300 p-2 rounded-lg mr-3">
              <Truck className="w-5 h-5" />
            </span>
            Delivery Schedule
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-red-400" />
                <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Order Deadline</span>
              </div>
              <p className="font-bold text-2xl mb-2">Every Sunday by 11:59 AM</p>
              <p className="text-sm text-gray-300">Place your order before the deadline to receive delivery on Tuesday.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-6 h-6 text-green-400" />
                <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Delivery Day</span>
              </div>
              <p className="font-bold text-2xl mb-2">Every Tuesday</p>
              <p className="text-sm text-gray-300">Fresh meals delivered to your door every Tuesday morning.</p>
            </div>
          </div>
        </section>

        {/* Additional Info */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Pickup Options</h3>
            </div>
            <p className="text-gray-600 mb-3">
              Prefer to pick up your order? We offer convenient pickup locations throughout the city.
            </p>
            <p className="text-sm text-gray-500">
              Select "Pickup" during checkout and choose your preferred location.
            </p>
          </div>


        </section>
      </div>
    </div>
  );
}
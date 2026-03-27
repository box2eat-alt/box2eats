import React from "react";
import { Plus, Minus, X } from "lucide-react";

export default function CartItemCard({ item, onUpdateQuantity, onRemove }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
      <img
        src={item.product_image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"}
        alt={item.product_name}
        className="w-20 h-20 object-cover rounded-xl" />

      <div className="flex-1">
        <h3 className="font-semibold text-[#2C2C2C] mb-1">{item.product_name}</h3>
        <p className="text-[#d71e14] mb-2 font-bold">${item.product_price.toFixed(2)}</p>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))} className="bg-[#ffdbdb] rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#F4C430]/30">


            <Minus className="w-4 h-4 text-[#F4C430]" />
          </button>
          <span className="font-semibold text-[#2C2C2C] w-6 text-center">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.quantity + 1)} className="bg-[#ffdbdb] rounded-full w-8 h-8 flex items-center justify-center hover:bg-[#F4C430]/30">


            <Plus className="w-4 h-4 text-[#F4C430]" />
          </button>
        </div>
      </div>
      
      <button
        onClick={onRemove}
        className="p-2 hover:bg-red-50 rounded-lg">

        <X className="w-5 h-5 text-[#2C2C2C]/40" />
      </button>
    </div>);

}
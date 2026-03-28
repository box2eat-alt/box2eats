import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInTimeZone } from "date-fns-tz";
import { Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react";

export default function OrderCard({ order }) {
  const statusConfig = {
    pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pending" },
    confirmed: { color: "bg-blue-100 text-blue-800", icon: CheckCircle, label: "Confirmed" },
    preparing: { color: "bg-purple-100 text-purple-800", icon: Package, label: "Preparing" },
    out_for_delivery: { color: "bg-orange-100 text-orange-800", icon: Truck, label: "Out for Delivery" },
    delivered: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Delivered" },
    cancelled: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Cancelled" }
  };

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="border-b pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{order.order_number}</h3>
            <p className="text-sm text-gray-600">
              {formatInTimeZone(new Date(order.created_at || order.created_date), "America/Vancouver", "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <Badge className={status.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
            {order.items?.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.product_name} x{item.quantity}</span>
                <span className="text-gray-600">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          {order.delivery_address && (
            <div>
              <p className="text-sm font-medium text-gray-700">Delivery Address:</p>
              <p className="text-sm text-gray-600">{order.delivery_address}</p>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-orange-600">${order.total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
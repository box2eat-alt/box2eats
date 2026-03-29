import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type OrderData = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  order_type?: string;
  pickup_location?: string;
  pickup_address?: string;
  delivery_address?: string;
  delivery_instructions?: string;
  items?: unknown[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    const privateToken = Deno.env.get("CLOVER_PRIVATE_TOKEN");
    const merchantId = Deno.env.get("CLOVER_MERCHANT_ID");
    if (!privateToken || !merchantId) {
      return Response.json(
        { error: "Clover credentials not configured" },
        { status: 500, headers: corsHeaders },
      );
    }

    const body = await req.json();
    const token = body?.token as string | undefined;
    const amount = Number(body?.amount);
    const order_data = body?.order_data as OrderData | undefined;

    if (!token || Number.isNaN(amount) || amount <= 0 || !order_data?.items) {
      return Response.json(
        { error: "Invalid request: token, amount, and order_data.items required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const cloverApiUrl = "https://scl.clover.com/v1/charges";
    const chargeData = {
      source: token,
      amount: Math.round(amount * 100),
      currency: "cad",
      description: `Box2Eats Order - ${order_data.order_type ?? "pickup"}`,
      email: order_data.email || user.email,
    };

    const cloverRes = await fetch(cloverApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${privateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chargeData),
    });

    const responseText = await cloverRes.text();
    if (!cloverRes.ok) {
      let errorMessage = "Payment failed";
      try {
        const errJson = JSON.parse(responseText);
        errorMessage = errJson.message || errJson.error || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }
      return Response.json(
        { error: errorMessage, details: responseText },
        { status: 400, headers: corsHeaders },
      );
    }

    const charge = JSON.parse(responseText);
    const orderNumber = `ORD-${Date.now()}`;

    const { error: insertErr } = await supabase.from("orders").insert({
      order_number: orderNumber,
      items: order_data.items,
      total: amount,
      user_id: user.id,
      user_email: order_data.email || user.email || "",
      status: "confirmed",
      phone_number: order_data.phone_number ?? null,
      order_type: order_data.order_type ?? "pickup",
      pickup_location: order_data.pickup_location ?? null,
      pickup_address: order_data.pickup_address || null,
      delivery_address:
        order_data.order_type === "delivery"
          ? order_data.delivery_address ?? null
          : null,
      delivery_instructions: order_data.delivery_instructions || null,
      customer_first_name: order_data.first_name ?? null,
      customer_last_name: order_data.last_name ?? null,
    });

    if (insertErr) {
      console.error("Order insert failed after charge:", insertErr);
      return Response.json(
        {
          error: "Payment succeeded but order could not be saved. Contact support with your card statement.",
          charge_id: charge.id,
        },
        { status: 500, headers: corsHeaders },
      );
    }

    // Send order to Mary's Shopify store
    const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL")?.trim();
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN")?.trim();

    if (shopifyStore && shopifyToken) {
      try {
        const lineItems = (order_data.items as any[]).map((item: any) => {
          if (item.shopify_variant_id) {
            return { variant_id: Number(item.shopify_variant_id), quantity: item.quantity };
          }
          return { title: item.product_name, quantity: item.quantity, price: String(item.price) };
        });

        const shopifyOrder = {
          order: {
            line_items: lineItems,
            financial_status: "paid",
            note: `Box2Eats Order ${orderNumber} | Clover Charge: ${charge.id}`,
            email: order_data.email || user.email || "",
            phone: order_data.phone_number || "",
            shipping_address: order_data.order_type === "delivery" && order_data.delivery_address
              ? {
                  address1: order_data.delivery_address,
                  first_name: order_data.first_name || "",
                  last_name: order_data.last_name || "",
                }
              : undefined,
            tags: `box2eats,${order_data.order_type || "pickup"}`,
            note_attributes: [
              { name: "order_type", value: order_data.order_type || "pickup" },
              { name: "pickup_location", value: order_data.pickup_address || "" },
              { name: "delivery_instructions", value: order_data.delivery_instructions || "" },
            ],
          },
        };

        const shopifyRes = await fetch(
          `https://${shopifyStore}/admin/api/2024-10/orders.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": shopifyToken,
            },
            body: JSON.stringify(shopifyOrder),
          },
        );

        if (!shopifyRes.ok) {
          const errText = await shopifyRes.text();
          console.error("Shopify order creation failed:", shopifyRes.status, errText);
        } else {
          const shopifyData = await shopifyRes.json();
          console.log("Shopify order created:", shopifyData.order?.id);
        }
      } catch (shopifyErr) {
        console.error("Shopify order error (non-blocking):", shopifyErr);
      }
    }

    return Response.json(
      {
        success: true,
        charge_id: charge.id,
        order_number: orderNumber,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("process-clover-iframe-payment:", e);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const SHOPIFY_STORE_URL = Deno.env.get("SHOPIFY_STORE_URL");
        const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

        if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
            console.error('❌ Missing Shopify credentials');
            return Response.json({ error: 'Shopify credentials not configured' }, { status: 500 });
        }

        const { order } = await req.json();

        // Prepare line items for Shopify
        const lineItems = order.items.map(item => {
            const lineItem = {
                title: item.product_name,
                price: item.price.toString(),
                quantity: item.quantity
            };
            
            // Only include variant_id if it exists and is valid
            if (item.shopify_variant_id && item.shopify_variant_id !== 'undefined') {
                lineItem.variant_id = parseInt(item.shopify_variant_id);
            }
            
            return lineItem;
        });

        console.log('Creating Shopify order with items:', lineItems);

        // Format phone number for Shopify (must start with + and country code)
        const formatPhoneForShopify = (phone) => {
            if (!phone) return undefined;
            const digits = phone.replace(/[^\d]/g, '');
            if (!digits) return undefined;
            // If it doesn't start with country code, assume North America (+1)
            return digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
        };

        const formattedPhone = formatPhoneForShopify(order.phone_number);

        // Create order in Shopify
        const shopifyOrderData = {
            order: {
                line_items: lineItems,
                email: order.user_email,
                phone: formattedPhone,
                customer: {
                    first_name: order.first_name,
                    last_name: order.last_name,
                    email: order.user_email,
                    phone: formattedPhone
                },
                shipping_address: order.order_type === "delivery" && order.delivery_address ? {
                    first_name: order.first_name,
                    last_name: order.last_name,
                    address1: order.delivery_address,
                    phone: formattedPhone
                } : order.order_type === "pickup" && order.pickup_address ? {
                    first_name: order.first_name,
                    last_name: order.last_name,
                    address1: order.pickup_address,
                    phone: formattedPhone
                } : undefined,
                note: `Order Type: ${order.order_type === "pickup" ? "PICKUP" : "DELIVERY"}\n${order.order_type === "pickup" ? order.pickup_address || '' : order.delivery_address || ''}\nSpecial Instructions: ${order.delivery_instructions || 'None'}\n\nPaid via Clover`,
                tags: order.order_type === "pickup" ? "pickup" : "delivery",
                source_name: "box2eats",
                referring_site: "Box2Eats",
                send_receipt: false,
                send_fulfillment_receipt: false,
                financial_status: "paid"
            }
        };

        const response = await fetch(`https://${SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json`, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shopifyOrderData)
        });

        const responseText = await response.text();
        console.log('Shopify API Response Status:', response.status);
        console.log('Shopify API Response:', responseText);

        if (!response.ok) {
            console.error('❌ Shopify API Error:', responseText);
            return Response.json({ 
                error: 'Failed to create Shopify order', 
                details: responseText,
                status: response.status
            }, { status: response.status });
        }

        const responseData = JSON.parse(responseText);
        const shopifyOrder = responseData.order;

        console.log('✅ Shopify order created successfully:', shopifyOrder.id);

        return Response.json({
            success: true,
            shopify_order_id: shopifyOrder.id,
            shopify_order_number: shopifyOrder.order_number,
            shopify_order_name: shopifyOrder.name
        });

    } catch (error) {
        console.error('Error creating Shopify order:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const CLOVER_PRIVATE_TOKEN = Deno.env.get("CLOVER_PRIVATE_TOKEN");
        const CLOVER_MERCHANT_ID = Deno.env.get("CLOVER_MERCHANT_ID");

        if (!CLOVER_PRIVATE_TOKEN || !CLOVER_MERCHANT_ID) {
            return Response.json({ error: 'Clover credentials not configured' }, { status: 500 });
        }

        const { token, amount, order_data } = await req.json();

        const cloverApiUrl = "https://scl.clover.com/v1/charges";

        console.log('Processing Clover payment:', {
            api_url: cloverApiUrl,
            amount,
            merchant_id: CLOVER_MERCHANT_ID,
            has_token: !!token,
            user_email: user.email
        });

        // Create charge with Clover Ecommerce API
        const chargeData = {
            source: token,
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'cad',
            description: `Box2Eats Order - ${order_data.order_type}`,
            email: user.email
        };

        console.log('Sending charge request to Clover...');

        const response = await fetch(cloverApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOVER_PRIVATE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(chargeData)
        });

        const responseText = await response.text();
        console.log('Clover API Response Status:', response.status);
        console.log('Clover API Response Body:', responseText);

        if (!response.ok) {
            console.error('Clover charge failed:', {
                status: response.status,
                response: responseText
            });
            
            // Parse error for better messaging
            let errorMessage = 'Payment failed';
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorData.error || 'Payment failed';
            } catch (e) {
                errorMessage = responseText || 'Payment failed';
            }
            
            return Response.json({ 
                error: errorMessage,
                details: responseText
            }, { status: 400 });
        }

        const charge = JSON.parse(responseText);
        console.log('✓ Payment successful:', charge.id);

        // Create order in database
        const orderNumber = `ORD-${Date.now()}`;
        await base44.asServiceRole.entities.Order.create({
            order_number: orderNumber,
            items: order_data.items,
            total: amount,
            user_email: user.email,
            status: 'confirmed',
            phone_number: order_data.phone_number,
            order_type: order_data.order_type,
            pickup_location: order_data.pickup_location,
            delivery_address: order_data.delivery_address,
            delivery_instructions: order_data.delivery_instructions,
            customer_first_name: order_data.first_name,
            customer_last_name: order_data.last_name
        });

        console.log('✓ Order created:', orderNumber);

        // Try to create Shopify order
        try {
            console.log('🔵 Creating Shopify order with items:', order_data.items);

            const shopifyResponse = await base44.asServiceRole.functions.invoke('createShopifyOrder', {
                    order: {
                        first_name: order_data.first_name,
                        last_name: order_data.last_name,
                        user_email: order_data.email,
                        items: order_data.items,
                        phone_number: order_data.phone_number,
                        delivery_address: order_data.delivery_address,
                        pickup_address: order_data.pickup_address,
                        delivery_instructions: order_data.delivery_instructions,
                        order_type: order_data.order_type
                    }
                });
            console.log('✅ Shopify order created:', shopifyResponse.data);
        } catch (shopifyError) {
            console.error('❌ Shopify order creation failed:', shopifyError);
            console.error('Error details:', shopifyError.response?.data || shopifyError.message);
            // Continue anyway - order is still created in our system
        }

        return Response.json({
            success: true,
            charge_id: charge.id,
            order_number: orderNumber
        });

    } catch (error) {
        console.error('Payment processing error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const CLOVER_API_TOKEN = Deno.env.get("CLOVER_API_TOKEN");
        const CLOVER_MERCHANT_ID = Deno.env.get("CLOVER_MERCHANT_ID");

        if (!CLOVER_API_TOKEN || !CLOVER_MERCHANT_ID) {
            return Response.json({ error: 'Clover credentials not configured' }, { status: 500 });
        }

        const { amount, card, order_details } = await req.json();

        // Create a charge using Clover Ecommerce API
        const chargeData = {
            amount: Math.round(amount * 100), // Clover expects amount in cents
            currency: "usd",
            source: card.token, // Card token from Clover iframe
            description: `Box2Eats Order - ${order_details.order_number || 'New Order'}`,
            email: user.email,
            metadata: {
                customer_name: user.full_name,
                phone: order_details.phone_number,
                order_type: order_details.order_type
            }
        };

        const response = await fetch(`https://scl.clover.com/v1/charges`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOVER_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(chargeData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Clover Payment Error:', errorText);
            return Response.json({ 
                error: 'Payment failed', 
                details: errorText 
            }, { status: 400 });
        }

        const charge = await response.json();

        return Response.json({
            success: true,
            charge_id: charge.id,
            amount: charge.amount / 100,
            status: charge.status,
            paid: charge.paid
        });

    } catch (error) {
        console.error('Error processing Clover payment:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const CLOVER_API_TOKEN = Deno.env.get("CLOVER_API_TOKEN");

        if (!CLOVER_API_TOKEN) {
            return Response.json({ error: 'Clover API token not configured' }, { status: 500 });
        }

        const { amount, order_data } = await req.json();

        // Get cart items
        const cartItems = await base44.entities.CartItem.filter({ user_email: user.email });
        
        console.log('Creating Clover Ecommerce checkout with amount:', amount);

        // Create a checkout link using Clover's Ecommerce API
        // This generates a payment link that customers can use
        const checkoutData = {
            customer: {
                email: user.email,
                firstName: user.full_name?.split(' ')[0] || 'Customer',
                lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
                phoneNumber: order_data.phone_number || ''
            },
            shoppingCart: {
                lineItems: cartItems.map(item => ({
                    name: item.product_name,
                    unitPrice: Math.round(item.product_price * 100), // cents
                    quantity: item.quantity
                }))
            }
        };

        console.log('Checkout data:', JSON.stringify(checkoutData, null, 2));

        // Try the Clover Ecommerce checkout link API
        const response = await fetch('https://checkout.clover.com/invoicingcheckoutservice/v1/checkouts', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'authorization': `Bearer ${CLOVER_API_TOKEN}`,
                'content-type': 'application/json'
            },
            body: JSON.stringify(checkoutData)
        });

        const responseText = await response.text();
        console.log('Clover Response Status:', response.status);
        console.log('Clover Response:', responseText);

        if (!response.ok) {
            // If this approach fails, return a helpful error
            return Response.json({ 
                error: 'Clover checkout creation failed',
                status: response.status,
                details: responseText,
                message: 'The Clover Ecommerce API is not responding correctly. This might require enabling additional settings in your Clover account or using Clover iframe integration instead.'
            }, { status: 400 });
        }

        const checkout = JSON.parse(responseText);

        return Response.json({
            success: true,
            checkout_url: checkout.href,
            checkout_id: checkout.id
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ 
            error: error.message,
            message: 'Unable to create Clover checkout session'
        }, { status: 500 });
    }
});
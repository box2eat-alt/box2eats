import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const SHOPIFY_WEBHOOK_SECRET = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
        
        if (!SHOPIFY_WEBHOOK_SECRET) {
            return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }

        // Verify webhook signature using Web Crypto API
        const hmacHeader = req.headers.get('X-Shopify-Hmac-Sha256');
        const topic = req.headers.get('X-Shopify-Topic');
        
        if (!hmacHeader || !topic) {
            return Response.json({ error: 'Missing webhook headers' }, { status: 400 });
        }

        const body = await req.text();
        
        // Create HMAC using Web Crypto API
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(SHOPIFY_WEBHOOK_SECRET),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(body)
        );
        
        const hash = btoa(String.fromCharCode(...new Uint8Array(signature)));

        if (hash !== hmacHeader) {
            console.error('Invalid webhook signature');
            return Response.json({ error: 'Invalid webhook signature' }, { status: 401 });
        }

        // Parse the webhook payload
        const data = JSON.parse(body);
        const base44 = createClientFromRequest(req);

        // Handle different webhook topics
        switch (topic) {
            case 'products/create':
            case 'products/update':
                await handleProductUpdate(base44, data);
                break;
            
            case 'products/delete':
                await handleProductDelete(base44, data);
                break;
            
            default:
                console.log(`Unhandled webhook topic: ${topic}`);
        }

        return Response.json({ success: true, topic });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function handleProductUpdate(base44, shopifyProduct) {
    try {
        if (!shopifyProduct.variants || shopifyProduct.variants.length === 0) {
            console.log(`Product ${shopifyProduct.id} has no variants, skipping`);
            return;
        }

        const variant = shopifyProduct.variants[0];
        const price = parseFloat(variant.price);

        const tags = shopifyProduct.tags?.toLowerCase().split(',').map(t => t.trim()) || [];
        const dietary_tags = tags.filter(tag => 
            ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'high-protein'].includes(tag)
        );

        let category = 'lunch';
        const type = shopifyProduct.product_type?.toLowerCase() || '';
        if (type.includes('breakfast') || tags.includes('breakfast')) category = 'breakfast';
        else if (type.includes('lunch') || tags.includes('lunch')) category = 'lunch';
        else if (type.includes('dinner') || tags.includes('dinner')) category = 'dinner';
        else if (type.includes('snack') || tags.includes('snacks')) category = 'snacks';
        else if (type.includes('dessert') || tags.includes('desserts')) category = 'desserts';
        else if (type.includes('drink') || tags.includes('drinks')) category = 'drinks';

        // SIMPLIFIED: Show ALL active products, ignore inventory tracking
        const isActive = shopifyProduct.status === 'active';

        console.log(`Webhook update: ${shopifyProduct.title} - Status: ${shopifyProduct.status} - Setting in_stock: ${isActive}`);

        const productData = {
            shopify_id: shopifyProduct.id.toString(),
            shopify_variant_id: variant.id.toString(),
            name: shopifyProduct.title,
            description: shopifyProduct.body_html?.replace(/<[^>]*>/g, '').substring(0, 500) || '',
            price: price,
            image_url: shopifyProduct.images?.[0]?.src || '',
            category: category,
            dietary_tags: dietary_tags,
            in_stock: isActive, // Show if active in Shopify, regardless of inventory
            featured: tags.includes('featured')
        };

        // Check if product exists
        const existingProducts = await base44.asServiceRole.entities.Product.filter({ 
            shopify_id: shopifyProduct.id.toString() 
        });

        if (existingProducts.length > 0) {
            await base44.asServiceRole.entities.Product.update(existingProducts[0].id, productData);
            console.log(`Product ${shopifyProduct.id} updated - Status: ${isActive ? 'Active' : 'Inactive'}`);
        } else {
            await base44.asServiceRole.entities.Product.create(productData);
            console.log(`Product ${shopifyProduct.id} created - Status: ${isActive ? 'Active' : 'Inactive'}`);
        }
    } catch (error) {
        console.error('Error handling product update:', error);
    }
}

async function handleProductDelete(base44, shopifyProduct) {
    try {
        const existingProducts = await base44.asServiceRole.entities.Product.filter({ 
            shopify_id: shopifyProduct.id.toString() 
        });

        if (existingProducts.length > 0) {
            await base44.asServiceRole.entities.Product.delete(existingProducts[0].id);
            console.log(`Product ${shopifyProduct.id} deleted successfully`);
        }
    } catch (error) {
        console.error('Error handling product delete:', error);
    }
}
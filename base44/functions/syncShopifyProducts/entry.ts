import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const SHOPIFY_STORE_URL = Deno.env.get("SHOPIFY_STORE_URL");
        const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

        if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
            return Response.json({ error: 'Shopify credentials not configured' }, { status: 500 });
        }

        // Try without status filter first - default is active
        const shopifyUrl = `https://${SHOPIFY_STORE_URL}/admin/api/2024-10/products.json?limit=250`;
        console.log('Fetching products from Shopify (no status filter)...');
        console.log(`Full URL: ${shopifyUrl}`);
        console.log(`Store URL: ${SHOPIFY_STORE_URL}`);
        console.log(`Token (first 10 chars): ${SHOPIFY_ACCESS_TOKEN?.substring(0, 10)}...`);
        console.log(`Token length: ${SHOPIFY_ACCESS_TOKEN?.length || 0} chars`);

        const response = await fetch(shopifyUrl, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Shopify API Error:', response.status, errorText);
            return Response.json({ 
                error: 'Failed to fetch Shopify products', 
                status: response.status,
                details: errorText,
                url: shopifyUrl,
                store_url: SHOPIFY_STORE_URL
            }, { status: 500 });
        }

        const data = await response.json();
        console.log('📦 Products count in response:', data.products?.length || 0);
        console.log('📦 First product (if any):', data.products?.[0] ? JSON.stringify(data.products[0], null, 2) : 'No products');
        
        const products = data.products || [];
        console.log(`✓ Fetched ${products.length} total products from Shopify`);
        
        if (products.length === 0) {
            console.warn('⚠️ No products returned from Shopify - check API credentials and permissions');
        }

        const existingProducts = await base44.asServiceRole.entities.Product.list();
        const existingProductMap = new Map(existingProducts.map(p => [p.shopify_id, p]));
        const existingByNameMap = new Map(existingProducts.map(p => [p.name.toLowerCase().trim(), p]));

        let synced = 0;
        let updated = 0;
        let skipped = 0;
        let linked = 0;

        for (const shopifyProduct of products) {
            try {
                // Check if this product exists in our database by shopify_id OR by name
                let existingProduct = existingProductMap.get(shopifyProduct.id.toString());
                let matchedByName = false;

                if (!existingProduct) {
                    // Try to match by name if shopify_id doesn't match
                    existingProduct = existingByNameMap.get(shopifyProduct.title.toLowerCase().trim());
                    if (existingProduct) {
                        matchedByName = true;
                        console.log(`🔗 Linking "${shopifyProduct.title}" to existing product by name match`);
                        linked++;
                    }
                }

                if (!existingProduct) {
                    // Skip products that don't exist in our database - don't create new ones
                    console.log(`⏭️ Skipping "${shopifyProduct.title}" - not in our product catalog`);
                    skipped++;
                    continue;
                }

                if (!shopifyProduct.variants || shopifyProduct.variants.length === 0) {
                    console.log(`⚠️ Skipping ${shopifyProduct.title} - no variants`);
                    continue;
                }

                const variant = shopifyProduct.variants[0];
                const price = parseFloat(variant.price);

                const tags = shopifyProduct.tags?.toLowerCase().split(',').map(t => t.trim()) || [];
                const dietary_tags = tags.filter(tag => 
                    ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'high-protein'].includes(tag)
                );

                // Extract categories from tags and product type
                const categoryTags = ['breakfast', 'lunch', 'dinner', 'snacks', 'drinks', 'desserts'];
                const categories = [];
                const type = shopifyProduct.product_type?.toLowerCase() || '';
                
                // Check tags for categories
                categoryTags.forEach(cat => {
                    if (tags.includes(cat) || type.includes(cat.replace('s', ''))) {
                        categories.push(cat);
                    }
                });
                
                // Keep existing categories if no new ones found
                const finalCategories = categories.length > 0 ? categories : (existingProduct.categories || []);

                const isActive = shopifyProduct.status === 'active';

                // Log JH products specifically
                if (shopifyProduct.title.includes('JH')) {
                    console.log(`🔍 JH Product: "${shopifyProduct.title}" - Shopify Status: ${shopifyProduct.status} - Setting in_stock: ${isActive}`);
                }

                const productData = {
                    shopify_id: shopifyProduct.id.toString(),
                    shopify_variant_id: variant.id.toString(),
                    name: shopifyProduct.title,
                    description: shopifyProduct.body_html?.replace(/<[^>]*>/g, '').substring(0, 500) || '',
                    price: price,
                    image_url: shopifyProduct.images?.[0]?.src || '',
                    categories: finalCategories,
                    dietary_tags: dietary_tags,
                    in_stock: isActive,
                    featured: tags.includes('featured')
                };

                // Only update existing products
                await base44.asServiceRole.entities.Product.update(existingProduct.id, productData);
                updated++;
                synced++;

            } catch (productError) {
                console.error(`❌ Error processing product ${shopifyProduct.id}:`, productError);
            }
        }

        console.log(`✅ Sync complete: ${synced} synced, ${updated} updated, ${linked} linked by name, ${skipped} skipped (not in catalog)`);

        return Response.json({
            success: true,
            synced,
            updated,
            linked,
            skipped,
            total_shopify_products: products.length,
            message: `Updated ${updated} existing products. ${linked} products were linked by name match. Skipped ${skipped} products not in your catalog.`
        });

    } catch (error) {
        console.error('❌ Sync error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});
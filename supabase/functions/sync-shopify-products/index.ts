import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SHOPIFY_STORE_URL = Deno.env.get('SHOPIFY_STORE_URL')?.trim();
    const SHOPIFY_ACCESS_TOKEN = Deno.env.get('SHOPIFY_ACCESS_TOKEN')?.trim();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Missing Shopify credentials in secrets (SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch ALL products from Shopify (active + draft + archived)
    // so we can detect when Mary deactivates meals
    console.log('Fetching products from Shopify...');
    const allProducts: any[] = [];

    for (const status of ['active', 'draft', 'archived']) {
      const shopifyRes = await fetch(
        `https://${SHOPIFY_STORE_URL}/admin/api/2024-10/products.json?limit=250&status=${status}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          },
        }
      );

      if (!shopifyRes.ok) {
        const errText = await shopifyRes.text();
        console.error(`Shopify API error (${status}):`, shopifyRes.status, errText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch Shopify products', details: errText, status: shopifyRes.status }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { products: statusProducts } = await shopifyRes.json();
      allProducts.push(...statusProducts);
    }

    const products = allProducts;
    console.log(`Fetched ${products.length} total products from Shopify`);

    let synced = 0;
    let failed = 0;

    for (const p of products) {
      try {
        const variant = p.variants?.[0];
        if (!variant) continue;

        const tags = (p.tags || '').toLowerCase().split(',').map((t: string) => t.trim()).filter(Boolean);

        const dietaryTags = tags.filter((t: string) =>
          ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'high-protein'].includes(t)
        );

        const categoryMap: Record<string, string> = {
          breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner',
          snacks: 'snacks', snack: 'snacks', drinks: 'drinks',
          drink: 'drinks', desserts: 'desserts', dessert: 'desserts',
        };
        const type = (p.product_type || '').toLowerCase();
        let category = 'lunch';
        for (const [key, val] of Object.entries(categoryMap)) {
          if (tags.includes(key) || type.includes(key)) { category = val; break; }
        }

        const productData = {
          shopify_id: p.id.toString(),
          shopify_variant_id: variant.id.toString(),
          name: p.title,
          description: (p.body_html || '').replace(/<[^>]*>/g, '').substring(0, 500),
          price: parseFloat(variant.price),
          image_url: p.images?.[0]?.src || '',
          images: p.images?.map((img: any) => img.src) || [],
          category,
          dietary_tags: dietaryTags,
          in_stock: p.status === 'active',
          featured: tags.includes('featured'),
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('products')
          .upsert(productData, { onConflict: 'shopify_id', ignoreDuplicates: false });

        if (error) {
          console.error(`Failed to upsert ${p.title}:`, error);
          failed++;
        } else {
          synced++;
        }
      } catch (err) {
        console.error(`Error processing ${p.title}:`, err);
        failed++;
      }
    }

    console.log(`Sync complete: ${synced} synced, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        total: products.length,
        synced,
        failed,
        message: `Synced ${synced} products from Mary's Kitchen Shopify store.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Sync error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

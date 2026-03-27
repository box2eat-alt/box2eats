import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        console.log('🔵 initializeCloverPayment: Request received');
        console.log('Headers:', Object.fromEntries(req.headers.entries()));
        
        const base44 = createClientFromRequest(req);
        
        console.log('🔵 Attempting to authenticate user...');
        const user = await base44.auth.me();
        console.log('✅ User authenticated:', user?.email);
        
        if (!user) {
            console.error('❌ No user found in request');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const CLOVER_PUBLIC_TOKEN = Deno.env.get("CLOVER_PUBLIC_TOKEN");
        const CLOVER_MERCHANT_ID = Deno.env.get("CLOVER_MERCHANT_ID");

        if (!CLOVER_PUBLIC_TOKEN || !CLOVER_MERCHANT_ID) {
            return Response.json({ error: 'Clover credentials not configured' }, { status: 500 });
        }

        return Response.json({
            success: true,
            clover_public_token: CLOVER_PUBLIC_TOKEN,
            merchant_id: CLOVER_MERCHANT_ID
        });

    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
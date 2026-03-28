import { createClient } from 'npm:@supabase/supabase-js@2';

const SCOPES = 'read_products,write_products,read_orders,write_orders,read_inventory';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const shop = Deno.env.get('SHOPIFY_STORE') ?? '';
  const clientId = Deno.env.get('SHOPIFY_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET') ?? '';
  const redirectUri = `${url.origin}/functions/v1/shopify-oauth`;

  // Step 2: Exchange code for access token
  if (code) {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return new Response(
        `<h2>Error getting token</h2><pre>${JSON.stringify(tokenData, null, 2)}</pre>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Store the token as a Supabase secret via management API
    return new Response(
      `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:60px auto;padding:20px">
  <h2>✅ Shopify Access Token Retrieved!</h2>
  <p>Copy this token and add it to <strong>Supabase → Settings → Edge Functions → Secrets</strong> as <code>SHOPIFY_ACCESS_TOKEN</code>:</p>
  <div style="background:#f0f0f0;padding:16px;border-radius:8px;word-break:break-all;font-family:monospace;font-size:14px">
    ${accessToken}
  </div>
  <p style="color:#888;margin-top:20px">You can now close this tab and delete the shopify-oauth Edge Function.</p>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Step 1: Redirect to Shopify OAuth
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=box2eats`;
  return Response.redirect(authUrl, 302);
});

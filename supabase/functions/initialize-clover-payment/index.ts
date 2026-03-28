import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

    const publicToken = Deno.env.get("CLOVER_PUBLIC_TOKEN");
    const merchantId = Deno.env.get("CLOVER_MERCHANT_ID");
    if (!publicToken || !merchantId) {
      return Response.json(
        { error: "Clover credentials not configured" },
        { status: 500, headers: corsHeaders },
      );
    }

    return Response.json(
      {
        success: true,
        clover_public_token: publicToken,
        merchant_id: merchantId,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});

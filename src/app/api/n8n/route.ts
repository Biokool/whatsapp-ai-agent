import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/infrastructure/database/supabase";
import { DEFAULT_TENANT_ID } from "@/core/types/database";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("n8n_config")
      .select("*")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }

    return NextResponse.json(data || { configured: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { webhookUrl, webhookSecret, config } = await req.json();

    if (!webhookUrl) {
      return NextResponse.json({ error: "webhookUrl required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(webhookUrl);
    } catch {
      return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Upsert config
    const { data, error } = await supabase
      .from("n8n_config")
      .upsert(
        {
          tenant_id: DEFAULT_TENANT_ID,
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret || null,
          is_active: true,
          config: config || {},
        },
        { onConflict: "tenant_id" }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, config: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("n8n_config").delete().eq("tenant_id", DEFAULT_TENANT_ID);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

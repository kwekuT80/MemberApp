/**
 * Edge Function: Send Email via Resend API
 *
 * Securely sends emails through Resend using the Supabase-hosted edge function.
 * The RESEND_API_KEY is stored in Supabase Secrets (not exposed to clients).
 *
 * Endpoint: POST https://<supabase-url>.supabase.co/functions/v1/send-email
 * Content-Type: application/json
 * Authorization: Bearer <service_role_key>
 *
 * Request Body:
 * {
 *   "to": "recipient@example.com",
 *   "subject": "Email Subject",
 *   "html": "<p>Email body in HTML</p>",
 *   "text": "Plain text fallback",
 *   "from_name": "KSJI Commandery (optional)",
 *   "request_id": "uuid-12345 (optional — links to communication_requests table)"
 * }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Supabase configuration (injected by Supabase CLI)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Resend API key — stored in Supabase Secrets, never exposed to client
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESENDER_EMAIL = Deno.env.get("RESENDER_SENDER_EMAIL") || "communications.app@ksji500.org";

interface SendEmailRequest {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  from_name?: string;
  request_id?: string;
}

interface ResendResponse {
  id: string;
  object: "message";
}

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Validate API key is configured in Supabase Secrets
  if (!RESEND_API_KEY) {
    console.error("[send-email] RESEND_API_KEY not configured in Supabase Secrets");
    return new Response(
      JSON.stringify({ error: "Resend API key not configured" }),
      { status: 500 }
    );
  }

  let payload: SendEmailRequest;
  try {
    payload = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  // Validate required fields
  if (!payload.to || !payload.html) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: 'to' and 'html'" }),
      { status: 400 }
    );
  }

  try {
    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${payload.from_name || "KSJI Commandery"} <${RESENDER_EMAIL}>`,
        to: [payload.to],
        subject: payload.subject || "Communication from KSJI Commandery",
        html: payload.html,
        text: payload.text || "",
      }),
    });

    let resendResult: ResendResponse;
    try {
      resendResult = await response.json();
    } catch {
      resendResult = {} as any;
    }

    // Record delivery state in Supabase (service role bypasses RLS)
    if (response.ok && resendResult.id) {
      const { error: insertError } = await supabase
        .from("communication_delivery_states")
        .insert({
          request_id: payload.request_id || null,
          channel: "email",
          provider_event_id: `resend_${resendResult.id}`,
          status: "SENT",
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("[send-email] Failed to record delivery state:", insertError);
      }
    }

    if (!response.ok) {
      const errorMsg = resendResult.message || `HTTP ${response.status}`;
      // Record failure in delivery states
      await supabase.from("communication_delivery_states").insert({
        request_id: payload.request_id || null,
        channel: "email",
        provider_event_id: "resend_error",
        status: "FAILED",
        error_message: errorMsg,
        created_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ error: errorMsg }), { status: response.status });
    }

    // Success — return message ID for tracking
    return new Response(
      JSON.stringify({ success: true, messageId: resendResult.id }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-email] Failed to send email:", error);

    // Record failure in delivery states
    await supabase.from("communication_delivery_states").insert({
      request_id: payload.request_id || null,
      channel: "email",
      provider_event_id: "resend_network_error",
      status: "FAILED",
      error_message: (error as Error).message,
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500 }
    );
  }
});

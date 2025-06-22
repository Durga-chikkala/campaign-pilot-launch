
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestEmailRequest {
  campaignId: string
  testEmail: string
  smtpConfig: {
    host: string
    port: number
    senderEmail: string
    senderName: string
    appPassword: string
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Test email function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { campaignId, testEmail, smtpConfig }: TestEmailRequest = await req.json()
    console.log('Sending test email to:', testEmail)

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get campaign template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    if (templateError) {
      console.error('Template error:', templateError)
      throw new Error('Failed to fetch template')
    }

    // Send test email using SMTP
    const emailData = {
      to: testEmail,
      subject: `[TEST] ${template.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #e74c3c; margin: 0;">🧪 Test Email</h2>
            <p style="margin: 10px 0 0 0; color: #666;">This is a test email from your campaign.</p>
          </div>
          <div style="background-color: white; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h3>Subject: ${template.subject}</h3>
            <div style="white-space: pre-wrap; line-height: 1.6;">${template.body}</div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #888; font-size: 12px;">
            <p>This email was sent from ${smtpConfig.senderName} &lt;${smtpConfig.senderEmail}&gt;</p>
          </div>
        </div>
      `,
      smtp: smtpConfig
    }

    // Call the send-email function
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
      body: emailData
    })

    if (emailError) {
      console.error('Email sending error:', emailError)
      throw emailError
    }

    console.log('Test email sent successfully')
    return new Response(JSON.stringify({ success: true, message: 'Test email sent successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Error in send-test-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}

serve(handler)

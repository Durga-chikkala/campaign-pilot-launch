
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  smtp: {
    host: string
    port: number
    senderEmail: string
    senderName: string
    appPassword: string
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Send email function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { to, subject, html, smtp }: EmailRequest = await req.json()
    console.log('Sending email to:', to)

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    if (!Deno.env.get('RESEND_API_KEY')) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const emailResponse = await resend.emails.send({
      from: `${smtp.senderName} <${smtp.senderEmail}>`,
      to: [to],
      subject: subject,
      html: html,
    })

    if (emailResponse.error) {
      console.error('Resend error:', emailResponse.error)
      throw new Error(`Failed to send email: ${emailResponse.error.message}`)
    }

    console.log('Email sent successfully via Resend:', emailResponse.data?.id)
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: emailResponse.data?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Error in send-email function:', error)
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

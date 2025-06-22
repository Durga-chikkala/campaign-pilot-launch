
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CampaignEmailRequest {
  campaignId: string
  campaignData: {
    template: any
    csvData: any[]
    placeholderMappings: Record<string, string>
    smtpConfig: {
      host: string
      port: number
      senderEmail: string
      senderName: string
      appPassword: string
    }
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Campaign email function called')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { campaignId, campaignData }: CampaignEmailRequest = await req.json()
    console.log('Starting campaign:', campaignId)

    // Create Supabase client with service role for backend operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { template, csvData, placeholderMappings, smtpConfig } = campaignData

    // Get JWT token from request headers for user identification
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      throw new Error('Authorization token required')
    }

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Invalid authorization token')
    }

    // Insert recipients into database
    const recipients = csvData.map((row: any) => ({
      campaign_id: campaignId,
      user_id: user.id,
      email: row[placeholderMappings['{{email}}'] || 'email'] || row.email,
      status: 'pending',
      data: row
    }))

    const { error: recipientsError } = await supabase
      .from('recipients')
      .insert(recipients)

    if (recipientsError) {
      console.error('Error inserting recipients:', recipientsError)
      throw new Error('Failed to insert recipients')
    }

    // Update campaign status and counts
    const { error: campaignUpdateError } = await supabase
      .from('campaigns')
      .update({
        status: 'active',
        total_recipients: csvData.length,
        sent_count: 0,
        failed_count: 0
      })
      .eq('id', campaignId)

    if (campaignUpdateError) {
      console.error('Error updating campaign:', campaignUpdateError)
      throw new Error('Failed to update campaign')
    }

    // Start background email sending process
    EdgeRuntime.waitUntil(sendEmailsInBackground(campaignId, template, recipients, placeholderMappings, smtpConfig, supabase))

    console.log('Campaign started successfully')
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Campaign started successfully',
      campaignId,
      totalRecipients: csvData.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Error in send-campaign-emails function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}

async function sendEmailsInBackground(
  campaignId: string,
  template: any,
  recipients: any[],
  placeholderMappings: Record<string, string>,
  smtpConfig: any,
  supabase: any
) {
  console.log('Starting background email sending for campaign:', campaignId)
  
  let sentCount = 0
  let failedCount = 0

  for (const recipient of recipients) {
    try {
      // Replace placeholders in template
      let personalizedSubject = template.subject
      let personalizedBody = template.body

      Object.entries(placeholderMappings).forEach(([placeholder, csvColumn]) => {
        const value = recipient.data[csvColumn] || ''
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        personalizedSubject = personalizedSubject.replace(regex, value)
        personalizedBody = personalizedBody.replace(regex, value)
      })

      // Send individual email
      const emailData = {
        to: recipient.email,
        subject: personalizedSubject,
        html: personalizedBody,
        smtp: smtpConfig
      }

      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
        body: emailData
      })

      if (emailError) {
        throw emailError
      }

      // Update recipient status to sent
      await supabase
        .from('recipients')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', recipient.id)

      sentCount++
      console.log(`Email sent to ${recipient.email} (${sentCount}/${recipients.length})`)

      // Rate limiting - wait between emails
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error: any) {
      console.error(`Failed to send email to ${recipient.email}:`, error)
      
      // Update recipient status to failed
      await supabase
        .from('recipients')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', recipient.id)

      failedCount++
    }

    // Update campaign progress every 10 emails
    if ((sentCount + failedCount) % 10 === 0) {
      await supabase
        .from('campaigns')
        .update({
          sent_count: sentCount,
          failed_count: failedCount
        })
        .eq('id', campaignId)
    }
  }

  // Final campaign update
  const isCompleted = sentCount + failedCount === recipients.length
  await supabase
    .from('campaigns')
    .update({
      status: isCompleted ? 'completed' : 'paused',
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: isCompleted ? new Date().toISOString() : null
    })
    .eq('id', campaignId)

  console.log(`Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`)
}

serve(handler)

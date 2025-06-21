
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Send, ChevronRight, ChevronLeft, AlertTriangle, Rocket } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SendEmailsStepProps {
  campaignId: string
  campaignData: any
  onNext: () => void
  onPrev: () => void
}

const SendEmailsStep: React.FC<SendEmailsStepProps> = ({
  campaignId,
  campaignData,
  onNext,
  onPrev
}) => {
  const [loading, setLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const sendCampaign = async () => {
    setLoading(true)
    try {
      // Update campaign status to active
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId)

      if (campaignError) throw campaignError

      // Call Supabase Edge Function to start sending emails
      const { data, error } = await supabase.functions.invoke('send-campaign-emails', {
        body: {
          campaignId,
          campaignData
        }
      })

      if (error) throw error

      toast({
        title: "Campaign launched!",
        description: "Your email campaign has been started. Monitor progress in the logs section.",
      })

      onNext()
    } catch (error: any) {
      toast({
        title: "Error launching campaign",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setShowConfirmDialog(false)
    }
  }

  const emailCount = campaignData.csvData?.length || 0
  const placeholderCount = Object.keys(campaignData.placeholderMappings || {}).length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Launch Your Campaign</h2>
        <p className="text-gray-600">Ready to send your emails? Review the details below</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Overview</CardTitle>
            <CardDescription>Final review before sending</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-700">{emailCount.toLocaleString()}</div>
                <div className="text-sm text-blue-600">Total Emails</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-700">{placeholderCount}</div>
                <div className="text-sm text-green-600">Mapped Fields</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Template:</span>
                <Badge>{campaignData.template?.name}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">From:</span>
                <span className="text-sm font-medium">{campaignData.smtpConfig?.senderName} &lt;{campaignData.smtpConfig?.senderEmail}&gt;</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">SMTP Server:</span>
                <span className="text-sm font-medium">{campaignData.smtpConfig?.host}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
            <CardDescription>Please read before launching</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Sending Rate Limits</p>
                <p className="text-amber-700">
                  Your emails will be sent gradually to respect server limits and improve deliverability.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <Send className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Monitor Progress</p>
                <p className="text-blue-700">
                  You can track the sending progress and view logs in real-time on the next page.
                </p>
              </div>
            </div>

            <div className="text-xs text-gray-600 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium mb-1">Legal Compliance:</p>
              <p>Ensure you have permission to email all recipients and comply with anti-spam laws in your jurisdiction.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Preview</CardTitle>
          <CardDescription>Sample of how your emails will appear</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Subject:</div>
              <div className="p-3 bg-gray-50 rounded border text-sm">
                {campaignData.template?.subject}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Body Preview:</div>
              <div className="p-3 bg-gray-50 rounded border text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                {campaignData.template?.body?.substring(0, 200)}
                {campaignData.template?.body?.length > 200 && '...'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
              disabled={loading}
            >
              <Send className="w-4 h-4 mr-2" />
              Launch Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Campaign Launch</DialogTitle>
              <DialogDescription>
                Are you ready to send {emailCount.toLocaleString()} emails?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-800">Final Confirmation</span>
                </div>
                <p className="text-sm text-red-700">
                  Once started, this campaign cannot be stopped. Make sure all details are correct.
                </p>
              </div>
              
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total emails:</span>
                  <span className="font-medium">{emailCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Template:</span>
                  <span className="font-medium">{campaignData.template?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium">{campaignData.smtpConfig?.senderEmail}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={sendCampaign}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? "Launching..." : "Yes, Send Emails"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default SendEmailsStep

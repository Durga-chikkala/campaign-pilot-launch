
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Mail, Send, ChevronRight, ChevronLeft, Shield, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SMTPConfigStepProps {
  campaignId: string
  onNext: () => void
  onPrev: () => void
  onDataChange: (data: any) => void
}

const SMTPConfigStep: React.FC<SMTPConfigStepProps> = ({
  campaignId,
  onNext,
  onPrev,
  onDataChange
}) => {
  const [host, setHost] = useState('')
  const [port, setPort] = useState(587)
  const [senderEmail, setSenderEmail] = useState('')
  const [senderName, setSenderName] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    loadExistingConfig()
  }, [campaignId])

  const loadExistingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('smtp_configs')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', user?.id)
        .single()

      if (data) {
        setHost(data.host)
        setPort(data.port)
        setSenderEmail(data.sender_email)
        setSenderName(data.sender_name)
        // Don't load the password for security
      }
    } catch (error) {
      // Config doesn't exist yet, which is fine
    }
  }

  const saveConfig = async () => {
    if (!host.trim() || !senderEmail.trim() || !senderName.trim() || !appPassword.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const configData = {
        campaign_id: campaignId,
        user_id: user?.id,
        host,
        port,
        sender_email: senderEmail,
        sender_name: senderName,
      }

      // Check if config exists
      const { data: existingConfig } = await supabase
        .from('smtp_configs')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('user_id', user?.id)
        .single()

      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from('smtp_configs')
          .update(configData)
          .eq('id', existingConfig.id)

        if (error) throw error
      } else {
        // Create new config
        const { error } = await supabase
          .from('smtp_configs')
          .insert([configData])

        if (error) throw error
      }

      // Save password separately in Supabase secrets (this would need to be implemented)
      // For now, we'll just pass it to the next step
      onDataChange({
        host,
        port,
        senderEmail,
        senderName,
        appPassword // In production, this should be handled more securely
      })

      toast({
        title: "SMTP configuration saved!",
        description: "Your email settings have been saved successfully.",
      })

      onNext()
    } catch (error: any) {
      toast({
        title: "Error saving configuration",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Test email required",
        description: "Please enter an email address to send the test email to.",
        variant: "destructive",
      })
      return
    }

    setTestLoading(true)
    try {
      // This would call a Supabase Edge Function to send a test email
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          campaignId,
          testEmail,
          smtpConfig: {
            host,
            port,
            senderEmail,
            senderName,
            appPassword
          }
        }
      })

      if (error) throw error

      toast({
        title: "Test email sent!",
        description: `Test email sent successfully to ${testEmail}`,
      })
    } catch (error: any) {
      toast({
        title: "Test email failed",
        description: error.message || "Failed to send test email. Please check your SMTP settings.",
        variant: "destructive",
      })
    } finally {
      setTestLoading(false)
    }
  }

  const smtpProviders = [
    {
      name: "Gmail",
      host: "smtp.gmail.com",
      port: 587,
      instructions: "Use your Gmail address and an App Password (not your regular password)"
    },
    {
      name: "Outlook",
      host: "smtp-mail.outlook.com",
      port: 587,
      instructions: "Use your Outlook/Hotmail address and password"
    },
    {
      name: "Yahoo",
      host: "smtp.mail.yahoo.com",
      port: 587,
      instructions: "Use your Yahoo address and an App Password"
    },
    {
      name: "SendGrid",
      host: "smtp.sendgrid.net",
      port: 587,
      instructions: "Use 'apikey' as username and your API key as password"
    }
  ]

  const selectProvider = (provider: any) => {
    setHost(provider.host)
    setPort(provider.port)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Configure SMTP Settings</h2>
        <p className="text-gray-600">Set up your email server configuration to send campaigns</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>Enter your email server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">SMTP Host</Label>
                  <Input
                    id="host"
                    placeholder="smtp.gmail.com"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    placeholder="587"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value) || 587)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderEmail">Sender Email</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  placeholder="your-email@gmail.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senderName">Sender Name</Label>
                <Input
                  id="senderName"
                  placeholder="Your Name or Company"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appPassword">
                  <div className="flex items-center">
                    App Password
                    <Shield className="w-4 h-4 ml-1 text-amber-500" />
                  </div>
                </Label>
                <Input
                  id="appPassword"
                  type="password"
                  placeholder="Your app password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                />
                <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Security Note:</p>
                    <p>Use an App Password, not your regular account password. App passwords are more secure and can be revoked if needed.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
              <CardDescription>Send a test email to verify your settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Test Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <Button
                onClick={sendTestEmail}
                disabled={testLoading || !host || !senderEmail || !appPassword || !testEmail}
                variant="outline"
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {testLoading ? "Sending..." : "Send Test Email"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Setup</CardTitle>
              <CardDescription>Choose from popular email providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {smtpProviders.map((provider, index) => (
                <div key={index}>
                  <div
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => selectProvider(provider)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{provider.name}</div>
                        <div className="text-xs text-gray-600">{provider.host}:{provider.port}</div>
                      </div>
                      <Button variant="ghost" size="sm">
                        Use
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 pl-3 text-xs text-gray-600">
                    {provider.instructions}
                  </div>
                  {index < smtpProviders.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to get App Passwords</CardTitle>
              <CardDescription>Step-by-step guides for major providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="font-medium text-blue-600 mb-2">Gmail:</div>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Enable 2-Factor Authentication</li>
                  <li>Go to Google Account settings</li>
                  <li>Security → 2-Step Verification → App passwords</li>
                  <li>Generate password for "Mail"</li>
                </ol>
              </div>
              <Separator />
              <div>
                <div className="font-medium text-blue-600 mb-2">Outlook:</div>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Sign in to Outlook.com</li>
                  <li>Security → Advanced security options</li>
                  <li>Create a new app password</li>
                  <li>Use this password instead of your regular one</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={saveConfig}
          disabled={loading || !host.trim() || !senderEmail.trim() || !senderName.trim() || !appPassword.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
        >
          {loading ? "Saving..." : "Save Configuration"}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

export default SMTPConfigStep

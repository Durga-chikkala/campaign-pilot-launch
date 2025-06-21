
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Code, Eye, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EmailTemplateStepProps {
  campaignId: string
  onNext: () => void
  onDataChange: (data: any) => void
}

const EmailTemplateStep: React.FC<EmailTemplateStepProps> = ({
  campaignId,
  onNext,
  onDataChange
}) => {
  const [templateName, setTemplateName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [placeholders, setPlaceholders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    loadExistingTemplate()
  }, [campaignId])

  useEffect(() => {
    // Detect placeholders in subject and body
    const text = `${subject} ${body}`
    const placeholderRegex = /\{\{([^}]+)\}\}/g
    const matches = text.match(placeholderRegex) || []
    const uniquePlaceholders = [...new Set(matches)]
    setPlaceholders(uniquePlaceholders)
  }, [subject, body])

  const loadExistingTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', user?.id)
        .single()

      if (data) {
        setTemplateName(data.name)
        setSubject(data.subject)
        setBody(data.body)
      }
    } catch (error) {
      // Template doesn't exist yet, which is fine
    }
  }

  const saveTemplate = async () => {
    if (!templateName.trim() || !subject.trim() || !body.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const templateData = {
        campaign_id: campaignId,
        user_id: user?.id,
        name: templateName,
        subject: subject,
        body: body,
        placeholders: placeholders
      }

      // Check if template exists
      const { data: existingTemplate } = await supabase
        .from('email_templates')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('user_id', user?.id)
        .single()

      if (existingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', existingTemplate.id)

        if (error) throw error
      } else {
        // Create new template
        const { error } = await supabase
          .from('email_templates')
          .insert([templateData])

        if (error) throw error
      }

      onDataChange({
        name: templateName,
        subject: subject,
        body: body,
        placeholders: placeholders
      })

      toast({
        title: "Template saved!",
        description: "Your email template has been saved successfully.",
      })

      onNext()
    } catch (error: any) {
      toast({
        title: "Error saving template",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const sampleTemplates = [
    {
      name: "Welcome Email",
      subject: "Welcome {{name}}! Let's get started",
      body: `Hi {{name}},

Welcome to our platform! We're excited to have you join us.

Here's what you can do next:
- Complete your profile
- Explore our features
- Connect with other users

Best regards,
The {{company}} Team`
    },
    {
      name: "Product Launch",
      subject: "🚀 Exciting news from {{company}}!",
      body: `Hi {{name}},

We're thrilled to announce the launch of our new product!

As a valued customer, you get early access to:
- Advanced features
- Priority support
- Special pricing

Visit {{website}} to learn more.

Best,
{{sender_name}}`
    }
  ]

  const insertSampleTemplate = (template: any) => {
    setTemplateName(template.name)
    setSubject(template.subject)
    setBody(template.body)
  }

  const renderPreview = () => {
    const previewSubject = subject.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
      return `[${placeholder.toUpperCase()}]`
    })
    
    const previewBody = body.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
      return `[${placeholder.toUpperCase()}]`
    })

    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="mb-4">
          <Label className="text-sm font-medium text-gray-700">Subject Preview:</Label>
          <div className="mt-1 p-2 bg-white border rounded text-sm">
            {previewSubject}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium text-gray-700">Body Preview:</Label>
          <div className="mt-1 p-3 bg-white border rounded text-sm whitespace-pre-wrap">
            {previewBody}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Email Template</h2>
        <p className="text-gray-600">Design your email template with dynamic placeholders</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>Configure your email template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  placeholder="Enter template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  placeholder="Enter subject line (use {{placeholders}})"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="body">Email Body</Label>
                <Textarea
                  id="body"
                  placeholder="Enter email body (use {{placeholders}})"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                />
              </div>

              {placeholders.length > 0 && (
                <div>
                  <Label>Detected Placeholders</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {placeholders.map((placeholder, index) => (
                      <Badge key={index} variant="secondary">
                        {placeholder}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sample Templates</CardTitle>
              <CardDescription>Start with a pre-built template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sampleTemplates.map((template, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => insertSampleTemplate(template)}
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{template.subject}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>See how your email will look</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </CardHeader>
            {showPreview && (
              <CardContent>
                {renderPreview()}
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={saveTemplate}
          disabled={loading || !templateName.trim() || !subject.trim() || !body.trim()}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          {loading ? "Saving..." : "Save Template"}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

export default EmailTemplateStep

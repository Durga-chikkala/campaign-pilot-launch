
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Import step components
import EmailTemplateStep from '@/components/campaign/EmailTemplateStep'
import CSVUploadStep from '@/components/campaign/CSVUploadStep'
import SMTPConfigStep from '@/components/campaign/SMTPConfigStep'
import PreviewStep from '@/components/campaign/PreviewStep'
import SendEmailsStep from '@/components/campaign/SendEmailsStep'
import LogsStep from '@/components/campaign/LogsStep'

interface Campaign {
  id: string
  name: string
  status: string
  created_at: string
}

const steps = [
  { id: 1, name: 'Email Template', description: 'Create your email template' },
  { id: 2, name: 'Upload CSV', description: 'Upload and map your data' },
  { id: 3, name: 'SMTP Config', description: 'Configure email settings' },
  { id: 4, name: 'Preview', description: 'Preview your campaign' },
  { id: 5, name: 'Send Emails', description: 'Launch your campaign' },
  { id: 6, name: 'Logs', description: 'Monitor progress and results' },
]

const CampaignBuilder = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [campaignData, setCampaignData] = useState({
    template: null,
    csvData: null,
    csvHeaders: [],
    placeholderMappings: {},
    smtpConfig: null,
  })

  const isNewCampaign = id === 'new'

  useEffect(() => {
    if (user) {
      if (isNewCampaign) {
        createNewCampaign()
      } else {
        fetchCampaign()
      }
    }
  }, [user, id])

  const createNewCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([
          {
            user_id: user?.id,
            name: `Campaign ${new Date().toLocaleDateString()}`,
            status: 'draft'
          }
        ])
        .select()
        .single()

      if (error) throw error

      setCampaign(data)
      navigate(`/campaign/${data.id}`, { replace: true })
    } catch (error: any) {
      toast({
        title: "Error creating campaign",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single()

      if (error) throw error

      setCampaign(data)
    } catch (error: any) {
      toast({
        title: "Error loading campaign",
        description: error.message,
        variant: "destructive",
      })
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

  const renderCurrentStep = () => {
    if (!campaign) return null

    switch (currentStep) {
      case 1:
        return (
          <EmailTemplateStep
            campaignId={campaign.id}
            onNext={nextStep}
            onDataChange={(data) => setCampaignData(prev => ({ ...prev, template: data }))}
          />
        )
      case 2:
        return (
          <CSVUploadStep
            campaignId={campaign.id}
            onNext={nextStep}
            onPrev={prevStep}
            onDataChange={(data) => setCampaignData(prev => ({ ...prev, ...data }))}
          />
        )
      case 3:
        return (
          <SMTPConfigStep
            campaignId={campaign.id}
            onNext={nextStep}
            onPrev={prevStep}
            onDataChange={(data) => setCampaignData(prev => ({ ...prev, smtpConfig: data }))}
          />
        )
      case 4:
        return (
          <PreviewStep
            campaignId={campaign.id}
            campaignData={campaignData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 5:
        return (
          <SendEmailsStep
            campaignId={campaign.id}
            campaignData={campaignData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        )
      case 6:
        return (
          <LogsStep
            campaignId={campaign.id}
            onPrev={prevStep}
          />
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaign...</p>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Campaign not found</h2>
          <p className="text-gray-600 mb-4">The campaign you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-sm text-gray-600">
                Step {currentStep} of {steps.length}: {steps[currentStep - 1].name}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">
            {campaign.status}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b px-6 py-4">
        <div className="mb-4">
          <Progress value={(currentStep / steps.length) * 100} className="h-2" />
        </div>
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => goToStep(step.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                currentStep === step.id
                  ? 'bg-blue-100 text-blue-700'
                  : currentStep > step.id
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                currentStep === step.id
                  ? 'bg-blue-600 text-white'
                  : currentStep > step.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > step.id ? <Check className="w-3 h-3" /> : step.id}
              </div>
              <div className="hidden sm:block">
                <div className="font-medium text-sm">{step.name}</div>
                <div className="text-xs opacity-75">{step.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderCurrentStep()}
        </motion.div>
      </div>
    </div>
  )
}

export default CampaignBuilder

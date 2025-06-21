
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle } from 'lucide-react'

interface PreviewStepProps {
  campaignId: string
  campaignData: any
  onNext: () => void
  onPrev: () => void
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  campaignId,
  campaignData,
  onNext,
  onPrev
}) => {
  const [previewData, setPreviewData] = useState<any>(null)
  const [unmappedPlaceholders, setUnmappedPlaceholders] = useState<string[]>([])

  useEffect(() => {
    generatePreview()
  }, [campaignData])

  const generatePreview = () => {
    if (!campaignData.template || !campaignData.csvData || !campaignData.placeholderMappings) {
      return
    }

    // Get a random row from CSV data
    const randomRow = campaignData.csvData[Math.floor(Math.random() * campaignData.csvData.length)]
    
    // Check for unmapped placeholders
    const placeholders = campaignData.template.placeholders || []
    const unmapped = placeholders.filter((p: string) => !campaignData.placeholderMappings[p])
    setUnmappedPlaceholders(unmapped)

    // Replace placeholders in subject and body
    let previewSubject = campaignData.template.subject
    let previewBody = campaignData.template.body

    placeholders.forEach((placeholder: string) => {
      const mappedHeader = campaignData.placeholderMappings[placeholder]
      if (mappedHeader && randomRow[mappedHeader]) {
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        previewSubject = previewSubject.replace(regex, randomRow[mappedHeader])
        previewBody = previewBody.replace(regex, randomRow[mappedHeader])
      }
    })

    setPreviewData({
      subject: previewSubject,
      body: previewBody,
      sampleRow: randomRow
    })
  }

  const canProceed = unmappedPlaceholders.length === 0 && campaignData.smtpConfig

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Eye className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Preview Your Campaign</h2>
        <p className="text-gray-600">Review how your emails will look before sending</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
              <CardDescription>Sample email with real data from your CSV</CardDescription>
            </CardHeader>
            <CardContent>
              {previewData ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Subject:</div>
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      {previewData.subject}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Body:</div>
                    <div className="p-4 bg-white border rounded-lg min-h-[200px] whitespace-pre-wrap">
                      {previewData.body}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Preview will appear when all data is ready</p>
                </div>
              )}
            </CardContent>
          </Card>

          {previewData && (
            <Card>
              <CardHeader>
                <CardTitle>Sample Data Used</CardTitle>
                <CardDescription>The CSV row used for this preview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(previewData.sampleRow).map(([key, value], index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">{key}:</span>
                      <span className="text-sm text-gray-900">{value as string}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
              <CardDescription>Overview of your campaign setup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Template:</span>
                <Badge variant={campaignData.template ? "default" : "secondary"}>
                  {campaignData.template ? "Ready" : "Missing"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">CSV Data:</span>
                <Badge variant={campaignData.csvData ? "default" : "secondary"}>
                  {campaignData.csvData ? `${campaignData.csvData.length} contacts` : "Missing"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">SMTP Config:</span>
                <Badge variant={campaignData.smtpConfig ? "default" : "secondary"}>
                  {campaignData.smtpConfig ? "Configured" : "Missing"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Placeholders:</span>
                <Badge variant={unmappedPlaceholders.length === 0 ? "default" : "destructive"}>
                  {unmappedPlaceholders.length === 0 ? "All mapped" : `${unmappedPlaceholders.length} unmapped`}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {unmappedPlaceholders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-amber-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Issues Found
                </CardTitle>
                <CardDescription>These issues need to be resolved before proceeding</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800">Unmapped placeholders:</p>
                  <div className="flex flex-wrap gap-2">
                    {unmappedPlaceholders.map((placeholder, index) => (
                      <Badge key={index} variant="destructive">
                        {placeholder}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    Go back to the CSV upload step to map these placeholders to CSV columns.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {canProceed && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Ready to Send
                </CardTitle>
                <CardDescription>Your campaign is ready to launch</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-700">
                  All placeholders are mapped and your SMTP configuration is ready. 
                  You can proceed to launch your campaign.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
        >
          Proceed to Send
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

export default PreviewStep

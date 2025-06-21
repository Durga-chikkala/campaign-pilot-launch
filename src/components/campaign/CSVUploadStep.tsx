
import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, FileText, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Papa from 'papaparse'

interface CSVUploadStepProps {
  campaignId: string
  onNext: () => void
  onPrev: () => void
  onDataChange: (data: any) => void
}

const CSVUploadStep: React.FC<CSVUploadStepProps> = ({
  campaignId,
  onNext,
  onPrev,
  onDataChange
}) => {
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [placeholders, setPlaceholders] = useState<string[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState('')
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    loadExistingData()
  }, [campaignId])

  const loadExistingData = async () => {
    try {
      // Load template placeholders
      const { data: template } = await supabase
        .from('email_templates')
        .select('placeholders')
        .eq('campaign_id', campaignId)
        .eq('user_id', user?.id)
        .single()

      if (template?.placeholders) {
        setPlaceholders(template.placeholders)
      }

      // Load existing mappings
      const { data: existingMappings } = await supabase
        .from('placeholder_mappings')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', user?.id)

      if (existingMappings) {
        const mappingsObj = existingMappings.reduce((acc, mapping) => {
          acc[mapping.placeholder] = mapping.csv_header
          return acc
        }, {} as Record<string, string>)
        setMappings(mappingsObj)
      }

      // Load existing CSV data if available
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('csv_url')
        .eq('id', campaignId)
        .single()

      if (campaign?.csv_url) {
        // Load CSV data from storage
        const { data: csvFile } = await supabase.storage
          .from('campaigns')
          .download(campaign.csv_url)

        if (csvFile) {
          const text = await csvFile.text()
          Papa.parse(text, {
            header: true,
            complete: (results) => {
              setCsvData(results.data)
              setCsvHeaders(results.meta.fields || [])
              setFileName(campaign.csv_url.split('/').pop() || 'uploaded.csv')
            }
          })
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      })
      return
    }

    setFileName(file.name)
    setLoading(true)

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: "CSV parsing error",
            description: "There was an error parsing your CSV file.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }

        setCsvData(results.data)
        setCsvHeaders(results.meta.fields || [])
        setLoading(false)

        toast({
          title: "CSV uploaded successfully!",
          description: `Loaded ${results.data.length} rows with ${results.meta.fields?.length || 0} columns.`,
        })
      },
      error: (error) => {
        toast({
          title: "Error parsing CSV",
          description: error.message,
          variant: "destructive",
        })
        setLoading(false)
      }
    })
  }

  const handleMappingChange = (placeholder: string, header: string) => {
    setMappings(prev => ({
      ...prev,
      [placeholder]: header
    }))
  }

  const saveMappings = async () => {
    if (!csvData.length) {
      toast({
        title: "No CSV data",
        description: "Please upload a CSV file first.",
        variant: "destructive",
      })
      return
    }

    // Check if all placeholders are mapped
    const unmappedPlaceholders = placeholders.filter(p => !mappings[p])
    if (unmappedPlaceholders.length > 0) {
      toast({
        title: "Incomplete mapping",
        description: `Please map all placeholders: ${unmappedPlaceholders.join(', ')}`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Upload CSV to Supabase Storage
      const csvBlob = new Blob([Papa.unparse(csvData)], { type: 'text/csv' })
      const csvFileName = `campaign-${campaignId}-${Date.now()}.csv`
      
      const { error: uploadError } = await supabase.storage
        .from('campaigns')
        .upload(csvFileName, csvBlob)

      if (uploadError) throw uploadError

      // Update campaign with CSV URL
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({ 
          csv_url: csvFileName,
          total_emails: csvData.length
        })
        .eq('id', campaignId)

      if (campaignError) throw campaignError

      // Delete existing mappings
      await supabase
        .from('placeholder_mappings')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('user_id', user?.id)

      // Insert new mappings
      const mappingData = Object.entries(mappings).map(([placeholder, csvHeader]) => ({
        campaign_id: campaignId,
        user_id: user?.id,
        placeholder,
        csv_header: csvHeader
      }))

      const { error: mappingError } = await supabase
        .from('placeholder_mappings')
        .insert(mappingData)

      if (mappingError) throw mappingError

      onDataChange({
        csvData,
        csvHeaders,
        placeholderMappings: mappings
      })

      toast({
        title: "Mappings saved!",
        description: "Your CSV data and placeholder mappings have been saved.",
      })

      onNext()
    } catch (error: any) {
      toast({
        title: "Error saving mappings",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload CSV & Map Headers</h2>
        <p className="text-gray-600">Upload your contact list and map template placeholders to CSV columns</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>Drag and drop your CSV file or click to browse</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  {fileName ? fileName : 'Drop your CSV file here'}
                </p>
                <p className="text-sm text-gray-600">
                  or{' '}
                  <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                    browse files
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                </p>
              </div>
            </div>

            {csvData.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      CSV loaded successfully!
                    </p>
                    <p className="text-xs text-green-600">
                      {csvData.length} rows, {csvHeaders.length} columns
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Placeholder Mapping</CardTitle>
            <CardDescription>Map template placeholders to CSV columns</CardDescription>
          </CardHeader>
          <CardContent>
            {placeholders.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No placeholders found in your template.</p>
                <p className="text-sm text-gray-500 mt-1">Go back and add placeholders like {{name}} to your template.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {placeholders.map((placeholder) => (
                  <div key={placeholder} className="space-y-2">
                    <Label>
                      <Badge variant="secondary" className="mr-2">
                        {placeholder}
                      </Badge>
                      Map to CSV column:
                    </Label>
                    <Select
                      value={mappings[placeholder] || ''}
                      onValueChange={(value) => handleMappingChange(placeholder, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select CSV column" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {csvData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>CSV Preview</CardTitle>
            <CardDescription>First 5 rows of your uploaded data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {csvHeaders.map((header) => (
                      <TableHead key={header}>
                        {header}
                        {Object.values(mappings).includes(header) && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Mapped
                          </Badge>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      {csvHeaders.map((header) => (
                        <TableCell key={header} className="max-w-xs truncate">
                          {row[header]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={saveMappings}
          disabled={loading || !csvData.length || placeholders.some(p => !mappings[p])}
          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
        >
          {loading ? "Saving..." : "Save Mappings"}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

export default CSVUploadStep

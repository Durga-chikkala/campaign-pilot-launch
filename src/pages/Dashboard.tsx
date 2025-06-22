
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Mail, Calendar, BarChart, TrendingUp, Edit2, Trash2, Check, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'completed' | 'paused'
  created_at: string
  total_emails?: number
  sent_emails?: number
  failed_emails?: number
}

const Dashboard = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalEmailsSent: 0,
    successRate: 0
  })
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchCampaigns()
    }
  }, [user])

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCampaigns(data || [])
      
      // Calculate stats
      const totalCampaigns = data?.length || 0
      const activeCampaigns = data?.filter(c => c.status === 'active').length || 0
      const totalEmailsSent = data?.reduce((sum, c) => sum + (c.sent_emails || 0), 0) || 0
      const totalEmails = data?.reduce((sum, c) => sum + (c.total_emails || 0), 0) || 0
      const successRate = totalEmails > 0 ? Math.round((totalEmailsSent / totalEmails) * 100) : 0

      setStats({
        totalCampaigns,
        activeCampaigns,
        totalEmailsSent,
        successRate
      })
    } catch (error: any) {
      toast({
        title: "Error loading campaigns",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (campaign: Campaign) => {
    setEditingCampaign(campaign.id)
    setEditingName(campaign.name)
  }

  const cancelEditing = () => {
    setEditingCampaign(null)
    setEditingName('')
  }

  const saveCampaignName = async (campaignId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "Error",
        description: "Campaign name cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ name: editingName.trim() })
        .eq('id', campaignId)
        .eq('user_id', user?.id)

      if (error) throw error

      setCampaigns(prev => prev.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, name: editingName.trim() }
          : campaign
      ))

      setEditingCampaign(null)
      setEditingName('')

      toast({
        title: "Success",
        description: "Campaign name updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error updating campaign",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const deleteCampaign = async (campaignId: string) => {
    try {
      // Delete related data first
      await supabase.from('recipients').delete().eq('campaign_id', campaignId)
      await supabase.from('smtp_configs').delete().eq('campaign_id', campaignId)
      await supabase.from('placeholder_mappings').delete().eq('campaign_id', campaignId)
      await supabase.from('templates').delete().eq('campaign_id', campaignId)
      
      // Finally delete the campaign
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', user?.id)

      if (error) throw error

      setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId))

      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      })

      // Refresh stats
      fetchCampaigns()
    } catch (error: any) {
      toast({
        title: "Error deleting campaign",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your email campaigns</p>
        </div>
        <Button 
          onClick={() => navigate('/campaign/new')}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Total Campaigns</CardTitle>
              <Mail className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{stats.totalCampaigns}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Active Campaigns</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{stats.activeCampaigns}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Emails Sent</CardTitle>
              <BarChart className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">{stats.totalEmailsSent.toLocaleString()}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{stats.successRate}%</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Campaigns List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Your Campaigns</h2>
        </div>

        {campaigns.length === 0 ? (
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-600 mb-4">Create your first email campaign to get started</p>
            <Button onClick={() => navigate('/campaign/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign, index) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      {editingCampaign === campaign.id ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="text-lg font-medium"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveCampaignName(campaign.id)
                              } else if (e.key === 'Escape') {
                                cancelEditing()
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveCampaignName(campaign.id)}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <CardTitle 
                            className="text-lg cursor-pointer hover:text-blue-600"
                            onClick={() => navigate(`/campaign/${campaign.id}`)}
                          >
                            {campaign.name}
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditing(campaign)
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{campaign.name}"? This action cannot be undone and will also delete all associated templates, recipients, and configurations.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCampaign(campaign.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>
                    {editingCampaign !== campaign.id && (
                      <CardDescription className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-1" />
                        Created {formatDate(campaign.created_at)}
                      </CardDescription>
                    )}
                  </CardHeader>
                  {editingCampaign !== campaign.id && (
                    <CardContent 
                      className="cursor-pointer"
                      onClick={() => navigate(`/campaign/${campaign.id}`)}
                    >
                      <div className="space-y-2">
                        {campaign.total_emails && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total emails:</span>
                            <span className="font-medium">{campaign.total_emails.toLocaleString()}</span>
                          </div>
                        )}
                        {campaign.sent_emails && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Sent:</span>
                            <span className="font-medium text-green-600">{campaign.sent_emails.toLocaleString()}</span>
                          </div>
                        )}
                        {campaign.failed_emails && campaign.failed_emails > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Failed:</span>
                            <span className="font-medium text-red-600">{campaign.failed_emails.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

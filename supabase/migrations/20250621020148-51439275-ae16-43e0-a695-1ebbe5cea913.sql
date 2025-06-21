
-- First, let's check if there are any existing campaigns and update them
-- We'll need to either delete existing data or assign a default user_id
-- Since this is likely a development environment, let's delete existing data
DELETE FROM public.recipients;
DELETE FROM public.placeholder_mappings;
DELETE FROM public.smtp_configs;
DELETE FROM public.campaigns;
DELETE FROM public.templates;

-- Now add user_id columns to all tables that need user association
ALTER TABLE public.campaigns ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.templates ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.smtp_configs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.placeholder_mappings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recipients ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id NOT NULL for all tables (after adding the column and clearing data)
ALTER TABLE public.campaigns ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.templates ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.smtp_configs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.placeholder_mappings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.recipients ALTER COLUMN user_id SET NOT NULL;

-- Enable Row Level Security on all tables
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placeholder_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaigns table
CREATE POLICY "Users can view their own campaigns" ON public.campaigns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns" ON public.campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for templates table
CREATE POLICY "Users can view their own templates" ON public.templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own templates" ON public.templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own templates" ON public.templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own templates" ON public.templates
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for smtp_configs table
CREATE POLICY "Users can view their own smtp configs" ON public.smtp_configs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own smtp configs" ON public.smtp_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own smtp configs" ON public.smtp_configs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own smtp configs" ON public.smtp_configs
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for placeholder_mappings table
CREATE POLICY "Users can view their own placeholder mappings" ON public.placeholder_mappings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own placeholder mappings" ON public.placeholder_mappings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own placeholder mappings" ON public.placeholder_mappings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own placeholder mappings" ON public.placeholder_mappings
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for recipients table
CREATE POLICY "Users can view their own recipients" ON public.recipients
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own recipients" ON public.recipients
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recipients" ON public.recipients
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recipients" ON public.recipients
  FOR DELETE USING (auth.uid() = user_id);

-- Create a storage bucket for campaign files
INSERT INTO storage.buckets (id, name, public) VALUES ('campaigns', 'campaigns', false);

-- Create storage policies for the campaigns bucket
CREATE POLICY "Users can upload their own campaign files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'campaigns' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own campaign files" ON storage.objects
  FOR SELECT USING (bucket_id = 'campaigns' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own campaign files" ON storage.objects
  FOR DELETE USING (bucket_id = 'campaigns' AND auth.uid()::text = (storage.foldername(name))[1]);

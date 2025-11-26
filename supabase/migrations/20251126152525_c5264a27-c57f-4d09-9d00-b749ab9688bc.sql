-- Create balance_history table to track Meta and Google Ads balance updates
CREATE TABLE IF NOT EXISTS public.balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  balance_type TEXT NOT NULL CHECK (balance_type IN ('meta', 'google')),
  balance_amount NUMERIC NOT NULL,
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_balance_history_account_date 
  ON public.balance_history(account_id, balance_type, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.balance_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view balance history"
  ON public.balance_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert balance history"
  ON public.balance_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_balance_history_updated_at
  BEFORE UPDATE ON public.balance_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to accounts table to track last balance check dates
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS last_balance_check_meta TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_balance_check_google TIMESTAMP WITH TIME ZONE;
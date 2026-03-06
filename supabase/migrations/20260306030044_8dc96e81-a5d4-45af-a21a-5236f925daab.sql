
CREATE TABLE public.result_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lottery TEXT NOT NULL,
  concurso INTEGER NOT NULL,
  data_concurso TEXT,
  draw_numbers INTEGER[] NOT NULL DEFAULT '{}',
  bet_numbers INTEGER[] NOT NULL DEFAULT '{}',
  hits INTEGER NOT NULL DEFAULT 0,
  matched_numbers INTEGER[] NOT NULL DEFAULT '{}',
  prize_tier TEXT,
  prize_value NUMERIC DEFAULT 0,
  total_winners INTEGER DEFAULT 0,
  premiacao JSONB DEFAULT '[]'::jsonb,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lottery, concurso)
);

ALTER TABLE public.result_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own result_checks"
  ON public.result_checks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

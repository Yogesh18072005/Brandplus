-- Keep the buyer question beside each saved answer-page draft so the combined
-- audit PDF can explain why every generated page was recommended.
alter table public.generated_content
  add column if not exists buyer_question text;

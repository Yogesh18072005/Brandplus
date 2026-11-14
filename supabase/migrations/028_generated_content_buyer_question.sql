-- Keep buyer-question and batch metadata beside each saved page draft.
-- The batch ID lets the combined report PDF include only the latest generation.
alter table public.generated_content
  add column if not exists buyer_question text,
  add column if not exists generation_batch_id uuid;

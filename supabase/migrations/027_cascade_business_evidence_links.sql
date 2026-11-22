-- Allow business deletion when its evidence has dependent intervention links.
-- The links are owned by the evidence record and should not outlive it.
do $$
declare
  v_definition text;
  v_new_definition text;
begin
  select pg_get_constraintdef(c.oid)
    into v_definition
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'intervention_evidence_links'
    and c.conname = 'intervention_evidence_links_business_evidence_id_project_i_fkey'
    and c.contype = 'f';

  if v_definition is null then
    raise exception 'Expected foreign key constraint was not found: intervention_evidence_links_business_evidence_id_project_i_fkey';
  end if;

  if v_definition ~* 'ON DELETE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)' then
    v_new_definition := regexp_replace(
      v_definition,
      'ON DELETE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
      'ON DELETE CASCADE',
      'i'
    );
  elsif v_definition ~* ' DEFERRABLE' then
    v_new_definition := regexp_replace(
      v_definition,
      ' DEFERRABLE',
      ' ON DELETE CASCADE DEFERRABLE',
      'i'
    );
  else
    v_new_definition := v_definition || ' ON DELETE CASCADE';
  end if;

  execute 'alter table public.intervention_evidence_links drop constraint ' ||
    quote_ident('intervention_evidence_links_business_evidence_id_project_i_fkey');

  execute 'alter table public.intervention_evidence_links add constraint ' ||
    quote_ident('intervention_evidence_links_business_evidence_id_project_i_fkey') ||
    ' ' || v_new_definition;
end
$$;

 
-- Allow business deletion when buyer questions have dependent intervention links.
-- These links are owned by the buyer-question record and should not outlive it.
do $$
declare
  v_definition text;
  v_new_definition text;
begin
  select pg_get_constraintdef(c.oid)
    into v_definition
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'intervention_question_links'
    and c.conname = 'intervention_question_links_buyer_question_id_project_id_fkey'
    and c.contype = 'f';

  if v_definition is null then
    raise exception 'Expected foreign key constraint was not found: intervention_question_links_buyer_question_id_project_id_fkey';
  end if;

  if v_definition ~* 'ON DELETE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)' then
    v_new_definition := regexp_replace(
      v_definition,
      'ON DELETE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
      'ON DELETE CASCADE',
      'i'
    );
  elsif v_definition ~* ' DEFERRABLE' then
    v_new_definition := regexp_replace(
      v_definition,
      ' DEFERRABLE',
      ' ON DELETE CASCADE DEFERRABLE',
      'i'
    );
  else
    v_new_definition := v_definition || ' ON DELETE CASCADE';
  end if;

  execute 'alter table public.intervention_question_links drop constraint ' ||
    quote_ident('intervention_question_links_buyer_question_id_project_id_fkey');

  execute 'alter table public.intervention_question_links add constraint ' ||
    quote_ident('intervention_question_links_buyer_question_id_project_id_fkey') ||
    ' ' || v_new_definition;
end
$$;

 
-- Allow diagnosis records to be deleted when their dependent intervention links are deleted.
-- These links are owned by the diagnosis record and should not outlive it.
do $$
declare
  v_definition text;
  v_new_definition text;
begin
  select pg_get_constraintdef(c.oid)
    into v_definition
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'intervention_diagnosis_links'
    and c.conname = 'intervention_diagnosis_links_question_diagnosis_id_project_fkey'
    and c.contype = 'f';

  if v_definition is null then
    raise exception 'Expected foreign key constraint was not found: intervention_diagnosis_links_question_diagnosis_id_project_fkey';
  end if;

  if v_definition ~* 'ON DELETE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)' then
    v_new_definition := regexp_replace(
      v_definition,
      'ON DELETE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
      'ON DELETE CASCADE',
      'i'
    );
  elsif v_definition ~* ' DEFERRABLE' then
    v_new_definition := regexp_replace(
      v_definition,
      ' DEFERRABLE',
      ' ON DELETE CASCADE DEFERRABLE',
      'i'
    );
  else
    v_new_definition := v_definition || ' ON DELETE CASCADE';
  end if;

  execute 'alter table public.intervention_diagnosis_links drop constraint ' ||
    quote_ident('intervention_diagnosis_links_question_diagnosis_id_project_fkey');

  execute 'alter table public.intervention_diagnosis_links add constraint ' ||
    quote_ident('intervention_diagnosis_links_question_diagnosis_id_project_fkey') ||
    ' ' || v_new_definition;
end
$$;

-- Preserve deployed data while adopting the BrandPulse product name.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tracking_snapshots'
      and column_name = 'zerociate_score'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tracking_snapshots'
      and column_name = 'brandpulse_score'
  ) then
    alter table public.tracking_snapshots
      rename column zerociate_score to brandpulse_score;
  end if;
end
$$;

update public.audits
set report_data = jsonb_set(
  report_data #- '{scores,zerociateScore}',
  '{scores,brandpulseScore}',
  report_data #> '{scores,zerociateScore}',
  true
)
where report_data #> '{scores,zerociateScore}' is not null
  and report_data #> '{scores,brandpulseScore}' is null;

-- Preserve deployed data while adopting the Zerociate product name.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tracking_snapshots'
      and column_name = 'trace_score'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tracking_snapshots'
      and column_name = 'zerociate_score'
  ) then
    alter table public.tracking_snapshots
      rename column trace_score to zerociate_score;
  end if;
end
$$;

update public.audits
set report_data = jsonb_set(
  report_data #- '{scores,traceScore}',
  '{scores,zerociateScore}',
  report_data #> '{scores,traceScore}',
  true
)
where report_data #> '{scores,traceScore}' is not null
  and report_data #> '{scores,zerociateScore}' is null;
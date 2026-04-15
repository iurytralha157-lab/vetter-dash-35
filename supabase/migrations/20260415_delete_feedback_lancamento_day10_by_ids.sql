create or replace function public.delete_feedback_campanha_day10_lancamento()
returns table(id bigint, campanha_nome text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  delete from public.feedback_campanha
  where id in (11, 12)
  returning feedback_campanha.id, feedback_campanha.campanha_nome;
end;
$$;

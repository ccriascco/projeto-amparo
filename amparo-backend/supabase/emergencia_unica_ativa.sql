-- Projeto Amparo - garante no banco que cada usuária tem no máximo 1 emergência ATIVA (RN06).
-- A checagem no código sozinha tem corrida entre instâncias; este índice fecha a brecha.
--
-- 1) Rode primeiro esta consulta. Se retornar alguma linha, há emergências ATIVAS
--    duplicadas que precisam ser encerradas antes do passo 2:
--
--    SELECT usuaria_id, count(*) FROM public.emergencias
--    WHERE status = 'ATIVA' GROUP BY usuaria_id HAVING count(*) > 1;
--
-- 2) Depois crie o índice:

CREATE UNIQUE INDEX IF NOT EXISTS emergencias_uma_ativa_por_usuaria
  ON public.emergencias (usuaria_id)
  WHERE status = 'ATIVA';

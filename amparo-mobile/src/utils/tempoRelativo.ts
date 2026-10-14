/** "agora", "há 5 minutos", "há 2 horas", "há 1 dia", "há 3 semanas", "há 2 meses" */
export function haQuantoTempo(iso: string, agora = new Date()): string {
  const s = Math.max(0, (agora.getTime() - new Date(iso).getTime()) / 1000);
  const plural = (n: number, um: string, varios: string) => `há ${n} ${n === 1 ? um : varios}`;
  if (s < 60) return 'agora';
  if (s < 3600) return plural(Math.floor(s / 60), 'minuto', 'minutos');
  if (s < 86_400) return plural(Math.floor(s / 3600), 'hora', 'horas');
  if (s < 7 * 86_400) return plural(Math.floor(s / 86_400), 'dia', 'dias');
  if (s < 30 * 86_400) return plural(Math.floor(s / (7 * 86_400)), 'semana', 'semanas');
  return plural(Math.floor(s / (30 * 86_400)), 'mês', 'meses');
}

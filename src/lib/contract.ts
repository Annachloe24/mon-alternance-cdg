import { diffDays, isValidIsoDate } from './dates';
import type { IsoDate, Settings } from './types';

export type ContractStatus = 'a-venir' | 'en-cours' | 'termine' | 'invalide';

export interface ContractProgress {
  status: ContractStatus;
  /** Durée totale en jours calendaires (début et fin inclus). */
  totalDays: number;
  /** Jours écoulés, aujourd'hui inclus, bornés à la durée du contrat. */
  elapsedDays: number;
  remainingDays: number;
  /** De 0 à 100. */
  percent: number;
}

export function contractProgress(settings: Pick<Settings, 'contractStart' | 'contractEnd'>, today: IsoDate): ContractProgress {
  const { contractStart: start, contractEnd: end } = settings;
  if (!isValidIsoDate(start) || !isValidIsoDate(end) || end < start) {
    return { status: 'invalide', totalDays: 0, elapsedDays: 0, remainingDays: 0, percent: 0 };
  }
  const totalDays = diffDays(start, end) + 1;
  const raw = diffDays(start, today) + 1;
  const elapsedDays = Math.min(totalDays, Math.max(0, raw));
  const status: ContractStatus = today < start ? 'a-venir' : today > end ? 'termine' : 'en-cours';
  return {
    status,
    totalDays,
    elapsedDays,
    remainingDays: totalDays - elapsedDays,
    percent: Math.round((elapsedDays / totalDays) * 1000) / 10,
  };
}

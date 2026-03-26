/** May 1, 2026 00:00 Pacific/Tahiti → May 1, 2026 10:00:00 UTC */
export const LAUNCH_PUPU_PROMO_END_MS = Date.UTC(2026, 4, 1, 10, 0, 0);

export function isPupuLaunchPromoActive(creditedAt: Date): boolean {
  return creditedAt.getTime() < LAUNCH_PUPU_PROMO_END_MS;
}

export function baseInscriptionPupuForPack(pack: 'teOhi' | 'umete'): number {
  return pack === 'teOhi' ? 10 : 20;
}

/** Te Ohi: 10 (×2 promo). Umete: 20 = 10 Te Ohi + 10 bonus (×2 promo). */
export function inscriptionPupuAmount(pack: 'teOhi' | 'umete', creditedAt: Date = new Date()): number {
  let n = baseInscriptionPupuForPack(pack);
  if (isPupuLaunchPromoActive(creditedAt)) {
    n *= 2;
  }
  return n;
}

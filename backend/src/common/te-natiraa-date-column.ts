import { ValueTransformer } from 'typeorm';

/**
 * TypeORM envoie par défaut les colonnes `date` avec getFullYear/getDate **locaux**,
 * ce qui décale le jour en base selon la TZ du serveur. On force le calendrier UTC
 * (cohérent avec teNatiraaYmdToUtcDate).
 */
export const teNatiraaDateColumnTransformer: ValueTransformer = {
  to(value: Date | string | null): string | null {
    if (value == null) return value;
    if (typeof value === 'string') {
      const part = value.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
    }
    if (value instanceof Date) {
      const y = value.getUTCFullYear();
      const m = String(value.getUTCMonth() + 1).padStart(2, '0');
      const d = String(value.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return value as unknown as string;
  },
  from(value: string | Date | null): Date | null {
    if (value == null) return value;
    if (typeof value === 'string') {
      const part = value.split('T')[0];
      const [y, mo, da] = part.split('-').map(Number);
      return new Date(Date.UTC(y, mo - 1, da));
    }
    if (value instanceof Date) {
      return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    }
    return value;
  },
};

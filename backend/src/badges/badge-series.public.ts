/**
 * Registre des séries pour l’affichage public : codes du plus faible au plus fort (dernier = meilleur palier).
 * seriesPriority : plus élevé = plus « prestigieux » en cas d’égalité de rang dans la série.
 */
import {
  ACADEMY_COURSE_BADGES,
  ACADEMY_FORMATEUR_POINTS_BADGES,
  BLOG_ARTICLE_BADGES,
  CULTURE_CONSULTATION_BADGES,
  REFERRAL_VALIDATED_BADGES,
  SOUTIEN_POINTS_BADGES,
  TE_NATIRAA_PRESENCE_BADGES,
  TESTIMONIAL_VIDEO_VALIDATED_BADGES,
  TROC_EXCHANGE_BADGES,
  DISCOVERY_BADGE_FIRST_STEP,
  DISCOVERY_BADGE_THREE_UNIVERSES,
  DISCOVERY_BADGE_FIVE_TYPES,
  DISCOVERY_BADGE_TWO_EACH,
  SPECIAL_BADGE_FOUNDER_2026,
  SPECIAL_BADGE_TROC_PIONEER_MAY_2026,
  SPECIAL_BADGE_PUPU_COLLECTOR_500,
  SPECIAL_BADGE_VIP_HERITAGE,
  SPECIAL_BADGE_COUNT_10,
  SPECIAL_BADGE_COUNT_20,
  SPECIAL_BADGE_TOA_COMMUNITY,
  SPECIAL_BADGE_RESPECT_ANCIENS,
} from './badges.constants';

export type PublicBadgeSeriesDef = {
  id: string;
  codes: readonly string[];
  seriesPriority: number;
};

const codes = <T extends readonly { code: string }[]>(arr: T) => arr.map((x) => x.code);

export const PUBLIC_BADGE_SERIES: PublicBadgeSeriesDef[] = [
  { id: 'academy_courses', codes: codes(ACADEMY_COURSE_BADGES), seriesPriority: 42 },
  { id: 'blog_articles', codes: codes(BLOG_ARTICLE_BADGES), seriesPriority: 41 },
  { id: 'academy_formateur', codes: codes(ACADEMY_FORMATEUR_POINTS_BADGES), seriesPriority: 44 },
  { id: 'troc', codes: codes(TROC_EXCHANGE_BADGES), seriesPriority: 48 },
  { id: 'referral', codes: codes(REFERRAL_VALIDATED_BADGES), seriesPriority: 47 },
  { id: 'soutien', codes: codes(SOUTIEN_POINTS_BADGES), seriesPriority: 46 },
  {
    id: 'tenatiraa',
    codes: [
      ...codes(TE_NATIRAA_PRESENCE_BADGES),
      'tenatiraa_presence_10',
      'tenatiraa_presence_20',
    ],
    seriesPriority: 49,
  },
  { id: 'culture', codes: codes(CULTURE_CONSULTATION_BADGES), seriesPriority: 40 },
  { id: 'testimonial', codes: codes(TESTIMONIAL_VIDEO_VALIDATED_BADGES), seriesPriority: 43 },
  {
    id: 'discovery',
    codes: [
      DISCOVERY_BADGE_FIRST_STEP,
      DISCOVERY_BADGE_THREE_UNIVERSES,
      DISCOVERY_BADGE_FIVE_TYPES,
      DISCOVERY_BADGE_TWO_EACH,
    ],
    seriesPriority: 45,
  },
  { id: 'special_founder', codes: [SPECIAL_BADGE_FOUNDER_2026], seriesPriority: 92 },
  { id: 'special_troc_pioneer', codes: [SPECIAL_BADGE_TROC_PIONEER_MAY_2026], seriesPriority: 88 },
  { id: 'special_pupu', codes: [SPECIAL_BADGE_PUPU_COLLECTOR_500], seriesPriority: 82 },
  { id: 'special_vip', codes: [SPECIAL_BADGE_VIP_HERITAGE], seriesPriority: 90 },
  { id: 'special_badges_10', codes: [SPECIAL_BADGE_COUNT_10], seriesPriority: 55 },
  { id: 'special_badges_20', codes: [SPECIAL_BADGE_COUNT_20], seriesPriority: 58 },
  { id: 'special_toa', codes: [SPECIAL_BADGE_TOA_COMMUNITY], seriesPriority: 100 },
  { id: 'special_respect', codes: [SPECIAL_BADGE_RESPECT_ANCIENS], seriesPriority: 95 },
];

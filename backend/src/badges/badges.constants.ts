/** Academy — cours terminés (seuil de complétion côté appli) */
export const ACADEMY_COURSE_BADGES = [
  { threshold: 1, code: 'academy_courses_completed_1' },
  { threshold: 5, code: 'academy_courses_completed_5' },
  { threshold: 15, code: 'academy_courses_completed_15' },
  { threshold: 25, code: 'academy_courses_completed_25' },
] as const;

/** Blog collaboratif — articles au statut `active` (validés) */
export const BLOG_ARTICLE_BADGES = [
  { threshold: 1, code: 'blog_articles_validated_1' },
  { threshold: 3, code: 'blog_articles_validated_3' },
  { threshold: 10, code: 'blog_articles_validated_10' },
  { threshold: 25, code: 'blog_articles_validated_25' },
] as const;

/** Culture — contenus distincts consultés au moins une fois (modal / lecteur) */
export const CULTURE_CONSULTATION_BADGES = [
  { threshold: 1, code: 'culture_contents_viewed_1' },
  { threshold: 5, code: 'culture_contents_viewed_5' },
  { threshold: 20, code: 'culture_contents_viewed_20' },
  { threshold: 50, code: 'culture_contents_viewed_50' },
] as const;

/** Academy — création de formations : compteur formations publiées (admin) */
export const ACADEMY_FORMATEUR_POINTS_BADGES = [
  { threshold: 1, code: 'academy_formateur_points_1' },
  { threshold: 3, code: 'academy_formateur_points_3' },
  { threshold: 5, code: 'academy_formateur_points_5' },
  { threshold: 10, code: 'academy_formateur_points_10' },
] as const;

/** Soutien : compteur points (admin / modération) */
export const SOUTIEN_POINTS_BADGES = [
  { threshold: 1, code: 'soutien_points_1' },
  { threshold: 5, code: 'soutien_points_5' },
  { threshold: 10, code: 'soutien_points_10' },
  { threshold: 20, code: 'soutien_points_20' },
] as const;

/** Te Natira'a — points de présence (scan QR, un point par code distinct). Paliers resserrés (~1 événement/an). */
export const TE_NATIRAA_PRESENCE_BADGES = [
  { threshold: 1, code: 'tenatiraa_presence_1' },
  { threshold: 2, code: 'tenatiraa_presence_2' },
  { threshold: 3, code: 'tenatiraa_presence_3' },
  { threshold: 5, code: 'tenatiraa_presence_5' },
] as const;

/** Témoignages vidéo — validations admin (statut approuvé), toutes périodes confondues */
export const TESTIMONIAL_VIDEO_VALIDATED_BADGES = [
  { threshold: 1, code: 'testimonial_video_validated_1' },
  { threshold: 3, code: 'testimonial_video_validated_3' },
  { threshold: 5, code: 'testimonial_video_validated_5' },
  { threshold: 10, code: 'testimonial_video_validated_10' },
] as const;

/** Parrainage — filleuls au statut `validee` (récompense créditée) */
export const REFERRAL_VALIDATED_BADGES = [
  { threshold: 1, code: 'referral_filleuls_valides_1' },
  { threshold: 5, code: 'referral_filleuls_valides_5' },
  { threshold: 15, code: 'referral_filleuls_valides_15' },
  { threshold: 50, code: 'referral_filleuls_valides_50' },
] as const;

/** Nuna'a Troc — `exchange` marketplace complétées, ou transferts Pūpū (`debit` entre membres ; une ligne partagée expéditeur / destinataire) */
export const TROC_EXCHANGE_BADGES = [
  { threshold: 1, code: 'troc_exchanges_completed_1' },
  { threshold: 10, code: 'troc_exchanges_completed_10' },
  { threshold: 50, code: 'troc_exchanges_completed_50' },
  { threshold: 100, code: 'troc_exchanges_completed_100' },
] as const;

/** Série Découverte — 3 univers (types d’actions 0–3 chacun) ; paliers composites dans BadgesService */
export const DISCOVERY_BADGE_FIRST_STEP = 'discovery_first_step';
export const DISCOVERY_BADGE_THREE_UNIVERSES = 'discovery_three_universes_one_each';
export const DISCOVERY_BADGE_FIVE_TYPES = 'discovery_five_action_types';
export const DISCOVERY_BADGE_TWO_EACH = 'discovery_two_each_universe';

/** Badges spéciaux — critères indépendants */
export const SPECIAL_BADGE_FOUNDER_2026 = 'special_founder_2026';
export const SPECIAL_BADGE_TROC_PIONEER_MAY_2026 = 'special_troc_pioneer_may_2026';
export const SPECIAL_BADGE_PUPU_COLLECTOR_500 = 'special_pupu_collector_500';
export const SPECIAL_BADGE_VIP_HERITAGE = 'special_vip_heritage';
export const SPECIAL_BADGE_TOA_COMMUNITY = 'special_toa_community';
export const SPECIAL_BADGE_COUNT_10 = 'special_badges_total_10';
export const SPECIAL_BADGE_COUNT_20 = 'special_badges_total_20';
export const SPECIAL_BADGE_RESPECT_ANCIENS = 'special_respect_anciens';

/** Seuil Toa : strictement plus de ce nombre de badges (hors Toa) */
export const SPECIAL_TOA_MIN_OTHER_BADGES = 40;

export const SPECIAL_FOUNDER_REGISTER_BEFORE = '2026-04-11T00:00:00.000Z';
export const SPECIAL_TROC_PIONEER_COMPLETED_BEFORE = '2026-05-01T00:00:00.000Z';

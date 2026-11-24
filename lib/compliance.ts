/**
 * PegaLocal compliance guardrail (prompt section 4). The free-text "smart note"
 * is owner-written in Chinese or Spanish, so we screen it — and the store name —
 * for exclusionary hiring language by nationality, ethnicity, gender and
 * religion. Anything flagged blocks publish and the owner is pointed at a
 * neutral alternative. This is the hard red line: no hiring ad on the platform
 * may carry exclusionary language.
 *
 * Matching is on exclusionary PHRASES ("只招男", "solo chinos", "nacionalidad
 * española"), not on bare group words. Bare-word matching blocked legitimate
 * text: a contact person called "Cristian", "Todas las nacionalidades
 * bienvenidas", a halal restaurant named "回族拉面馆". Spanish matching uses
 * Unicode letter boundaries so "cristiano" inside a longer word can't trigger.
 *
 * Regression cases live in scripts/test-poster-parse.ts (runs in CI).
 */

export interface ComplianceResult {
  flagged: boolean;
  terms: string[];
}

// Exact phrases kept from the original list (all unambiguous).
const ZH_PHRASES = [
  "只招华人",
  "华人优先",
  "不要外地",
  "不招外地",
  "老乡优先",
  "本民族优先",
  "黑人不要",
];

const ZH_GROUPS =
  "华人|中国人|国人|外国人|老外|黑人|白人|摩洛哥人|拉丁人|南美人|阿拉伯人|吉普赛人|本地人|外地人|西班牙人|回族|维吾尔族?|汉族|穆斯林|基督徒|佛教徒|男性?|女性?|男生|女生|男士|女士|男的|女的|美女|帅哥";

const ZH_PATTERNS: RegExp[] = [
  // "只招男" / "限女" / "不要黑人" — but NOT "不限男女" (限 preceded by 不).
  new RegExp(`(?:只招|只要|仅招|仅限|(?<!不)限|不招|不要|拒绝|谢绝)\\s*(?:${ZH_GROUPS})`, "g"),
  // "华人优先" / "女生优先" / "穆斯林优先".
  new RegExp(`(?:${ZH_GROUPS})\\s*优先`, "g"),
];

const ES_GROUPS =
  "chin[oa]s?|español(?:a|es|as)?|extranjer[oa]s?|hombres?|mujer(?:es)?|chic[oa]s|blanc[oa]s?|negr[oa]s?|latin[oa]s?|marroqu[ií](?:es)?|mor[oa]s|gitan[oa]s?|musulman(?:a|es|as)?|cristian[oa]s?|cat[oó]lic[oa]s?|[aá]rabes?|sudamerican[oa]s?|inmigrantes?|varones?";

// \p{L} boundaries: JS \b is ASCII-only and breaks on accented letters.
const L = "(?<!\\p{L})";
const R = "(?!\\p{L})";

const ES_PATTERNS: RegExp[] = [
  // "solo chinos", "no extranjeros", "abstenerse mujeres".
  new RegExp(
    `${L}(?:solo|sólo|solamente|únicamente|unicamente|no|sin|nada\\s+de|abstenerse)\\s+(?:${ES_GROUPS})${R}`,
    "giu"
  ),
  // "imprescindible ser chino", "preferiblemente mujer", "se prefiere hombre".
  new RegExp(
    `${L}(?:imprescindible|requisito|necesario|obligatorio|preferible(?:mente)?|se\\s+prefiere|preferencia)\\s+(?:ser\\s+)?(?:de\\s+)?(?:${ES_GROUPS})${R}`,
    "giu"
  ),
  // "nacionalidad española", "de raza blanca", "etnia china", "religión católica".
  new RegExp(
    `${L}(?:nacionalidad|raza|etnia|religi[oó]n)\\s+(?:chin|español|europe|blanc|negr|latin|árab|arab|musulman|cristian|cat[oó]lic)\\p{L}*`,
    "giu"
  ),
];

export function detectDiscrimination(text: string): ComplianceResult {
  const src = text || "";
  const terms = new Set<string>();
  for (const p of ZH_PHRASES) {
    if (src.includes(p)) terms.add(p);
  }
  for (const re of [...ZH_PATTERNS, ...ES_PATTERNS]) {
    for (const m of src.matchAll(re)) terms.add(m[0].trim());
  }
  return { flagged: terms.size > 0, terms: [...terms] };
}

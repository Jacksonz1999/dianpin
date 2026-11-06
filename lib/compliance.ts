/**
 * PegaLocal compliance guardrail (prompt section 4). The free-text "smart note"
 * is owner-written in Chinese or Spanish, so we screen it — and the store name —
 * against a bilingual discriminatory-term library covering nationality, ethnicity,
 * gender and religion. Anything flagged blocks publish and the owner is pointed
 * at a neutral alternative. This is the hard red line: no hiring ad on the
 * platform may carry exclusionary language.
 */

export interface ComplianceResult {
  flagged: boolean;
  terms: string[];
  suggestionZh: string;
  suggestionEs: string;
}

const ZH_TERMS = [
  "只招华人",
  "华人优先",
  "不要外地",
  "不招外地",
  "只招男",
  "限男",
  "只招女",
  "限女",
  "不要女",
  "不招女",
  "回族",
  "维吾尔",
  "穆斯林优先",
  "基督徒优先",
  "白人优先",
  "黑人不要",
  "只招白人",
  "不要黑人",
  "老乡优先",
  "本民族",
];

// Spanish terms. Kept conservative; some (blanco/raza/etnia) only ever appear
// in a hiring context as exclusionary, which is exactly what we block.
const ES_TERMS = [
  "solo chinos",
  "solo hombres",
  "solo mujeres",
  "no mujeres",
  "sin mujeres",
  "solo españoles",
  "no extranjeros",
  "solo blancos",
  "solo blancas",
  "raza",
  "etnia",
  "musulm",
  "musulman",
  "cristian",
  "católico",
  "catolico",
  "nacionalidad",
];

export function detectDiscrimination(text: string): ComplianceResult {
  const lower = (text || "").toLowerCase();
  const terms: string[] = [];
  for (const t of ZH_TERMS) {
    if (text.includes(t)) terms.push(t);
  }
  for (const t of ES_TERMS) {
    if (lower.includes(t)) terms.push(t);
  }
  return {
    flagged: terms.length > 0,
    terms,
    suggestionZh:
      "请使用中性招聘用语，例如「招聘服务人员」，不要出现国籍、性别、宗教或族裔限制。",
    suggestionEs:
      "Usa un lenguaje de contratación neutro, p. ej. «Se busca personal». No incluyas restricciones por nacionalidad, sexo, religión ni etnia.",
  };
}

import {sameSite,siteIdentity} from './siteIdentity';
import type { LlmCitationQuestionResult, LlmCitationTest } from './reportSchema';

export const CURRENT_GEO_PROTOCOL = 'geo-compare-v3' as const;
export type CitationSource = NonNullable<LlmCitationQuestionResult['sources']>[number];
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const u = new URL(value); return /^https?:$/.test(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export const ownHost=sameSite;
export function brandMentioned(text: string, brand: string, target: string): boolean {
  const normalized = text.normalize('NFKC').toLowerCase();
  const name = brand.normalize('NFKC').toLowerCase().trim();
  const identity=siteIdentity(target);if(!identity)return false;
  const escaped=(v:string)=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const nameMatch=name.length>=2&&new RegExp('(^|[^\\p{L}\\p{N}])'+escaped(name)+'(?=$|[^\\p{L}\\p{N}]|은|는|이|가|을|를|의|에|와|과|에서)','u').test(normalized);
  const reference=identity.shared?(identity.tenant?identity.host+'/'+identity.tenant:''):identity.host;
  const hostMatch=!!reference&&new RegExp('(^|[^a-z0-9._-])'+escaped(reference)+'(?=$|[^a-z0-9._-])','i').test(normalized);
  return nameMatch||hostMatch;
}
export function normalizeSources(raw: {url?: unknown; title?: unknown}[], target: string): CitationSource[] {
  const seen = new Set<string>();
  return raw.flatMap(s => {
    const url = safeHttpUrl(s.url);
    if (!url || seen.has(url)) return [];
    seen.add(url);
    const unresolved = new URL(url).hostname === 'vertexaisearch.cloud.google.com';
    return [{ url, title: typeof s.title === 'string' ? s.title : new URL(url).hostname,
      ownership: unresolved ? 'unresolved' as const : ownHost(url, target) ? 'own' as const : 'external' as const }];
  });
}
export function parseOpenAI(payload: any, target: string) {
  const messages = (payload.output || []).filter((o: any) => o.type === 'message');
  const parts = messages.flatMap((m: any) => m.content || []).filter((c: any) => c.type === 'output_text');
  const text = parts.map((p: any) => p.text || '').join('\n');
  const sources = normalizeSources(parts.flatMap((p: any) => (p.annotations || [])
    .filter((a: any) => a.type === 'url_citation').map((a: any) => ({url:a.url,title:a.title}))), target);
  return { text, sources, searchUsed: (payload.output || []).some((o: any) => o.type === 'web_search_call' && o.status === 'completed') };
}
export function parseGemini(payload: any, target: string) {
  const candidate = payload.candidates?.[0];
  const text = (candidate?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || '').join('\n');
  const meta = candidate?.groundingMetadata;
  // Only chunks actually referenced by a grounding support are citations.
  const referenced = new Set<number>((meta?.groundingSupports || []).flatMap((s: any) => s.groundingChunkIndices || []));
  const sources = normalizeSources((meta?.groundingChunks || []).flatMap((c: any, i: number) =>
    referenced.has(i) && c.web ? [{url:c.web.uri,title:c.web.title}] : []), target);
  return {text, sources, searchUsed: !!meta?.webSearchQueries?.length};
}
function rate(rows: LlmCitationQuestionResult[], match: (r: LlmCitationQuestionResult) => boolean) {
  return rows.length ? Math.round(rows.filter(match).length / rows.length * 100) : null;
}
export function aggregateCitation(results: LlmCitationQuestionResult[]) {
  const valid = results.filter(r => r.status === 'ok' || r.status === 'unverified');
  const counts=new Map<string,number>();
  const pair=(r:LlmCitationQuestionResult)=>JSON.stringify([r.engine,r.question.trim()]);
  results.forEach(r=>counts.set(pair(r),(counts.get(pair(r))||0)+1));
  const unique=valid.filter(r=>counts.get(pair(r))===1);
  const measured = unique.filter(r => r.status === 'ok' && r.searchUsed && r.citationVerified);
  const citationRate = rate(measured, r => r.cited);
  return {
    totalTests: results.length, validTests: valid.length, citationValidTests: measured.length,
    failedTests: results.length - valid.length, totalCited: measured.filter(r => r.cited).length,
    mentionRate: rate(unique.filter(r=>typeof r.brandMentioned==='boolean'), r => !!r.brandMentioned), ownedCitationRate: citationRate,
    brandedCitationRate: rate(measured.filter(r => r.branded), r => r.cited),
    unbrandedCitationRate: rate(measured.filter(r => !r.branded), r => r.cited),
    // Retained for older consumers only. v2 UI uses nullable metrics above.
    overallScore: citationRate ?? 0, citationRate: citationRate ?? 0,
    engineScores: {
      chatgpt: rate(measured.filter(r => r.engine === 'chatgpt'), r => r.cited) ?? 0,
      gemini: rate(measured.filter(r => r.engine === 'gemini'), r => r.cited) ?? 0,
    },
  };
}
export function buildActionPlan(results: LlmCitationQuestionResult[], url: string, hasContent: boolean): NonNullable<LlmCitationTest['actionPlan']> {
  return [...new Set(results.map(r => r.question.trim()))].map(question => {
    const rows = results.filter(r => r.question.trim() === question);
    const measuredRows=rows.filter(r=>r.status==='ok'&&r.searchUsed===true&&r.citationVerified===true&&rows.filter(other=>other.engine===r.engine).length===1);
    const source = measuredRows.filter(r=>r.cited).flatMap(r => r.sources || []).find(s => s.ownership === 'own');
    const measured = measuredRows.length>0;
    return {
      question, journey: rows[0]?.journey || '검토', accuracy: 'needs_review' as const,
      targetUrl: source?.url || (hasContent ? url : undefined),
      action: source ? 'review_cited' : !measured ? 'retry' : hasContent ? 'improve_candidate' : 'research_page',
      evidence: source ? `자사 출처 확인: ${source.title}. 내용의 정확성은 별도 검토가 필요합니다.`
        : !measured ? '검색 또는 출처 판정이 완료되지 않아 인용 여부를 확정할 수 없습니다.'
        : hasContent ? '이번 질문에서 자사 출처를 확인하지 못했습니다. 입력 페이지의 본문만 수집했으며 질문과의 적합성은 검토해야 합니다.'
        : '입력 페이지에서 검토할 본문을 충분히 수집하지 못했습니다. 사이트 전체의 페이지 유무는 확인하지 않았습니다.',
      nextStep: source ? '인용된 문단을 실제 가격·서비스 범위·최신 정보와 대조하고 정확하면 유지하세요.'
        : !measured ? '엔진 상태를 확인하고 동일한 질문으로 다시 측정하세요.'
        : hasContent ? `“${question}”에 대한 직접 답변, 적용 조건, 확인 가능한 근거와 업데이트 날짜를 페이지에 보완하세요.`
        : '사이트 내 관련 페이지를 먼저 찾으세요. 없다면 이 질문에 답하는 페이지를 새로 기획하세요.',
    };
  });
}

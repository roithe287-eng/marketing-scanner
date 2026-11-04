import type {MedicalAudit} from './medicalAuditSchema';
import {MEDICAL_STATUS_LABELS} from './medicalAudit';
import type {ReportBlock} from './reportDocument';

export function buildMedicalAuditDocument(audit:MedicalAudit|undefined):ReportBlock[]{
  if(!audit)return [];
  const blocks:ReportBlock[]=[{kind:'heading',text:'병의원 맞춤 진단 · 진료분야·의료진·검색 정보'},{kind:'body',text:audit.scopeNote},{kind:'body',text:`기준 확인 ${audit.reviewedOn} · ${audit.systems.join(' · ')||'의료체계 확인 필요'} · ${audit.institutions.join(' · ')||'기관 종별 확인 필요'}`}];
  for(const p of audit.profiles){blocks.push({kind:'subheading',text:p.label},{kind:'body',text:p.focus},{kind:'body',text:p.schemaHint});for(const q of p.questions)blocks.push({kind:'body',text:`방문 전 질문: ${q}`});for(const e of p.evidence)blocks.push({kind:'body',text:`분류 근거: ${e.text} · ${e.locator}`,href:e.url});}
  for(const c of audit.checks){blocks.push({kind:'subheading',text:`${c.label} · ${MEDICAL_STATUS_LABELS[c.status]}`},{kind:'body',text:c.detail});for(const e of c.evidence)blocks.push({kind:'body',text:`원문: ${e.text} · 위치: ${e.locator}`,href:e.url});blocks.push({kind:'body',text:`실행·완료 확인: ${c.action}`});for(const id of c.sources){const source=audit.sources.find(s=>s.id===id);if(source)blocks.push({kind:'body',text:source.title,href:source.url});}}
  return blocks;
}

import {z} from 'zod';
import {placeTermKey,type PlaceTerm} from './hospitalPlace';

export const clinicMediaSchema=z.object({
  images:z.number().int().min(0).max(200), described:z.number().int().min(0).max(200),
  videos:z.number().int().min(0).max(100), subjects:z.array(z.string().max(30)).max(5),
});
export type ClinicMedia=z.infer<typeof clinicMediaSchema>;
export const clinicPageFactsSchema=z.object({
  url:z.string().url().max(2048),title:z.string().max(500),description:z.string().max(200),
  terms:z.array(z.object({category:z.enum(['증상','질병','시술','검진']),term:z.string().max(40)})).max(48).nullable(),
  media:clinicMediaSchema.nullable()
});
export type ClinicPageFacts=z.infer<typeof clinicPageFactsSchema>;

export const photoSubjects=['미확인','외관·입구','진료 공간','의료진','장비','위치·주차','기타'] as const;
export const visibleVideo=['미확인','영상 표시','확인한 화면에 없음'] as const;
export type PlaceFieldNotes={
  photo:typeof photoSubjects[number];video:typeof visibleVideo[number];
  description:string;registered:string;
};
export const emptyFieldNotes:PlaceFieldNotes={photo:'미확인',video:'미확인',description:'',registered:''};
export type ClinicObservation={
  area:string;query:string;position:number;seenAt:string;name:string;page:ClinicPageFacts|null;notes:PlaceFieldNotes;
};
export const comparisonTitle='플레이스 일반검색 비교';
export const comparisonScope='검색 위치와 시점에 따라 노출 순서는 달라집니다. 관찰한 특징을 우리 병원의 개선 항목으로 활용하세요.';

export function compactText(value:string,limit=160) {
  const clean=value.replace(/\s+/gu,' ').trim();
  return clean.length>limit?clean.slice(0,limit-1)+'…':clean;
}
export function descriptionTopics(text:string) {
  return [
    {label:'진료 분야',pattern:/진료|치료|검사|검진|한의|클리닉/},
    {label:'방문 정보',pattern:/주차|위치|방문|진료시간|[가-힣]+역|오시는\s*길/},
    {label:'문의·예약',pattern:/문의|예약|접수|상담/},
  ].filter(t=>t.pattern.test(text)).map(t=>t.label);
}
export function keywordHit(terms:PlaceTerm[]|null,query:string) {
  if (!terms) return null;
  return terms.some(t=>placeTermKey(t.term)===placeTermKey(query));
}
export function registeredTerms(input:string) {
  return [...new Set(input.split(/[,，、;；\n]/u).map(s=>s.trim()).filter(Boolean))];
}
export function observationInsights(ours:ClinicPageFacts,other:ClinicObservation,ownTags:string[],ownNotes:PlaceFieldNotes=emptyFieldNotes) {
  const peer=other.page, query=other.query, notes=other.notes;
  const ownHit=keywordHit(ours.terms,query), peerHit=keywordHit(peer?.terms??null,query);
  const insights:{label:string;text:string}[]=[];
  if(peerHit===true && ownHit===false) insights.push({label:'진료 문구',text:'비교 페이지에서 ‘'+query+'’ 표기를 찾았습니다. 우리 병원도 실제 진료한다면 해당 진료 안내와 첫 화면의 연결을 확인하세요.'});
  else if(peerHit && ownHit) insights.push({label:'진료 문구',text:'두 페이지 모두 ‘'+query+'’를 다룹니다. 진료 대상과 방문 전 준비 사항이 환자에게 분명한지 비교하세요.'});
  const tags=registeredTerms(notes.registered);
  if(tags.some(t=>placeTermKey(t)===placeTermKey(query))) insights.push({label:'제공된 등록값',text:ownTags.length?(ownTags.some(t=>placeTermKey(t)===placeTermKey(query))?'양쪽 입력 목록에 검색어가 있습니다. 실제 진료 범위와 안내 문구의 일치를 대조하세요.':'비교 병원의 제공 목록에서 검색어를 확인했습니다. 우리 관리 화면에서 해당 항목의 진료 여부와 등록값을 대조하세요.'):'비교 병원에서 제공한 등록값에 검색어가 있습니다. 위 카드에 우리 등록 목록을 입력하면 함께 대조할 수 있습니다.'});
  const peerDesc=descriptionTopics(peer?.description||''),ownDesc=descriptionTopics(ours.description);
  const extras=peerDesc.filter(t=>!ownDesc.includes(t));
  if(extras.length) insights.push({label:'홈페이지 소개',text:'비교 홈페이지의 메타 설명에는 '+extras.join('·')+' 안내가 있습니다. 우리 소개문에도 필요한지 원문과 대조하세요.'});
  if(notes.description.trim()) {
    const topics=descriptionTopics(notes.description);
    const ownTopics=descriptionTopics(ownNotes.description);
    const gap=topics.filter(topic=>!ownTopics.includes(topic));
    insights.push({label:'제공된 플레이스 소개',text:ownNotes.description.trim()&&gap.length?'제공된 두 소개문을 대조하면 비교 병원에 '+gap.join('·')+' 표현이 더 있습니다. 실제 운영 범위에 맞게 우리 소개문을 검토하세요.':topics.length?'제공받은 소개문에서 '+topics.join('·')+' 표현을 확인했습니다. 우리 소개문에 실제 운영 정보를 간결하게 담을 수 있는지 검토하세요.':'제공받은 소개문과 현재 진료 대상·방문 절차를 대조하세요.'});
  }
  if(notes.photo!=='미확인'&&notes.photo===ownNotes.photo) insights.push({label:'대표사진 주제',text:'두 병원 모두 '+notes.photo+' 사진을 표시했습니다. 환자가 실제 지점과 방문 동선을 구별할 수 있는 사진인지 확인하세요.'});
  else if(notes.photo!=='미확인'||notes.video==='영상 표시') insights.push({label:'플레이스 미디어',text:[notes.photo!=='미확인'?'관찰한 대표사진 주제는 '+notes.photo+'입니다.':'',notes.video==='영상 표시'?'관찰 화면에 영상이 표시됐습니다.':'','우리 지점의 방문 전 질문에 답하는 자체 사진·영상을 검토하세요.'].filter(Boolean).join(' ')});
  if(peer?.media && ours.media) {
    const subjects=peer.media.subjects.filter(s=>!ours.media!.subjects.includes(s));
    if(subjects.length) insights.push({label:'홈페이지 사진',text:'비교 홈페이지의 이미지 설명에 '+subjects.join('·')+' 표현이 있습니다. 우리 페이지에도 해당 안내가 필요한지 확인하세요.'});
    if(peer.media.videos && !ours.media.videos) insights.push({label:'홈페이지 영상',text:'비교 홈페이지 HTML에 영상 요소가 있습니다. 우리 병원의 예약·방문 절차를 영상으로 설명할 필요가 있는지 검토하세요.'});
  }
  if(!insights.length) insights.push({label:'다음 확인',text:'현재 표본에서 뚜렷한 콘텐츠 차이를 확인하기 어렵습니다. 같은 지역·검색어로 일반 결과를 다시 확인하고 대표사진 주제와 소개 정보를 대조하세요.'});
  return insights;
}

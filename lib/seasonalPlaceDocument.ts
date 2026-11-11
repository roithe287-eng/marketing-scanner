import type {ReportBlock} from './reportDocument';
import {SEASONAL_TITLE,type SeasonalPlaceReview} from './seasonalPlaceReview';
export function buildSeasonalPlaceDocument(r:SeasonalPlaceReview|undefined):ReportBlock[]{
  if(!r)return [];
  const b:ReportBlock[]=[{kind:'subheading',text:SEASONAL_TITLE},{kind:'body',text:r.scope},{kind:'body',text:'관측 서비스: '+r.profiles.map(p=>p.label).join(' · ')+' / 준비 주제: '+r.seasons.join(' · ')},{kind:'body',text:'홈페이지 지역·목적지: '+(r.regions.map(x=>x.label).join(' · ')||'근거 부족 · 조합 보류')}];
  for(const d of r.destinations)b.push({kind:'body',text:d.label+' · 관측 표현 '+d.matchedAs+' · 목적지 위치 참고 '+d.area+' · 매장 주소와 구분',href:d.source});
  for(const k of r.keywordIdeas)b.push({kind:'body',text:'콘텐츠 조합 제안: '+k.text+' / 근거: '+k.basis,href:r.sourceUrl});
  b.push({kind:'body',text:'시즌 표기: '+(r.seasonLabels.join(' · ')||'표본에서 미확인')});
  if(r.oldLabels.length)b.push({kind:'body',text:'이전 연도 표기 확인: '+r.oldLabels.join(' · ')+' · 과거 안내인지 현재 예약 상품인지 원문에서 대조. 폐업·시즌 종료 판정 아님.'});
  for(const p of r.profiles)b.push({kind:'subheading',text:p.label},{kind:'body',text:'관측: '+p.observation.excerpt,href:r.sourceUrl},...p.fields.map(text=>({kind:'body' as const,text:'우선 정보: '+text})),{kind:'body',text:'사진·설명: '+p.photo},...p.questions.map(text=>({kind:'body' as const,text:'고객 질문: '+text})));
  for(const c of r.checks)b.push({kind:'subheading',text:c.label+' · '+c.status},{kind:'body',text:c.excerpt,href:r.sourceUrl},{kind:'body',text:c.action});
  for(const s of r.stages)b.push({kind:'subheading',text:s.title},{kind:'body',text:s.text});
  b.push({kind:'body',text:'리조트 정보와 외부 매장 정보를 구분하세요. 실제 서비스 지역 밖의 키워드를 업체명에 나열하지 않습니다. 공식 영업시간·예약·새소식 가이드는 이어지는 적용 조건을 확인하세요.'});
  return b;
}

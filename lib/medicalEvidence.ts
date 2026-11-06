import * as cheerio from 'cheerio';
import type {MedicalPageEvidence,MedicalEvidence} from './medicalAuditSchema';
import {MEDICAL_PROFILES} from './medicalProfiles';
import {clinicPlaceIdentity,excludedPlaceIdentity,placeChannel} from './hospitalPlace';
import {findPlaceTerms} from './hospitalPlaceTerms';

const clean=(v:unknown,max=600)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
const term=(v:string)=>v.replace(/^https?:\/\/schema.org\//,'').replace(/^schema:/,'');
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:v==null?[]:[v];
const values=(v:unknown):string[]=>arr(v).flatMap(x=>typeof x==='string'?[x]:x&&typeof x==='object'?values((x as Record<string,unknown>)['@id']):[]);
const FACILITIES=new Set(['MedicalClinic','Hospital','Dentist','PhysiciansOffice','Physician','MedicalOrganization']);
const SPECIALTIES=new Set('Anesthesia Audiology Cardiovascular CommunityHealth Dentistry Dermatology DietNutrition Emergency Endocrine Gastroenterologic Genetic Geriatric Gynecologic Hematologic Infectious LaboratoryScience Midwifery Musculoskeletal Neurologic Nursing Obstetric Oncologic Ophthalmology Optometric Otolaryngologic Pathology Pediatric PharmacySpecialty Physiotherapy PlasticSurgery Podiatric PrimaryCare Psychiatric PublicHealth Pulmonary Radiography Renal RespiratoryTherapy Rheumatologic SpeechPathology Surgical Toxicologic Urologic'.split(' '));
export const medicalSensitiveUrl=(value:string)=>{try{return /\/(?:mychart|mypage|medical-records?|patient\/(?:records?|results?|charts?)|consult\/(?:view|detail)|reservations?\/(?:detail|complete|confirm))(?:\/|$)/i.test(new URL(value).pathname);}catch{return true;}};
const signals:[string,RegExp][]=[
  ['scope',/진료\s*(?:과목|분야|대상|안내)|검사\s*(?:항목|안내)|시술\s*(?:안내|대상)/],
  ['doctors',/의료진|한의사|치과의사|전문의|원장\s*(?:소개|약력)|담당\s*의사/],
  ['process',/진료\s*절차|검사\s*준비|초진|접수\s*후|상담\s*후|내원\s*준비|사후\s*관리|회복\s*안내/],
  ['risk',/부작용|주의사항|금기|제외\s*대상|적용\s*(?:대상|한계)|개인차|위험/],
  ['cost',/비급여|진료비|비용|보험|급여\s*적용|포함\s*(?:항목|범위)/],
  ['hours',/진료\s*시간|접수\s*마감|휴진|점심\s*시간|(?:평일|토요일|일요일).{0,30}\d{1,2}(?:시|:)/],
  ['location',/오시는\s*길|도로명|주차|소재지|주소\s*[:：]/],
  ['author',/작성\s*[:：]|검토\s*[:：]|감수\s*[:：]|의학\s*감수|최종\s*(?:검토|수정)|업데이트\s*[:：]/],
  ['references',/참고\s*(?:문헌|자료)|출처\s*[:：]|doi\.org|임상\s*(?:연구|시험)|가이드라인/],
  ['faq',/자주\s*묻는|질문\s*답변|FAQ|Q\s*[.：:]|예약\s*방법/i],
  ['claim',/(?:100\s*%|무조건|반드시).{0,15}(?:완치|효과|치료|회복)|(?:효과|완치|안전성).{0,10}보장|부작용\s*(?:없|제로)|국내\s*(?:최고|유일)|유일한\s*(?:치료|병원)/],
];
const DAYS:Record<string,string>={Monday:'월요일',Tuesday:'화요일',Wednesday:'수요일',Thursday:'목요일',Friday:'금요일',Saturday:'토요일',Sunday:'일요일'};
const clock=(s:string)=>{const m=s.match(/^(\d{1,2})(?::(\d{2}))?$/);return m&&+m[1]<24?`${m[1].padStart(2,'0')}:${m[2]||'00'}`:null;};
function hoursIssues(node:Record<string,unknown>,units:{text:string}[]):string[]{
  const rows=arr(node.openingHoursSpecification).filter((x):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x)&&!('validFrom' in x)&&!('validThrough' in x));
  const issues:string[]=[];
  for(const [day,label] of Object.entries(DAYS)){
    const row=rows.filter(r=>values(r.dayOfWeek).map(term).includes(day));
    if(row.length!==1)continue; // Split hours or seasonal schedules require a human comparison.
    const opens=clock(clean(row[0].opens)),closes=clock(clean(row[0].closes));if(!opens||!closes)continue;
    const text=units.find(u=>new RegExp(label+'\\s*[:：]?\\s*\\d{1,2}').test(u.text)&&!/(?:접수\s*마감|점심)/.test(u.text))?.text;
    if(!text)continue;
    const m=text.match(new RegExp(label+'\\s*[:：]?\\s*(\\d{1,2}(?::\\d{2})?)\\s*시?\\s*(?:~|～|−|–|-)\\s*(\\d{1,2}(?::\\d{2})?)'));
    if(m&&(clock(m[1])!==opens||clock(m[2])!==closes))issues.push(`진료시간 ${label}: 본문 ${clock(m[1])}~${clock(m[2])} / 스키마 ${opens}~${closes}. 같은 지점·요일인지 확인하세요.`);
  }
  return issues;
}

/** Source declarations, not verified credentials. No external requests or script execution. */
export function captureMedicalEvidence(html:string,url:string,providerOnly=false,hospitalContext=false):MedicalPageEvidence{
  const $=cheerio.load(html),sensitive=medicalSensitiveUrl(url);
  const identity=clean([$ ('head > title').text(),$('meta[name="description" i]').first().attr('content'),$('h1').slice(0,3).text()].filter(Boolean).join(' '),1500);
  const nodes:Record<string,unknown>[]=[],formats=new Set<MedicalPageEvidence['formats'][number]>();
  const walk=(v:unknown,depth=0)=>{if(depth>10||nodes.length>=700||!v||typeof v!=='object')return;if(Array.isArray(v)){v.slice(0,100).forEach(x=>walk(x,depth+1));return;}const n=v as Record<string,unknown>;nodes.push(n);Object.values(n).forEach(x=>walk(x,depth+1));};
  $('script[type="application/ld+json"]').slice(0,30).each((_,el)=>{const s=$(el).text();if(s.length>200000)return;try{walk(JSON.parse(s));formats.add('JSON-LD');}catch{/* Core JSON audit preserves syntax errors. */}});
  const readDom=(selector:string,typeAttr:string,propAttr:string,format:'Microdata'|'RDFa')=>{
    $(selector).slice(0,60).each((_,el)=>{
      const scope=$(el),type=clean(scope.attr(typeAttr),200).split(/\s+/).map(term);
      if(!type.some(t=>FACILITIES.has(t)||['Person','IndividualPhysician','MedicalWebPage'].includes(t)))return;
      const node:Record<string,unknown>={'@type':type,'@id':scope.attr('itemid')||scope.attr('about')||scope.attr('resource')||''};
      scope.find(`[${propAttr}]`).slice(0,100).each((_,child)=>{
        const field=$(child),ancestor=field.parent().closest(selector)[0];
        if(ancestor!==el)return;
        const text=field.attr('content')||field.attr('datetime')||field.attr('href')||field.attr('resource')||field.text();
        for(const key of clean(field.attr(propAttr),200).split(/\s+/).map(term)){
          const value=clean(text,1200);if(!value)continue;
          node[key]=node[key]?[...arr(node[key]),value]:value;
        }
      });nodes.push(node);formats.add(format);
    });
  };
  readDom('[itemscope][itemtype]','itemtype','itemprop','Microdata');
  readDom('[typeof]','typeof','property','RDFa');
  const idKey=(id:string)=>{try{return new URL(id,url).href;}catch{return id;}};
  const byId=new Map<string,Record<string,unknown>>();
  for(const n of nodes){const id=clean(n['@id'],2048);if(id&&Object.keys(n).length>Object.keys(byId.get(idKey(id))||{}).length)byId.set(idKey(id),n);}
  const resolve=(v:unknown):unknown=>v&&typeof v==='object'&&!Array.isArray(v)?{...byId.get(idKey(clean((v as Record<string,unknown>)['@id'],2048))),...v as Record<string,unknown>}:v;
  const textValue=(v:unknown):string=>{v=resolve(v);return typeof v==='string'?clean(v,500):v&&typeof v==='object'?clean(['addressRegion','addressLocality','streetAddress','name'].map(k=>clean((v as Record<string,unknown>)[k],300)).filter(Boolean).join(' '),500):'';};
  const body=$('body').clone();body.find('script,style,noscript,template,form,input,textarea,select,svg,[hidden],[aria-hidden="true"],[data-private]').remove();
  const visible=clean(body.text(),60000),phone=(s:string)=>s.replace(/^\+82[\s-]?/,'0').replace(/\D/g,'');
  const content=body.clone();content.find('nav,header,footer').remove();
  const units:{text:string;locator:string}[]=[];
  content.find('h1,h2,h3,p,li,dt,dd,tr,address').slice(0,500).each((_,e)=>{const text=clean($(e).text());if(text&&!units.some(u=>u.text===text))units.push({text,locator:e.tagName||'본문'});});
  if(!units.length&&visible)units.push({text:clean(content.text()),locator:'body'});
  const observed:MedicalPageEvidence['signals']=[];
  const evidence=(text:string,locator:string):MedicalEvidence=>({text:clean(text),locator,url});
  if(!sensitive){
    for(const [key,re] of signals){const unit=units.find(u=>re.test(u.text));if(unit)observed.push({key,evidence:evidence(unit.text,unit.locator)});}
    for(const profile of MEDICAL_PROFILES){const unit=profile.match.test(identity)?{text:identity,locator:'title / description / h1'}:units.find(u=>/^(?:h1|h2|h3)$/.test(u.locator)&&profile.match.test(u.text));if(unit)observed.push({key:`profile:${profile.id}`,evidence:evidence(unit.text,unit.locator)});}
  }
  const declared=nodes.some(n=>values(n['@type']).map(term).some(t=>FACILITIES.has(t)&&t!=='MedicalOrganization'));
  const institution=/병원|의원|한의원|치과|\b(?:hospital|clinic|dentist)\b/i.test(identity);
  const editorial=/블로그|뉴스|기사|가이드|선택\s*(?:방법|기준)|고르는\s*법/i.test(identity);
  const namedFacility=/[가-힣A-Za-z0-9]{2,20}(?:한의원|한방병원|의원|병원|치과|클리닉)/.test(identity);
  const facilityCandidate=!providerOnly&&!sensitive&&(declared||institution&&(!editorial||namedFacility));
  const seen=new Set<string>(),entities:MedicalPageEvidence['entities']=[];
  for(let node of nodes){
    const ts=values(node['@type']).map(term),type=ts.find(t=>FACILITIES.has(t)||t==='IndividualPhysician'||SPECIALTIES.has(t))||(ts.includes('Person')&&/의사|한의사|치과의사|\bphysician|dentist\b/i.test(clean(node.jobTitle))?'Person':undefined);
    if(!type)continue;
    const id=clean(node['@id'],2048);node=resolve(node) as Record<string,unknown>;
    const name=clean(node.name,300),address=textValue(node.address),telephone=clean(node.telephone,80),key=id?idKey(id):`${type}:${name}:${address}:${telephone}`;
    if(seen.has(key))continue;seen.add(key);
    const specialties=values(node.medicalSpecialty).map(v=>clean(v,200)).slice(0,15),issues:string[]=[];
    if(SPECIALTIES.has(type))issues.push(`${type}는 진료분야 열거값입니다. 기관 @type과 medicalSpecialty 값을 구분해 확인하세요.`);
    if(FACILITIES.has(type)){
      if(!name||!address)issues.push('구글 LocalBusiness의 name·PostalAddress 주소를 원문과 대조할 필요가 있습니다. 전화·시간·좌표는 권장 항목이며 같은 필수값으로 채점하지 않습니다.');
      if(name&&visible&&!visible.replace(/\s/g,'').includes(name.replace(/\s/g,'')))issues.push('스키마 기관명이 수집한 화면 텍스트에서 일치하지 않아 본문·지점 대조가 필요합니다.');
      if(telephone&&visible&&phone(telephone).length>=8&&!phone(visible).includes(phone(telephone)))issues.push('스키마 전화번호가 수집한 화면 텍스트에서 일치하지 않아 대표번호·지점 확인이 필요합니다.');
      if(node.aggregateRating||node.review)issues.push('본원 통제 리뷰의 LocalBusiness/Organization 별점은 구글 별점 기능 대상에서 제외됩니다. 스키마가 있다는 이유로 노출 성공으로 처리하지 않습니다.');
      if(node.medicineSystem)issues.push('medicineSystem은 MedicalEntity에 쓰는 속성입니다. 기관의 필수 속성으로 붙이거나 의료체계를 추정하지 마세요.');
      if(arr(node.availableService).some(v=>typeof v==='string'||v&&typeof v==='object'&&!values((v as Record<string,unknown>)['@type']).map(term).some(t=>/^(?:MedicalProcedure|MedicalTest|MedicalTherapy|SurgicalProcedure|TherapeuticProcedure|PhysicalTherapy|RadiationTherapy)$/.test(t))))issues.push('availableService의 값은 MedicalProcedure·MedicalTest·MedicalTherapy 계열인지 확인합니다. 일반 Service·단순 시술명으로 자동 완성하지 않습니다.');
      if(nodes.filter(n=>values(n['@type']).map(term).some(t=>FACILITIES.has(t))).length===1)issues.push(...hoursIssues(node,units));
    }
    for(const specialty of specialties)if(!SPECIALTIES.has(term(specialty)))issues.push(`medicalSpecialty의 정의된 열거값과 적용 범위 확인: ${specialty.slice(0,150)}`);
    if(/한의원|한방병원|한의사/.test(identity)&&values(node.medicineSystem).map(term).includes('TraditionalChinese'))issues.push('한의과를 TraditionalChinese로 자동 동일시하지 않습니다. 실제 표기의 근거와 medicineSystem 속성 적용 대상을 확인하세요.');
    entities.push({type,id,name,address,telephone,specialties,issues:issues.slice(0,12)});if(entities.length>=20)break;
  }
  // Clinical medicineSystem can be declared on a MedicalEntity rather than the institution itself.
  if(entities.length&&/한의원|한방병원|한의사/.test(identity)&&nodes.some(n=>values(n.medicineSystem).map(term).includes('TraditionalChinese'))&&!entities.some(e=>e.issues.some(x=>x.includes('TraditionalChinese'))))entities[0].issues.push('MedicalEntity의 TraditionalChinese 표기를 한국 한의과와 자동 동일시하지 않습니다. 원문과 실제 의료체계의 대응을 확인하세요.');
  const ownTitle = clean([$ ('head > title').first().text(),$('h1').first().text()].join(' '),800);
  const clinical = observed.some(s=>['scope','doctors','hours'].includes(s.key)) || /진료\s*예약|외래\s*진료|초진\s*접수|본원에서\s*진료/.test(visible);
  const namedEntity = entities.some(e=>['Hospital','MedicalClinic','Dentist','PhysiciansOffice'].includes(e.type) && e.name && ownTitle.includes(e.name));
  const facility = !sensitive && !providerOnly && clinicPlaceIdentity(ownTitle,identity,url,clinical,namedEntity);
  const channelMap = new Map<string,{label:string;url:string;priority:number}>();
  body.find('a[href]').slice(0,400).each((_,el)=>{
    const anchor=$(el);
    try {
      const link=new URL(anchor.attr('href')||'',url);
      if (!/^https?:$/.test(link.protocol) || link.username || link.password || link.href.length>2048 ||
        !/(?:^|\.)(?:naver\.com|naver\.me|google\.com|hira\.or\.kr)$/.test(link.hostname)) return;
      const label=clean(anchor.attr('aria-label') || anchor.text().trim() || anchor.find('img[alt]').first().attr('alt') || anchor.attr('title'),100) || '연결된 외부 정보';
      const placeLink=facility || hospitalContext ? placeChannel(link.href,label) : undefined;
      const href=placeLink?.url || link.href,priority=placeLink?.kind==='place'?2:placeLink?1:0;
      if ((channelMap.get(href)?.priority ?? -1)<priority) channelMap.set(href,{label,url:href,priority});
    } catch { /* Ignore invalid channel URLs. */ }
  });
  const channels=[...channelMap.values()].sort((a,b)=>b.priority-a.priority).slice(0,10).map(({label,url})=>({label,url}));
  const roles:MedicalPageEvidence['roles']=[];
  if(/의료진|원장\s*(?:소개|약력)|doctor|staff/i.test(identity+' '+url))roles.push('doctors');
  if(/진료\s*(?:안내|과목)|시술\s*안내|검사\s*안내|treatment|service/i.test(identity+' '+url))roles.push('services');
  if(/진료\s*시간|오시는\s*길|주차|contact|location/i.test(identity+' '+url))roles.push('visit');
  if(/비급여|진료비|비용|price/i.test(identity+' '+url))roles.push('cost');
  if(/칼럼|건강\s*정보|의학\s*정보|article|column/i.test(identity+' '+url))roles.push('article');
  let place:MedicalPageEvidence['place'];
  if ((facility || hospitalContext) && !providerOnly && !sensitive && !excludedPlaceIdentity(identity,url)) {
    const excerpts:{text:string;context?:string}[] = [];
    const pagePath = new URL(url).pathname;
    const publicTreatment = !/\/(?:patient|reviews?|cases?|news|blog|column|consult|counsel|board|mypage)(?:[/.\-_]|$)/i.test(pagePath)
      && !/치료\s*후기|환자\s*사례|의학\s*(?:칼럼|정보)|건강\s*칼럼/.test(ownTitle);
    if (publicTreatment) {
      const textArea = content.clone();
      textArea.find('[class*="review"],[class*="comment"],[class*="patient"],[class*="testimonial"],[id*="comment"],[id*="review"],[id*="patient"],[class*="counsel"],[data-private],aside').remove();
      textArea.find('[style]').each((_,el)=>{
        if (/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test($(el).attr('style')||'')) $(el).remove();
      });
      textArea.find('h1,h2,h3,h4,p,li,dt,dd,td,a').slice(0,500).each((_,el)=>{
        const node=$(el),text=clean(node.text(),360);
        const context=clean(node.prevAll('h1,h2,h3,h4,dt').first().text() || node.parent().prevAll('h1,h2,h3,h4').first().text(),90);
        if (text) excerpts.push({text,context});
      });
    }
    place={facility,terms:findPlaceTerms(excerpts)};
  }
  return {facilityCandidate:facilityCandidate || facility,providerOnly,sensitive,identity,...(place?{place}:{}),textLength:sensitive?0:clean(content.text(),60000).length,signals:observed.slice(0,30),formats:[...formats],entities:sensitive?[]:entities,channels:sensitive?[]:channels,roles:sensitive?[]:roles};
}

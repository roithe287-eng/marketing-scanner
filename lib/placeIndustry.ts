import {PLACE_DETECTION_ORDER,placeSector} from './localPlaceCatalog';
import {describesOwnBusiness,keywordList} from './industryLanguage';
import {classificationText} from './websiteIdentity';

const generalTerms=new Set(['문의','상담','연락','예약','서비스','주말','단체','가족','방문','가격','신청','제공','주문','운영','영업시간','시설','주차','픽업','이용','준비','조건','야간','휴일','시간표','운영시간']);
const identityText=(v:string)=>classificationText(v).replace(/(?:반려동물|반려견|애견|강아지|고양이)\s*동반/gu,'');

/** Metadata can suggest a category; require an offering or independent support before using it. */
export function placeFromDescription(description:string, body:readonly string[]=[]){
  const meta=identityText(description);
  if(!meta||keywordList(meta))return;
  const independent=[...new Set(body.map(identityText))].filter(t=>!meta.includes(t)&&!keywordList(t)).map(t=>t.replaceAll(meta,' ').trim()).filter(t=>t.length>=2);
  const visitType=classificationText(description).match(/(?:반려동물|반려견|애견|강아지|고양이)\s*동반\s*(?:가능한?\s*)?(호텔|펜션|식당|카페)/u)?.[1];
  const candidates=PLACE_DETECTION_ORDER.filter(id=>id!=='local').map(placeSector).filter(s=>s.identity.test(meta)).map(s=>{
    const own=describesOwnBusiness(meta,s.identity)||!!visitType&&s.identity.test(visitType);
    const terms=s.services.filter(t=>!generalTerms.has(t)&&!s.identity.test(t));
    const details=terms.some(t=>meta.includes(t));
    const corroborated=independent.some(t=>s.identity.test(t)||terms.some(term=>t.includes(term)));
    return {sector:s,score:(own?4:0)+(corroborated?2:0)+(details?1:0)};
  }).filter(c=>c.score>0).sort((a,b)=>b.score-a.score);
  if(candidates[0]&&candidates[0].score>(candidates[1]?.score||0))return candidates[0].sector;
}

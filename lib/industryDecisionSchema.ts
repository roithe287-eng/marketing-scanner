import {z} from 'zod';
import {IndustryCategorySchema} from './industryCategory';

const fields=z.enum(['title','heading','description','body','product','document','action']);
const evidence=z.object({field:fields,text:z.string().max(240),url:z.string().url().max(4000)});
const offerPage=z.object({category:IndustryCategorySchema.exclude(['etc']),url:z.string().url().max(4000),title:z.string().min(1).max(160)});
const base=z.object({sourceUrl:z.string().url().max(4000),evidence:z.array(evidence).max(4)});
export const IndustryDecisionSchema=z.discriminatedUnion('status',[
  base.extend({status:z.literal('matched'),category:IndustryCategorySchema.exclude(['etc']),label:z.string().max(120),
    serviceSpecialties:z.array(z.string().max(60)).max(8).optional(),retailSpecialties:z.array(z.string().max(60)).max(8).optional()}),
  base.extend({status:z.literal('page_type'),kind:z.enum(['editorial','public_service']),label:z.string().max(120)}),
  base.extend({status:z.literal('review'),reason:z.enum(['insufficient','conflicting','multiple_offers','redirected','restricted']),offerPages:z.array(offerPage).min(2).max(4).optional()}),
]);
export type IndustryDecision=z.infer<typeof IndustryDecisionSchema>;
export type IndustryOfferPage=z.infer<typeof offerPage>;
export type IndustryEvidence=IndustryDecision['evidence'][number];

export const industryReviewMessage={
  insufficient:'자사 상품이나 서비스를 확인할 원문이 부족합니다. 대표 상품·서비스 상세 주소로 다시 진단해 주세요.',
  multiple_offers:'서로 다른 사업 영역을 확인했습니다. 분석할 상품이나 서비스의 상세 주소를 선택해 해당 영역을 진단할 수 있습니다.',
  conflicting:'페이지 제목·소개·제공 업무의 업종 단서가 서로 다릅니다. 서비스나 상품을 직접 소개하는 주소로 다시 진단해 주세요.',
  redirected:'입력한 주소와 다른 도메인에 도착했습니다. 아래 최종 주소가 진단하려던 사이트인지 확인해 주세요.',
  restricted:'공개 HTML 수집이 제한되어 자사 상품·서비스를 확인하기 어렵습니다.',
};

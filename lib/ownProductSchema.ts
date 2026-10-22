import {z} from 'zod';
export const OwnProductSourceSchema=z.object({
  url:z.string().max(2048),name:z.string().max(300),description:z.string().max(1200),categories:z.array(z.string().max(100)).max(8),
  kind:z.enum(['structured_product','product_page']),
});
export const OwnProductContextSchema=z.object({
  status:z.enum(['observed','not_observed','unavailable','blocked']),
  discovery:z.enum(['input_page','public_links','naver_web','naver_shop']),attemptedPages:z.number().int().nonnegative().max(5),
  discoveryAttempts:z.array(z.object({provider:z.enum(['naver_web','naver_shop']),returnedCount:z.number().int().nonnegative(),productLinkCount:z.number().int().nonnegative(),status:z.enum(['ok','unavailable'])})).max(3).optional(),
  sources:z.array(OwnProductSourceSchema).max(12),note:z.string().max(600),
});
export type OwnProductSource=z.infer<typeof OwnProductSourceSchema>;
export type OwnProductContext=z.infer<typeof OwnProductContextSchema>;
export const OWN_PRODUCT_NOTE='공개된 자사 상품 원문을 표본으로 확인하는 보완 수집입니다. 전체 상품 수·매출 비중·주력 품목 순위는 측정하지 않았습니다. 비교 키워드는 확인한 상품군의 범위이며 홈페이지 HTML의 SEO 관측값과 구분합니다.';

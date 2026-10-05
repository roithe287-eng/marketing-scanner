export type Goal='inquiry'|'purchase'|'search';
export type Category='find'|'first'|'clarity'|'trust'|'action';
export const categories:Record<Category,string>={find:'검색 준비',first:'첫인상',clarity:'설명력',trust:'신뢰 정보',action:'행동 유도'};
export const goals:Record<Goal,string>={inquiry:'문의 늘리기',purchase:'구매 유도',search:'검색에서 발견되기'};
export type Check={id:string;category:Category;label:string;pass:boolean;weight:number};
export type Guide={id:string;category:Category;title:string;current:string;proposal:string;location:string;selector:string;steps:string[];expected:string;boundary:string;metric:string;source:{title:string;url:string};priority:number};
export type Report={id:string;url:string;pageTitle:string;goal:Goal;createdAt:string;method:'pocket-static-v1';platform:string;scores:Record<Category,number>;checks:Check[];guides:Guide[];completed:string[];coverage:string;demo?:boolean};
export type Account={id:string;email?:string;kind:'guest'|'member'};

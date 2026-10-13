import type {ExtractedWebsiteData} from './extractWebsite';
const types=(v:unknown):string[]=>Array.isArray(v)?v.filter((t):t is string=>typeof t==='string').map(t=>t.replace(/^https?:\/\/schema.org\//,'')):typeof v==='string'?[v.replace(/^https?:\/\/schema.org\//,'')]:[];
function valueAt(obj:Record<string,unknown>,path:string):unknown {
 const parts=path.split('.');
 const visit=(v:unknown,index:number):unknown=>{if(index===parts.length)return v;if(Array.isArray(v))return v.map(x=>visit(x,index)).find(present);if(!v||typeof v!=='object')return undefined;return visit((v as Record<string,unknown>)[parts[index]],index+1);};
 return visit(obj,0);
}
function present(v:unknown):boolean {return v!==undefined&&v!==null&&(typeof v!=='string'||!!v.trim())&&(!Array.isArray(v)||v.length>0);}
function references(v:unknown,depth=0):boolean {
 if(depth>12)return true;if(!v||typeof v!=='object')return false;
 if(Array.isArray(v))return v.some(x=>references(x,depth+1));
 const o=v as Record<string,unknown>;
 return (typeof o['@id']==='string'&&Object.keys(o).every(k=>k==='@id'||k==='@type'))||Object.values(o).some(x=>references(x,depth+1));
}
/** Checks only explicit JSON-LD objects. Never combine required values across entities.
 * @id references and ambiguous feature choices require the official validator.
 * This is presence validation, not a complete rich-result eligibility test.
 */
export function inspectOfficialStructuredData(d:ExtractedWebsiteData) {
 const issues:string[]=[],deferred:string[]=[],checked:string[]=[];
 const objects=d.jsonLdSchemas||[];
 const required:Record<string,string[]>={Recipe:['name','image'],VideoObject:['name','thumbnailUrl','uploadDate'],SoftwareApplication:['name','offers.price'],Product:['name'],LocalBusiness:['name','address'],Event:['name','startDate','location'],JobPosting:['title','description','datePosted','hiringOrganization'],ProfilePage:['mainEntity'],Dataset:['name','description']};
 objects.slice(0,2000).forEach((obj,index)=>{
  if(!obj||typeof obj!=='object')return;
  for(const type of types(obj['@type'])) {
   const fields=required[type];if(!fields)continue;
   const label=`${type} #${index+1}`;
   if(references(obj)){deferred.push(`${label}: @id 참조·중첩 객체를 공식 도구에서 연결해 확인`);continue;}
   checked.push(label);
   for(const field of fields)if(!present(valueAt(obj,field)))issues.push(`${label}: ${field} 미감지`);
   if(type==='Product'&&!['review','aggregateRating','offers'].some(k=>present(obj[k])))issues.push(`${label}: 제품 스니펫용 review / aggregateRating / offers 중 하나 미감지`);
   if(type==='SoftwareApplication'&&!['review','aggregateRating'].some(k=>present(obj[k])))issues.push(`${label}: review / aggregateRating 중 하나 미감지`);
  }
 });
 const videos=objects.filter(o=>o&&types(o['@type']).includes('VideoObject'));
 const partners=videos.filter(o=>present(o.cid));const naverIssues:string[]=[];
 for(const [i,v] of partners.entries()){
  if(references(v)){deferred.push(`네이버 제휴 VideoObject #${i+1}: 참조 객체 직접 확인`);continue;}
  for(const p of ['name','description','url','uploadDate','duration','creator.name','creator.url'])if(!present(valueAt(v,p)))naverIssues.push(`VideoObject #${i+1}: ${p} 미감지`);
  if(!present(v.thumbnailUrl)&&!d.ogImage)naverIssues.push(`VideoObject #${i+1}: thumbnailUrl / og:image 미감지`);
  if(present(v.creator)&&!types(v.creator['@type']).includes('Person'))naverIssues.push(`VideoObject #${i+1}: creator.@type은 Person 확인 필요`);
  if(present(v.offers))deferred.push(`네이버 제휴 VideoObject #${i+1}: offers 존재 · 무료 영상이라면 0원도 제거 필요`);
 }
 return {issues:issues.slice(0,30),deferred:deferred.slice(0,12),checked:checked.slice(0,30),videos:videos.length,partners:partners.length,naverIssues:naverIssues.slice(0,20)};
}

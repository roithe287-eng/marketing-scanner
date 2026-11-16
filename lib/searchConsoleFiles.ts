import {comparableUrl} from './mobileEvidence';

export const maxSearchFileBytes=1_000_000;
export type QueryRow={query:string;impressions:number;clicks:number;position:number};
export type SearchConsoleSample={rows:QueryRow[];page:string;device:string;scopeKey:string;periodLabel:string};

function key(input:string){return input.normalize('NFKC').trim().toLowerCase().replace(/[\s_\-]/g,'');}
export function readCsv(text:string):string[][]{
  if(text.length>maxSearchFileBytes)throw new Error('CSV 파일은 1MB까지 읽을 수 있습니다.');
  const rows:string[][]=[];
  let row:string[]=[],value='',quoted=false;
  for(let i=text.charCodeAt(0)===0xfeff?1:0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){value+='"';i++;}
      else quoted=!quoted;
      continue;
    }
    if(!quoted&&(ch===','||ch==='\n'||ch==='\r')){
      row.push(value);value='';
      if(ch===',')continue;
      if(ch==='\r'&&text[i+1]==='\n')i++;
      if(row.some(cell=>cell.trim()))rows.push(row);
      row=[];
      continue;
    }
    value+=ch;
  }
  if(quoted)throw new Error('CSV 따옴표 형식을 확인해 주세요.');
  row.push(value);if(row.some(cell=>cell.trim()))rows.push(row);
  return rows;
}
const queryNames=['topqueries','queries','query','인기검색어','상위검색어','검색어','인기검색검색어'];
const count=(value:string|undefined)=>{
  const clean=value?.trim().replace(/,/g,'')||'';
  if(!/^\d+(?:\.\d+)?$/.test(clean))return NaN;
  const n=Number(clean);return Number.isFinite(n)?n:NaN;
};
export function parseSearchConsoleFiles(files:string[],target:string):SearchConsoleSample{
  const tables=files.map(readCsv);
  const queries=tables.find(rows=>queryNames.includes(key(rows[0]?.[0]||'')));
  const filters=tables.find(rows=>['filter','필터'].includes(key(rows[0]?.[0]||'')));
  if(!queries||!filters)throw new Error('내보낸 압축 파일에서 검색어 CSV와 필터 CSV를 함께 선택해 주세요.');
  const props=new Map(filters.slice(1).map(row=>[key(row[0]||''),row[1]?.trim()||'']));
  const filter=(...names:string[])=>names.map(n=>props.get(key(n))).find(Boolean)||'';
  const rawPage=filter('page','페이지').replace(/^(?:exact url|is exactly|정확한 URL)\s*:\s*/i,'');
  const page=comparableUrl(rawPage);
  if(!page||page!==comparableUrl(target))throw new Error('서치콘솔에서 이 페이지의 URL을 정확히 일치하는 페이지 필터로 지정한 뒤 다시 내보내 주세요.');
  const type=filter('search type','검색 유형')||'';
  if(!type||!['web','웹'].includes(key(type)))throw new Error('검색 유형을 웹으로 설정해 내보내 주세요.');
  const headers=queries[0].map(key);
  const clicksAt=headers.findIndex(h=>['clicks','클릭수','클릭'].includes(h));
  const impressionsAt=headers.findIndex(h=>['impressions','노출수','노출'].includes(h));
  const positionAt=headers.findIndex(h=>['position','게재순위','평균게재순위','순위'].includes(h));
  if(clicksAt<0||impressionsAt<0||positionAt<0)throw new Error('검색어 CSV에서 노출·클릭·평균 게재순위 열을 찾지 못했습니다.');
  const found=new Map<string,QueryRow>();
  for(const fields of queries.slice(1,20001)){
    const query=fields[0]?.trim().slice(0,190);
    const impressions=count(fields[impressionsAt]),clicks=count(fields[clicksAt]),position=count(fields[positionAt]);
    if(!query||!Number.isInteger(impressions)||!Number.isInteger(clicks)||clicks>impressions||!Number.isFinite(position))continue;
    if(found.has(query))throw new Error('같은 검색어가 여러 번 나옵니다. 서치콘솔 검색어 표를 그대로 내보내 주세요.');
    found.set(query,{query,impressions,clicks,position});
  }
  if(!found.size)throw new Error('읽을 수 있는 검색어 행이 없습니다.');
  const rawDevice=key(filter('device','기기','기기 유형'));
  const device=({'mobile':'모바일','모바일':'모바일','휴대전화':'모바일','desktop':'데스크톱','데스크톱':'데스크톱','tablet':'태블릿','태블릿':'태블릿'} as Record<string,string>)[rawDevice]||(rawDevice||'전체 기기');
  const ignoredFilters=['page','페이지','date','날짜','기간','device','기기','기기유형','searchtype','검색유형'];
  const scopeKey=JSON.stringify([page,device,...[...props].filter(([k])=>!ignoredFilters.includes(k)).sort(([a],[b])=>a.localeCompare(b))]);
  return {rows:[...found.values()],page,device,scopeKey,periodLabel:filter('date','날짜','기간')};
}
export type DateRange={start:string;end:string};
const day=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)?Date.parse(v+'T00:00:00Z'):NaN;
export function comparablePeriods(current:DateRange,previous:DateRange,scope:string,previousScope:string){
  const a=day(current.start),b=day(current.end),c=day(previous.start),d=day(previous.end);
  return scope===previousScope&&b>=a&&d>=c&&b-a===d-c&&d<a;
}
export function sampleTotals(sample:SearchConsoleSample){
  const counts=sample.rows.reduce((sum,row)=>({clicks:sum.clicks+row.clicks,impressions:sum.impressions+row.impressions}),{clicks:0,impressions:0});
  return {...counts,ctr:counts.impressions?counts.clicks/counts.impressions*100:null};
}
export function searchOpportunities(sample:SearchConsoleSample){
  const rate=(sampleTotals(sample).ctr||0)/100;
  const rows=sample.rows.map(row=>({...row,gap:row.impressions*rate-row.clicks}));
  const candidates=rows.filter(row=>row.impressions>=10&&row.gap>0).sort((a,b)=>b.gap-a.gap);
  return {selected:(candidates.length?candidates:rows.sort((a,b)=>b.impressions-a.impressions)).slice(0,8),hasCandidates:!!candidates.length};
}
/** Search Console 'latest links' exports use an explicit source address column. */
export function sourceUrlsFromFile(text:string){
  const [head,...rows]=readCsv(text);
  const at=head?.findIndex(field=>['linkingpage','sourceurl','source','링크페이지','링크를포함한페이지','링크가있는페이지','소스url','소스페이지','링크url','링크'].includes(key(field)))??-1;
  if(at<0)throw new Error('서치콘솔 링크 → 최신 링크 또는 더 많은 예시 링크 CSV를 선택해 주세요.');
  return rows.map(row=>row[at]?.trim()||'').filter(value=>!!comparableUrl(value));
}

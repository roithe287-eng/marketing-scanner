export const maxSearchFileBytes=1_000_000;
export type DateRange={start:string;end:string};
export type QueryRow={query:string;impressions:number;clicks:number;position:number|null};
export type SearchConsoleSample={
  rows:QueryRow[];excludedRows:number;page:string;device:string;scopeKey:string;periodLabel:string;fileRange:DateRange|null;
};

export function comparableUrl(value:string):string{
  try{const u=new URL(value);if(!/^https?:$/.test(u.protocol)||u.username||u.password)return '';u.hash='';return u.href;}
  catch{return '';}
}

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
function count(value=''){
  const raw=value.trim();
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.0+)?$/.test(raw))return NaN;
  return Number(raw.replace(/,/g,''));
}
function day(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;
  const time=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(time)&&new Date(time).toISOString().startsWith(value+'T')?time:NaN;
}
function rangeFromFilter(label:string):DateRange|null{
  const normalized=label.normalize('NFKC').replace(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g,'$1-$2-$3')
    .replace(/(\d{4})[./]\s*(\d{1,2})[./]\s*(\d{1,2})\.?/g,'$1-$2-$3').trim();
  const endpoints=normalized.match(/^(\d{4}-\d{1,2}-\d{1,2})(?:\s*(?:~|–|—|-|to|부터)\s*(\d{4}-\d{1,2}-\d{1,2})(?:\s*까지)?)?$/i);
  if(!endpoints)return null;
  const iso=(raw:string)=>raw.split('-').map(part=>part.padStart(2,'0')).join('-');
  const start=iso(endpoints[1]),end=iso(endpoints[2]||endpoints[1]);
  if(!(day(end)>=day(start)))throw new Error('필터 CSV의 날짜 범위를 확인해 주세요.');
  return {start,end};
}
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
  if(clicksAt<0||impressionsAt<0)throw new Error('검색어 CSV에서 노출·클릭 열을 찾지 못했습니다.');
  const found=new Map<string,QueryRow>();
  let excludedRows=0,totalImpressions=0;
  for(const fields of queries.slice(1)){
    const query=fields[0]?.trim();
    const impressions=count(fields[impressionsAt]),clicks=count(fields[clicksAt]);
    if(!query||!Number.isSafeInteger(impressions)||!Number.isSafeInteger(clicks)||clicks>impressions){excludedRows++;continue;}
    if(found.has(query))throw new Error('같은 검색어가 여러 번 나옵니다. 서치콘솔 검색어 표를 그대로 내보내 주세요.');
    totalImpressions+=impressions;
    if(!Number.isSafeInteger(totalImpressions))throw new Error('노출 합계를 정확하게 계산할 수 있는 범위를 초과했습니다.');
    const rawRank=fields[positionAt]?.trim()||'';
    const rank=/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(rawRank)?Number(rawRank.replace(/,/g,''))
      :/^\d+,\d{1,2}$/.test(rawRank)?Number(rawRank.replace(',','.')):NaN;
    found.set(query,{query,impressions,clicks,position:Number.isFinite(rank)&&rank>0?rank:null});
  }
  if(!found.size)throw new Error('읽을 수 있는 검색어 행이 없습니다.');
  const rawDevice=key(filter('device','기기','기기 유형'));
  const device=({'mobile':'모바일','모바일':'모바일','휴대전화':'모바일','desktop':'데스크톱','데스크톱':'데스크톱','tablet':'태블릿','태블릿':'태블릿'} as Record<string,string>)[rawDevice]||(rawDevice||'전체 기기');
  const ignoredFilters=['page','페이지','date','날짜','기간','device','기기','기기유형','searchtype','검색유형'];
  const scopeKey=JSON.stringify([page,device,...[...props].filter(([k])=>!ignoredFilters.includes(k)).sort(([a],[b])=>a.localeCompare(b))]);
  const periodLabel=filter('date','날짜','기간');
  return {rows:[...found.values()],excludedRows,page,device,scopeKey,periodLabel,fileRange:rangeFromFilter(periodLabel)};
}
export function periodComparisonIssue(current:DateRange,previous:DateRange,scope:string,previousScope:string){
  if(scope!==previousScope)return '두 파일의 페이지·검색 유형·기기·국가 등 필터를 맞춰 주세요.';
  if(!current.start||!current.end||!previous.start||!previous.end)return '두 파일의 실제 시작일과 종료일을 확인해 입력해 주세요.';
  const a=day(current.start),b=day(current.end),c=day(previous.start),d=day(previous.end);
  if(!(b>=a&&d>=c))return '각 기간의 시작일과 종료일을 확인해 주세요.';
  if(d>=a)return '이전 기간은 최근 기간 시작일 전에 끝나야 합니다.';
  if(b-a!==d-c)return '두 기간의 일수를 동일하게 맞춰 주세요.';
  return null;
}
export function comparablePeriods(current:DateRange,previous:DateRange,scope:string,previousScope:string){
  return periodComparisonIssue(current,previous,scope,previousScope)===null;
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

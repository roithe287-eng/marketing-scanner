import type {MarketingReport} from './reportSchema';
import {buildCompetitorPositioning,positionGroups} from './competitorPositioning';
import {wrapPdfText,type TextMeasurer,type PdfTextStyle} from './pdfLayout';
import type {VisualPdfPage} from './reportVisualPdf';
export function buildCompetitorVisualPage(report:MarketingReport,measure:TextMeasurer):VisualPdfPage|null {
  const model=buildCompetitorPositioning(report);if(!model)return null;
  const page:VisualPdfPage={lines:[],shapes:[]};
  const rect=(x:number,y:number,width:number,height:number,color:string,radius=8)=>page.shapes.push({kind:'rect',x,y,width,height,color,radius});
  function text(value:string,x:number,y:number,width:number,size=14,color='#334155',weight=400){const s:PdfTextStyle={size,lineHeight:size*1.6,color,weight};for(const line of wrapPdfText(value,s,measure,width)){page.lines.push({...s,text:line.text,x,y,width:measure(line.text,s)});y+=s.lineHeight;}return y;}
  text('MARKETING SCANNER · COMPETITOR EVIDENCE',48,46,694,12,'#526174',700);
  text('검색 메시지 포지셔닝',48,73,694,26,'#202936',800);
  text(`대표 키워드: ${model.analysis.searchKeyword}`,48,126,694,17,'#285b98',700);
  text('X 검색어 연결도 · Y 선택 정보 범위 / 검색량·검색 순위·성과 점수가 아닙니다.',48,162,694,14);
  const x0=112,y0=225,w=560,h=304;
  rect(x0,y0,w/2,h/2,'#f2eff9',0);rect(x0+w/2,y0,w/2,h/2,'#eaf4ef',0);rect(x0,y0+h/2,w/2,h/2,'#f8f2e8',0);rect(x0+w/2,y0+h/2,w/2,h/2,'#edf3fc',0);
  rect(x0+w/2,y0,1,h,'#a4b5c8',0);rect(x0,y0+h/2,w,1,'#a4b5c8',0);
  text('Y · 선택 정보 범위',48,197,400,15,'#202936',700);
  [100,50,0].forEach(n=>text(`${n}`,67,y0+h*(1-n/100)-11,36,13));
  [0,50,100].forEach(n=>text(`${n}`,x0+w*n/100-12,y0+h+24,40,13));
  for(const g of positionGroups(model.rows.slice(0,6))){const x=x0+w*g.x/100,y=y0+h*(1-g.y/100);rect(x-23,y-19,46,38,g.rows.some(r=>r.own)?'#b91825':'#315d88',18);const label=g.rows.length>1?`${g.rows.length}곳`:g.rows[0].own?'자사':g.rows[0].id.split('-')[1];text(label,x-18,y-12,40,14,'#ffffff',700);}
  if(!model.groups.length)text('두 필드가 확보된 사이트가 없어 좌표 판정 보류',168,363,454,16);
  text('X · 검색어 연결도',280,584,260,15,'#202936',700);
  let y=622;
  for(const [i,row] of model.rows.slice(0,6).entries()){rect(48,y,694,42,row.own?'#faedf0':'#f5f7fa');const name=`${row.own?'자사':`후보 ${i}`} · ${row.name}`;text(name.length>26?name.slice(0,26)+'…':name,60,y+8,428,14,'#202936',700);text(row.x===null?'판정 보류':`X ${row.x} / Y ${row.y}`,506,y+8,220,14);y+=50;}
  y=text('같은 좌표는 묶었습니다. 50은 안내선이며 합격·평균 기준이 아닙니다. 두 필드가 없는 사이트는 0점으로 처리하지 않습니다.',48,y+12,694,14)+12;
  text('도표는 자사와 첫 5개 후보까지 표시합니다. 모든 후보의 좌표·선정 근거·원문·TO-BE·KPI는 뒤의 경쟁사 상세에 담았습니다.',48,y,694,14);
  return page;
}

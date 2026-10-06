import type {MarketingReport} from './reportSchema';
import {buildCompetitorPositioning,positionGroups,positionCoordinates,positionDiameter} from './competitorPositioning';
import {wrapPdfText,type TextMeasurer,type PdfTextStyle} from './pdfLayout';
import type {VisualPdfPage} from './reportVisualPdf';
export function buildCompetitorVisualPage(report:MarketingReport,measure:TextMeasurer):VisualPdfPage|null {
  const model=buildCompetitorPositioning(report);if(!model)return null;
  const page:VisualPdfPage={lines:[],shapes:[]};
  const rect=(x:number,y:number,width:number,height:number,color:string,radius=8)=>page.shapes.push({kind:'rect',x,y,width,height,color,radius});
  function text(value:string,x:number,y:number,width:number,size=14,color='#334155',weight=400){const s:PdfTextStyle={size,lineHeight:size*1.6,color,weight};for(const line of wrapPdfText(value,s,measure,width)){page.lines.push({...s,text:line.text,x,y,width:measure(line.text,s)});y+=s.lineHeight;}return y;}
  text('MARKETING SCANNER · COMPETITOR EVIDENCE',48,46,694,12,'#526174',700);
  text('검색 메시지 포지셔닝',48,73,694,26,'#202936',800);
  text(`대표 키워드: ${model.analysis.searchKeyword} · ${model.profile.label} 기준`,48,126,694,17,'#285b98',700);
  text('X 상품·서비스 설명 · Y 선택·이용 근거 / 검색 순위·성과 점수 아님',48,162,694,14);
  const x0=112,y0=225,w=560,h=280;
  rect(x0,y0,w/2,h/2,'#f2eff9',0);rect(x0+w/2,y0,w/2,h/2,'#eaf4ef',0);rect(x0,y0+h/2,w/2,h/2,'#f8f2e8',0);rect(x0+w/2,y0+h/2,w/2,h/2,'#edf3fc',0);
  rect(x0+w/2,y0,1,h,'#a4b5c8',0);rect(x0,y0+h/2,w,1,'#a4b5c8',0);
  text('Y · 선택·이용 근거',48,197,400,15,'#202936',700);
  [100,50,0].forEach(n=>text(`${n}`,67,y0+h*(.15+.7*(1-n/100))-11,36,13));
  [0,50,100].forEach(n=>text(`${n}`,x0+w*(.15+.7*n/100)-12,y0+h+14,40,13));
  for(const g of positionGroups(model.rows.slice(0,6))){const point=positionCoordinates(g.x,g.y),x=x0+w*(point.left-10)/80,y=y0+h*(point.top-10)/80,d=positionDiameter(g.signalCount),own=g.rows.some(r=>r.own);rect(x-d/2+2,y-d/2+7,d,d,'#23405b25',d/2);rect(x-d/2,y-d/2,d,d,own?'#b91825':'#315d88',d/2);rect(x-d*.28,y-d*.35,d*.3,d*.18,own?'#f3a0ad':'#99c7e8',d*.09);const label=g.rows.length>1?`${g.rows.length}곳`:g.rows[0].own?'자사':g.rows[0].id.split('-')[1];const labelWidth=measure(label,{size:14,weight:700,color:'#ffffff',lineHeight:22.4});text(label,x-labelWidth/2,y-11.2,d,14,'#ffffff',700);}
  if(!model.groups.length)text('두 필드가 확보된 사이트가 없어 좌표 판정 보류',168,363,454,16);
  text('X · 상품·서비스 설명',280,550,260,15,'#202936',700);
  text('크기 = 업종별 정보 단서 0~8개 · 중복 표현 제외 · 종류별 최대 2개. 겹친 업체는 평균 단서 수로 표시합니다.',48,584,694,13);
  let y=622;
  for(const [i,row] of model.rows.slice(0,6).entries()){rect(48,y,694,42,row.own?'#faedf0':'#f5f7fa');const name=`${row.own?'자사':`후보 ${i}`} · ${row.name}`;text(name.length>26?name.slice(0,26)+'…':name,60,y+8,428,14,'#202936',700);text(row.x===null?'판정 보류':`X ${row.x} / Y ${row.y} · 단서 ${row.signalCount}`,500,y+8,230,13);y+=50;}
  y=text('0·100도 내부에 여백을 두어 배치합니다. 같은 좌표는 묶고 50은 안내선으로 사용합니다. 미수집은 0점이 아닙니다.',48,y+12,694,14)+12;
  text('도표는 자사와 첫 5개 후보까지 표시합니다. 모든 후보의 좌표·선정 근거·원문·TO-BE·KPI는 뒤의 경쟁사 상세에 담았습니다.',48,y,694,14);
  return page;
}

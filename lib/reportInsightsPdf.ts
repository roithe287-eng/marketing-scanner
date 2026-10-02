import type {MarketingReport} from './reportSchema';
import {buildReportInsights,insightNotes,messageThemes} from './reportInsights';
import {wrapPdfText,PDF_PAGE,type TextMeasurer,type PdfTextStyle} from './pdfLayout';
import type {VisualPdfPage} from './reportVisualPdf';
const ink='#202329',gray='#606875',red='#b9141a';
const short=(s:string,max=90)=>s.length>max?s.slice(0,max)+'…':s;
export function buildInsightsPdfPages(report:MarketingReport,measure:TextMeasurer):VisualPdfPage[] {
  const d=buildReportInsights(report),pages:VisualPdfPage[]=[];let page:VisualPdfPage,y=0;
  function text(value:string,x:number,top:number,width=694,size=13,color=ink,weight=400) {
    const style:PdfTextStyle={size,color,weight,lineHeight:size*1.6};
    for(const line of wrapPdfText(value,style,measure,width)){page.lines.push({...style,text:line.text,x,y:top,width:measure(line.text,style)});top+=style.lineHeight;}return top;
  }
  function rect(x:number,top:number,width:number,height:number,color='#f4f5f7'){page.shapes.push({kind:'rect',x,y:top,width,height,color,radius:10});}
  function next(title:string,note:string) {page={lines:[],shapes:[]};pages.push(page);rect(48,48,5,38,red);text('JINJJA MARKETING · DIAGNOSIS',65,46,660,11,gray,700);const end=text(title,65,68,660,25,ink,700);y=text(note,48,end+14,694,12,gray)+24;}
  next('핵심 진단 한눈에 보기',short(report.meta?.siteName||report.meta?.domain||report.url,65));
  rect(48,y,694,116);text(`마케팅 종합 점수  ${report.overallScore} / 100`,64,y+14,662,20,ink,700);text(short(report.oneLineSummary,95),64,y+51,662,14);y+=142;
  y=text('고객 전환 준비도',48,y,694,18,ink,700)+12;
  d.stages.forEach((s,i)=>{const x=48+i*177;rect(x,y,163,139);text(`0${i+1}  ${s.label}`,x+12,y+12,139,13,ink,700);text(`${s.score} / 100`,x+12,y+48,139,25,ink,700);rect(x+12,y+96,139,5,'#dfe4e9');if(s.score)rect(x+12,y+96,139*s.score/100,5,s.score===Math.min(...d.stages.map(v=>v.score))?red:'#43526a');});y+=151;
  y=text(insightNotes.stages,48,y,694,12,gray)+26;y=text('데이터 확인 범위',48,y,694,18,ink,700)+12;
  d.coverage.forEach((c,i)=>{const x=48+i*177;rect(x,y,163,136);text(c.label,x+12,y+12,139,13,ink,700);text(c.value,x+12,y+44,139,20,ink,700);text(c.state,x+12,y+83,139,12,gray);text(c.detail,x+12,y+108,139,10,gray);});y+=163;
  const stats=[['통합 보완',`${d.tasks.length}개`],['고객 질문',d.obs?`${d.questions.length}개`:'미확인'],['출처 URL',`${d.sources.length}개`],['브랜드 답변 대조',d.obs?`${d.reviews.length}건`:'미확인']];
  stats.forEach(([label,value],i)=>{const x=48+i*177;rect(x,y,163,90,'#fff5f5');text(label,x+12,y+12,139,12,gray);text(value,x+12,y+41,139,24,ink,700);});y+=110;
  text('보완 항목·관측 상태·출처를 함께 검토하세요. 브랜드 답변 대조는 오답 확정이 아닌 검토 제안입니다. 전체 원문과 실행 과제는 뒤의 상세 보고서에 포함됩니다.',48,y,694,12,gray);
  const note=insightNotes.messages;
  next('경쟁사 메시지 비교 지도',note);
  function tableHead(){rect(48,y,694,38);text('사이트',58,y+9,164,11,gray,700);messageThemes.forEach((t,i)=>text(t.label,232+i*85,y+9,78,10,gray,700));y+=42;}
  tableHead();
  for(const row of d.messageRows){if(y+80>PDF_PAGE.contentBottom){next('경쟁사 메시지 비교 · 계속',note);tableHead();}rect(48,y,694,72,row.isOwn?'#fff5f5':'#f7f8fa');text(short(row.name,26),58,y+10,164,12,ink,700);text(row.available?`${row.fieldCount}/2개 필드`:'수집 미확인',58,y+46,164,10,gray);row.cells.forEach((c,i)=>text(c.match===undefined?'미확인':c.match||'미탐지',232+i*85,y+22,78,10,c.match?ink:gray,c.match?700:400));y+=80;}
  y+=18;const summary=d.messageOpportunities.length?d.messageOpportunities.map(o=>`${o.label} (${o.total}개 중 ${o.count}개 후보에서 탐지)`).join(' · '):'제안할 공통 표현이 없거나 비교 정보가 충분하지 않습니다.';
  if(y+130>PDF_PAGE.contentBottom)next('메시지·키워드 연결 기회',note);
  y=text('자사 문구 검토 후보',48,y,694,16,ink,700)+6;y=text(summary,48,y,694,12,gray)+22;
  if(d.gaps.length){if(y+275>PDF_PAGE.contentBottom)next('키워드 연결 기회','본문 빈도 상위 표현에서 연결할 후보를 고릅니다. 검색량·검색 수요를 뜻하지 않습니다.');y=text('본문 → 제목·설명 연결 후보',48,y,694,17,ink,700)+12;
    for(const [i,k] of d.gaps.entries()){const x=48+(i%2)*354,top=y+Math.floor(i/2)*53;rect(x,top,340,45);text(short(k.keyword,13),x+12,top+5,134,12,ink,700);text(`${k.count}회 · 제목 ${k.inTitle?'포함':'미포함'} / 설명 ${k.inMetaDescription?'포함':'미포함'}`,x+148,top+12,180,10,gray);}
  }
  return pages;
}

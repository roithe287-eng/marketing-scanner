import {diagnosisScores,radarPoint} from './diagnosisVisuals';
import {buildKeywordRewrites,rewriteKinds} from './keywordRewrite';
import type {MarketingReport} from './reportSchema';
import {buildReportInsights,insightNotes,messageThemes} from './reportInsights';
import {wrapPdfText,PDF_PAGE,type TextMeasurer,type PdfTextStyle} from './pdfLayout';
import type {VisualPdfPage} from './reportVisualPdf';
const ink='#202329',gray='#606875',red='#b9141a';
const short=(s:string,max=90)=>s.length>max?s.slice(0,max)+'…':s;
export function buildInsightsPdfPages(report:MarketingReport,measure:TextMeasurer):VisualPdfPage[] {
  const d=buildReportInsights(report),pages:VisualPdfPage[]=[];let page!:VisualPdfPage,y=0;
  function text(value:string,x:number,top:number,width=694,size=13,color=ink,weight=400) {
    const style:PdfTextStyle={size,color,weight,lineHeight:size*1.6};
    for(const line of wrapPdfText(value,style,measure,width)){page.lines.push({...style,text:line.text,x,y:top,width:measure(line.text,style)});top+=style.lineHeight;}return top;
  }
  function rect(x:number,top:number,width:number,height:number,color='#f4f5f7'){page.shapes.push({kind:'rect',x,y:top,width,height,color,radius:10});}
  function next(title:string,note:string) {page={lines:[],shapes:[]};pages.push(page);rect(48,48,5,38,red);text('JINJJA MARKETING · DIAGNOSIS',65,46,660,11,gray,700);const end=text(title,65,68,660,25,ink,700);y=text(note,48,end+14,694,12,gray)+24;}
  const scores=diagnosisScores(report.diagnosis),ordered=[...scores].sort((a,b)=>a.score-b.score);
  next('8개 영역 진단 인포그래픽','기존 8방향 점수를 유지하고, 낮은 점수의 영역부터 검토 가이드를 연결합니다.');
  const chartY=y;
  for(const level of [100,80,60,40,20])page.shapes.push({kind:'polygon',x:48,y:chartY,width:694,height:480,points:scores.map((_,i)=>radarPoint(i,level,347,240,160)),color:'#dfe4eb',...(level===100?{fill:'#f8fafc'}:{})});
  page.shapes.push({kind:'polygon',x:48,y:chartY,width:694,height:480,points:scores.map((s,i)=>radarPoint(i,s.score,347,240,160)),color:'#c51620',fill:'#f8e1e4'});
  scores.forEach((s,i)=>{const p=radarPoint(i,100,395,chartY+240,213);rect(p.x-53,p.y-25,106,52);text(s.short,p.x-43,p.y-21,86,12,gray,700);text(`${s.score} / 100`,p.x-43,p.y+1,86,17,s.color,700);});
  rect(352,chartY+207,86,65,'#ffffff');text(`${Math.round(scores.reduce((n,s)=>n+s.score,0)/8)}`,374,chartY+209,50,27,ink,700);text('8영역 평균',365,chartY+247,74,11,gray);
  y=chartY+508;y=text('점수 기준 먼저 검토할 3개 영역',48,y,694,18,ink,700)+14;
  ordered.slice(0,3).forEach((s,i)=>{const x=48+i*236;rect(x,y,222,194);text(`0${i+1} · ${s.label}`,x+14,y+14,194,13,ink,700);text(`${s.score}점`,x+14,y+47,194,23,s.color,700);text(s.action,x+14,y+90,194,12,gray);});
  y+=214;text('검토 순서는 점수 기준이며 실제 성과·개선 효과의 크기를 뜻하지 않습니다. 동점은 표시 순서 기준입니다.',48,y,694,12,gray);
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
  if(d.gaps.length){if(y+275>PDF_PAGE.contentBottom)next('키워드 연결 기회','수집 텍스트의 빈도 상위 표현에서 연결 후보를 고릅니다. 검색량·검색 수요를 뜻하지 않습니다.');y=text('본문 → 제목·설명 연결 후보',48,y,694,17,ink,700)+12;
    for(const [i,k] of d.gaps.entries()){const x=48+(i%2)*354,top=y+Math.floor(i/2)*53;rect(x,top,340,45);text(short(k.keyword,13),x+12,top+5,134,12,ink,700);text(`${k.count}회 · 제목 ${k.inTitle?'포함':'미포함'} / 설명 ${k.inMetaDescription?'포함':'미포함'}`,x+148,top+12,180,10,gray);}
  }
  const rewrites=buildKeywordRewrites(report.keywordFrequency,report.meta),plans=rewrites.singles;
  if(plans.length||rewrites.phrases.length){
    next('반복 표현 · TO-BE 실행 가이드','빈도만으로 과잉을 판정하지 않습니다. 아래는 사실을 채워 사용할 작성 틀이며 전체 항목은 상세 보고서에 담았습니다.');
    rewriteKinds.forEach((kind,i)=>{const x=48+i*140;rect(x,y,132,80);text(kind,x+12,y+10,108,13,ink,700);text(`${plans.filter(p=>p.kind===kind).length}개`,x+12,y+36,108,22,red,700);});y+=103;
    for(const plan of [...plans,...rewrites.phrases].slice(0,3)){
      const title=`${short(plan.item.keyword,22)} · ${plan.kind} · ${plan.item.count}회`;
      if(y+250>PDF_PAGE.contentBottom)next('반복 표현 · TO-BE 계속','작성 틀을 실제 서비스와 조건에 맞게 확인해 사용하세요.');
      y=text(title,48,y,694,17,ink,700)+9;
      y=text(`AS-IS  ${short(plan.reason,140)}`,48,y,694,12,gray)+9;
      y=text(`TO-BE  ${short(plan.action,155)}`,48,y,694,13,ink)+9;
      y=text(`작성 틀  ${short(plan.template,155)}`,48,y,694,12,red)+22;
    }
  }
  return pages;
}

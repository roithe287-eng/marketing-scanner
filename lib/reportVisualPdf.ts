import {buildInsightsPdfPages} from './reportInsightsPdf';
import {buildNaverVisualPage} from './naverVisualPdf';
import type {MarketingReport} from './reportSchema';
import {buildObservationVisual,engineNames,engines,observationStates,readinessItems,readinessColors,readinessLabels,percentageChange} from './reportVisuals';
import {buildGeoComparison,GEO_COMPARISON_NOTE} from './geoComparison';
import {buildGeoFocus} from './geoFocus';
import {PDF_PAGE,wrapPdfText,type PdfPage,type PdfTextStyle,type TextMeasurer} from './pdfLayout';

export type PdfShape = {kind:'polygon';x:number;y:number;width:number;height:number;points:{x:number;y:number}[];color:string;fill?:string} | {kind:'rect';x:number;y:number;width:number;height:number;color:string;radius?:number} | {kind:'ring';x:number;y:number;size:number;value:number|null;color:string};
export type VisualPdfPage = PdfPage & {shapes:PdfShape[]};
const gray='#667085',ink='#152033',blue='#3564a7',green='#087f72';
const short=(s:string,n=110)=>s.length>n?s.slice(0,n)+'…':s;
export function buildVisualPdfPages(report:MarketingReport,measure:TextMeasurer):VisualPdfPage[] {
  const pages:VisualPdfPage[]=[];let page:VisualPdfPage;let y=0;
  const style=(size=14,color=ink,weight=400):PdfTextStyle=>({size,color,weight,lineHeight:size*1.55});
  const wrapped=(text:string,width:number,size=14,weight=400)=>wrapPdfText(text,style(size,ink,weight),measure,width);
  function text(value:string,x:number,top:number,width:number,size=14,color=ink,weight=400) {
    const s=style(size,color,weight);const lines=wrapPdfText(value,s,measure,width);
    for(const line of lines) {page.lines.push({...s,text:line.text,x,y:top,width:measure(line.text,s)});top+=s.lineHeight;}
    return top;
  }
  const rect=(x:number,top:number,width:number,height:number,color:string,radius=10)=>page.shapes.push({kind:'rect',x,y:top,width,height,color,radius});
  function newPage(title:string,note:string) {
    page={lines:[],shapes:[]};pages.push(page);rect(48,48,5,38,'#c51620',2);
    text('MARKETING SCANNER · VISUAL REPORT',65,46,660,11,gray,700);
    const bottom=text(title,65,68,660,25,ink,700);y=text(note,48,bottom+14,694,12,gray)+22;
  }
  function ensure(height:number,title:string,note:string) {if(y+height>PDF_PAGE.contentBottom)newPage(title,note);}
  const ready=readinessItems(report.discoverability),obs=buildObservationVisual(report.llmCitationTest);
  if (ready.length || obs) {
    newPage('GEO 한눈에 보기','페이지 준비도와 AI 답변 관측을 구분해 읽습니다. 모든 원문·출처·개선안은 뒤의 상세 보고서에 포함됩니다.');
    if(ready.length) {
      y=text(`페이지 준비도  ${report.discoverability!.overallScore} / 100`,48,y,694,17,ink,700)+12;
      for(let i=0;i<ready.length;i++) {
        const item=ready[i],x=48+(i%4)*177,top=y+Math.floor(i/4)*152;
        rect(x,top,163,140,'#f3f5f8');text(short(item.label,24),x+12,top+12,139,12,ink,700);
        text(`${item.score}점 · ${readinessLabels[item.status]}`,x+12,top+87,139,14,readinessColors[item.status],700);
        rect(x+12,top+128,139,5,'#dfe4ec',2);if(item.score)rect(x+12,top+128,139*item.score/100,5,readinessColors[item.status],2);
      }
      y+=Math.ceil(ready.length/4)*152+12;
    }
    if(obs) {
      ensure(410,'GEO AI 답변 관측','실패와 판정 불가는 인용률의 0점으로 처리하지 않습니다.');
      y=text('AI 답변 관측',48,y,694,17,ink,700)+12;
      const cards=[{label:'브랜드 언급률',rate:obs.mentionRate,n:obs.mentionCount,d:obs.mentionTotal,color:blue},{label:'자사 출처 인용률',rate:obs.citationRate,n:obs.sourceCount,d:obs.sourceTotal,color:green}];
      cards.forEach((c,i)=>{const x=48+i*355;rect(x,y,339,132,'#f3f5f8');page.shapes.push({kind:'ring',x:x+16,y:y+18,size:94,value:c.rate,color:c.color});const caption=c.rate===null?'—':`${c.rate}%`;text(caption,x+63-measure(caption,style(21,ink,700))/2,y+48,100,21,ink,700);text(c.label,x+126,y+25,195,15,ink,700);text(c.d?`${c.d}건 중 ${c.n}건`:'판정 가능한 관측 없음',x+126,y+61,195,12,gray);});
      y+=156;
      for(const d of obs.distributions) {
        y=text(`${engineNames[d.engine]}  ·  ${d.total}건`,48,y,694,13,ink,700)+7;
        rect(48,y,694,13,'#e5e9ef',4);let x=48;
        for(const [state,count] of Object.entries(d.counts)) {const width=d.total?694*count/d.total:0;if(width)rect(x,y,width,13,observationStates[state as keyof typeof d.counts].color,0);x+=width;}
        y+=22;y=text(Object.entries(d.counts).filter(([,n])=>n).map(([s,n])=>`${observationStates[s as keyof typeof d.counts].label} ${n}건`).join('  ·  ')||'관측 없음',48,y,694,12,gray)+18;
      }
      text('막대는 측정 상태의 구성입니다. API 관측은 일반 AI 화면이나 시장 전체 노출률과 다릅니다.',48,y,694,12,gray);
    }
  }
  if(obs?.questions.length) {
    const note='브랜드 언급과 자사 출처 인용은 다른 지표입니다. 질문·엔진별 상태를 아래에서 확인하세요.';
    newPage('질문별 AI 관측 지도',note);
    for(const q of obs.questions) {
      const qText=`Q${q.id}. ${q.question}`,qHeight=wrapped(qText,662,14,700).length*21.7,height=qHeight+112;
      ensure(height+14,'질문별 AI 관측 지도 · 계속',note);rect(48,y,694,height,'#f6f8fb');
      text(qText,64,y+14,662,14,ink,700);const top=y+qHeight+29;
      engines.forEach((engine,i)=>{const c=q.cells[engine],state=observationStates[c.state],x=64+i*339;rect(x,top,323,66,state.background,8);text(`${engineNames[engine]} · ${state.label}`,x+12,top+11,299,13,state.color,700);text(`브랜드 ${c.mentioned===null?'미확인':c.mentioned?'언급 있음':'언급 없음'}`,x+12,top+36,299,12,state.color);});
      y+=height+14;
    }
  }
  const comparison=buildGeoComparison(report);
  if(comparison) {
    newPage('GEO 이전·현재 비교',GEO_COMPARISON_NOTE);
    for(const m of [{label:'자사 출처 인용률',before:comparison.beforeRate,after:comparison.afterRate,count:comparison.matched},{label:'브랜드 언급률',before:comparison.beforeMention,after:comparison.afterMention,count:comparison.mentionCount}]) {
      rect(48,y,694,154,'#f3f5f8');text(`${m.label} · 동일한 ${m.count}쌍`,64,y+14,420,16,ink,700);text(percentageChange(m.before,m.after),490,y+14,232,13,gray,700);
      ([['이전',m.before,'#94a3b8'],['현재',m.after,blue]] as const).forEach(([label,value,color],i)=>{const top=y+55+i*38;text(label,64,top,42,13,gray);rect(112,top+5,518,12,'#dfe4ec',5);if(value!==null&&value>0)rect(112,top+5,518*value/100,12,color,5);text(value===null?'비교 불가':`${value}%`,644,top,82,13,ink,700);});
      y+=176;
    }
    const total=comparison.matched+comparison.excluded;
    y=text(`${comparison.matched}쌍 비교 · ${comparison.excluded}쌍 제외`,48,y,694,18,ink,700)+16;
    rect(48,y,694,18,'#e5e9ef',5);if(total) {const w=694*comparison.matched/total;if(w)rect(48,y,w,18,green,0);if(w<694)rect(48+w,y,694-w,18,'#e0b764',0);}y+=42;
    const changes=[['새로 인용',comparison.gained],['이번에 미확인',comparison.lost],['인용 유지',comparison.kept],['양쪽 미인용',comparison.matched-comparison.gained-comparison.lost-comparison.kept]] as const;
    if(comparison.matched)changes.forEach(([label,count],i)=>{const x=48+i*177;rect(x,y,163,90,'#f3f5f8');text(label,x+12,y+13,139,12,gray);text(`${count}건`,x+12,y+39,139,23,ink,700);});
    else text('비교 가능한 관측이 없어 변화 수치를 표시하지 않습니다.',48,y,694,14,gray);
    y+=115;text('각 질문의 제외 이유와 이전·현재 답변·출처는 상세 보고서에서 확인할 수 있습니다.',48,y,694,12,gray);
  }
  const focus=buildGeoFocus(report);
  if(focus?.tasks.length) {
    const note='관측 근거 → 실행 제안 → 완료 확인 순서로 검토하세요. 긴 내용은 요약했으며 전체 문장은 상세 보고서에 보존됩니다.';
    newPage('GEO 실행 과제 흐름도',note);
    for(const [i,task] of focus.tasks.entries()) {
      const title=`${i+1}. ${task.title}`,titleHeight=wrapped(title,662,16,700).length*24.8;
      const steps=[['관측 근거',task.evidence],['실행 제안',task.nextStep],['완료 확인',task.completion]];
      const stepHeight=Math.max(...steps.map(([,v])=>wrapped(short(v,95),194,12).length*18.6));
      const height=titleHeight+stepHeight+94;ensure(height+18,'GEO 실행 과제 흐름도 · 계속',note);rect(48,y,694,height,'#f3f5f8');text(title,64,y+16,662,16,ink,700);
      const top=y+titleHeight+38;
      steps.forEach(([label,value],j)=>{const x=64+j*225;rect(x,top,26,24,j===2?green:blue,6);text(`${j+1}`,x+8,top+3,20,11,'#ffffff',700);text(label,x+35,top+3,165,12,ink,700);text(short(value,95),x,top+36,194,12,gray);if(j<2)text('→',x+205,top+4,20,13,gray,700);});y+=height+18;
    }
  }
  return [...buildInsightsPdfPages(report,measure),...pages,buildNaverVisualPage(report,measure)];
}

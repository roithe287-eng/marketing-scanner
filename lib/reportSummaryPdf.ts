import {reportForPresentation} from './reportPresentation';
import {evidencePriorities} from './evidenceReview';
import {REPORT_NOTICE_SUMMARY,REPORT_NOTICE_URL} from './reportNotice';
import {diagnosisScores,radarPoint} from './diagnosisVisuals';
import {buildKeywordRewrites,type KeywordRewrite} from './keywordRewrite';
import {wrapPdfText,type PdfTextStyle,type TextMeasurer} from './pdfLayout';
import type {MarketingReport} from './reportSchema';
import type {VisualPdfPage} from './reportVisualPdf';

/** A deliberately bounded, one-page brief. Full wording stays in the detailed PDF. */
export function buildReportSummaryPage(report:MarketingReport,measure:TextMeasurer):VisualPdfPage {
  report=reportForPresentation(report);
  const page:VisualPdfPage={lines:[],shapes:[]},ink='#202329',muted='#606875',red='#b9141a';
  function text(value:string,x:number,y:number,width:number,size=12,weight=400,color=ink,maxLines=2) {
    const style:PdfTextStyle={size,weight,color,lineHeight:size*1.5};
    const lines=wrapPdfText(value,style,measure,width);
    lines.slice(0,maxLines).forEach((line,i)=>{
      let content=line.text;
      if(i===maxLines-1&&lines.length>maxLines){
        const parts=Array.from(new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(content),p=>p.segment);
        while(parts.length&&measure(parts.join('')+'…',style)>width)parts.pop();
        content=parts.join('')+'…';
      }
      page.lines.push({...style,text:content,x,y:y+i*style.lineHeight,width:measure(content,style)});
    });
  }
  function rect(x:number,y:number,width:number,height:number,color='#f5f6f8',radius=10){page.shapes.push({kind:'rect',x,y,width,height,color,radius});}
  rect(48,48,4,35,red,2);
  text('MARKETING SCANNER · ONE-PAGE BRIEF',64,46,510,10,700,muted,1);
  text('마케팅 진단 · 한 장 요약',64,65,510,25,700,ink,1);
  text(report.meta?.siteName||report.meta?.domain||report.url,48,110,508,15,700,ink,1);
  text(report.url,48,138,508,10,400,muted,1);
  rect(590,48,152,110,'#fff4f4');text(report.evidenceReview?'HTML 기본 항목 충족':'AI 참고 평가',606,60,120,11,700,muted,1);
  text(report.evidenceReview?`${report.evidenceReview.passed} / ${report.evidenceReview.assessed}개`:`${report.overallScore} / 100`,606,80,120,22,700,red,1);
  text(report.evidenceReview?'산식·원문 근거 공개':'세부 배점 미검증',606,133,120,10,400,muted,1);
  text('01  8개 영역 진단',48,178,342,15,700,ink,1);
  text('02  먼저 검토할 3개 영역',422,178,320,15,700,ink,1);
  const scores=diagnosisScores(report.diagnosis),ordered=[...scores].sort((a,b)=>a.score-b.score);
  if(report.evidenceReview){
    const review=report.evidenceReview;
    review.axes.forEach((a,i)=>{const x=48+(i%2)*174,y=211+Math.floor(i/2)*76;rect(x,y,166,68);text(a.label,x+10,y+8,146,12,700);text(a.status==='unmeasured'?'미측정':'원문 관측·검토',x+10,y+33,146,11,400,muted,1);});
    const candidates=evidencePriorities(report);
    candidates.slice(0,3).forEach((a,i)=>{const y=211+i*104;rect(422,y,320,94);text(`0${i+1}  ${a.title}`,438,y+10,288,14,700);text(a.note,438,y+37,288,11,400,muted,2);});
    text('관측된 보완 항목 → 추가 확인',422,529,320,10,400,muted,1);
  }else{
  for(const level of [100,80,60,40,20])page.shapes.push({kind:'polygon',x:48,y:210,width:342,height:310,points:scores.map((_,i)=>radarPoint(i,level,171,150,100)),color:'#dfe4eb',...(level===100?{fill:'#f8fafc'}:{})});
  page.shapes.push({kind:'polygon',x:48,y:210,width:342,height:310,points:scores.map((s,i)=>radarPoint(i,s.score,171,150,100)),color:red,fill:'#f8e1e4'});
  scores.forEach((s,i)=>{const p=radarPoint(i,100,219,360,137);rect(p.x-33,p.y-23,66,45,'#ffffff',6);text(s.short,p.x-measure(s.short,{size:10,weight:600,color:muted,lineHeight:15})/2,p.y-21,60,10,600,muted,1);text(`${s.score}점`,p.x-measure(`${s.score}점`,{size:13,weight:700,color:s.color,lineHeight:19.5})/2,p.y-4,60,13,700,s.color,1);});
  const average=String(Math.round(scores.reduce((n,s)=>n+s.score,0)/8));rect(185,335,68,52,'#ffffff',24);text(average,219-measure(average,{size:23,weight:700,color:ink,lineHeight:34.5})/2,335,60,23,700,ink,1);text('8영역 평균',219-measure('8영역 평균',{size:10,weight:400,color:muted,lineHeight:15})/2,368,68,10,400,muted,1);
  ordered.slice(0,3).forEach((s,i)=>{const y=211+i*104;rect(422,y,320,94);rect(422,y+14,3,22,s.color,1);text(`0${i+1}  ${s.label} · ${s.score}점`,438,y+10,288,14,700,ink,1);text(s.action,438,y+37,288,11,400,muted,2);});
  text('점수가 낮은 순 · 동점은 차트 표시 순서',422,529,320,10,400,muted,1);
  }
  text('03  대표 TO-BE · 사실을 채워 사용할 작성 틀',48,565,694,16,700,ink,1);
  const rewrites=buildKeywordRewrites(report.keywordFrequency,report.meta),all=[...rewrites.singles,...rewrites.phrases];
  const chosen:KeywordRewrite[]=[];
  for(const kind of ['구체화','정리','배치','유지','문맥 검토']){const plan=all.find(p=>p.kind===kind);if(plan&&chosen.length<3)chosen.push(plan);}
  for(const plan of all){if(chosen.length===3)break;if(!chosen.includes(plan))chosen.push(plan);}
  chosen.forEach((p,i)=>{const y=602+i*124;rect(48,y,694,116);text(`${p.item.keyword} · ${p.kind}`,64,y+10,662,13,700,ink,1);text(`방향  ${p.action}`,64,y+34,662,11,400,muted,2);text(`작성 틀  ${p.template}`,64,y+71,662,11,600,red,2);});
  if(!chosen.length){rect(48,602,694,116);text('저장된 반복 표현 제안이 없습니다.',64,620,662,14,700);text('단어 빈도 데이터가 수집된 보고서에서 대표 TO-BE를 표시합니다.',64,654,662,12,400,muted);}
  text(REPORT_NOTICE_SUMMARY,48,982,694,9.5,400,muted,3);
  text('대표 항목 요약 · 전체 근거는 상세 PDF / 진단 이용 안내: '+REPORT_NOTICE_URL,48,1026,694,8,400,muted,1);
  page.lines[page.lines.length-1].href=REPORT_NOTICE_URL;
  return page;
}

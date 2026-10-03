import {diagnosisScores,radarPoint} from './diagnosisVisuals';
import {buildKeywordRewrites,type KeywordRewrite} from './keywordRewrite';
import {wrapPdfText,type PdfTextStyle,type TextMeasurer} from './pdfLayout';
import type {MarketingReport} from './reportSchema';
import type {VisualPdfPage} from './reportVisualPdf';

/** A deliberately bounded, one-page brief. Full wording stays in the detailed PDF. */
export function buildReportSummaryPage(report:MarketingReport,measure:TextMeasurer):VisualPdfPage {
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
  rect(590,48,152,110,'#fff4f4');text('마케팅 종합 점수',606,60,120,11,700,muted,1);
  text(`${report.overallScore} / 100`,606,80,120,22,700,red,1);
  text('AI 인용률과 다른 지표',606,133,120,10,400,muted,1);
  text('01  8개 영역 진단',48,178,342,15,700,ink,1);
  text('02  먼저 검토할 3개 영역',422,178,320,15,700,ink,1);
  const scores=diagnosisScores(report.diagnosis),ordered=[...scores].sort((a,b)=>a.score-b.score);
  for(const level of [100,80,60,40,20])page.shapes.push({kind:'polygon',x:48,y:210,width:342,height:310,points:scores.map((_,i)=>radarPoint(i,level,171,150,100)),color:'#dfe4eb',...(level===100?{fill:'#f8fafc'}:{})});
  page.shapes.push({kind:'polygon',x:48,y:210,width:342,height:310,points:scores.map((s,i)=>radarPoint(i,s.score,171,150,100)),color:red,fill:'#f8e1e4'});
  scores.forEach((s,i)=>{const p=radarPoint(i,100,219,360,137);rect(p.x-33,p.y-23,66,45,'#ffffff',6);text(s.short,p.x-26,p.y-21,54,10,600,muted,1);text(`${s.score}점`,p.x-26,p.y-4,54,13,700,s.color,1);});
  rect(185,335,68,52,'#ffffff',24);text(String(Math.round(scores.reduce((n,s)=>n+s.score,0)/8)),201,335,46,23,700,ink,1);text('8영역 평균',191,368,59,10,400,muted,1);
  ordered.slice(0,3).forEach((s,i)=>{const y=211+i*104;rect(422,y,320,94);rect(422,y+14,3,22,s.color,1);text(`0${i+1}  ${s.label} · ${s.score}점`,438,y+10,288,14,700,ink,1);text(s.action,438,y+37,288,11,400,muted,2);});
  text('점수가 낮은 순 · 동점은 차트 표시 순서',422,529,320,10,400,muted,1);
  text('03  대표 TO-BE · 사실을 채워 사용할 작성 틀',48,565,694,16,700,ink,1);
  const rewrites=buildKeywordRewrites(report.keywordFrequency,report.meta),all=[...rewrites.singles,...rewrites.phrases];
  const chosen:KeywordRewrite[]=[];
  for(const kind of ['구체화','정리','배치','유지','문맥 검토']){const plan=all.find(p=>p.kind===kind);if(plan&&chosen.length<3)chosen.push(plan);}
  for(const plan of all){if(chosen.length===3)break;if(!chosen.includes(plan))chosen.push(plan);}
  chosen.forEach((p,i)=>{const y=602+i*128;rect(48,y,694,116);text(`${p.item.keyword} · ${p.kind}`,64,y+10,662,13,700,ink,1);text(`방향  ${p.action}`,64,y+34,662,11,400,muted,2);text(`작성 틀  ${p.template}`,64,y+71,662,11,600,red,2);});
  if(!chosen.length){rect(48,602,694,116);text('저장된 반복 표현 제안이 없습니다.',64,620,662,14,700);text('단어 빈도 데이터가 수집된 보고서에서 대표 TO-BE를 표시합니다.',64,654,662,12,400,muted);}
  text('공개 페이지 기반 자동 진단 · 실행 전 담당자 검토. 대표 항목만 담았습니다. 전체 근거와 원문은 상세 보고서에서 확인하세요.',48,1004,694,10,400,muted,2);
  return page;
}

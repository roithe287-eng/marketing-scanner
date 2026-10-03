import type {MarketingReport} from './reportSchema';
import {NAVER_CATEGORIES,NAVER_STATUS,naverCounts} from './naverKnowledge';
import {analyzeNaverOptimization} from './analyzeNaverOptimization';
import {wrapPdfText,type PdfTextStyle,type TextMeasurer} from './pdfLayout';
import type {VisualPdfPage} from './reportVisualPdf';

/** Visual index only. Complete observations, instructions and sources remain in the appendix. */
export function buildNaverVisualPage(report:MarketingReport,measure:TextMeasurer):VisualPdfPage {
  const data=report.naverOptimization||analyzeNaverOptimization(null,report.url);
  const page:VisualPdfPage={lines:[],shapes:[]};
  const colors={observed:'#34765a',action:'#b8262f',manual:'#68788c',not_applicable:'#97a1af'};
  const text=(value:string,x:number,y:number,width:number,size=13,color='#202329',weight=400)=>{
    const style:PdfTextStyle={size,color,weight,lineHeight:size*1.65};
    for(const line of wrapPdfText(value,style,measure,width)){page.lines.push({...style,text:line.text,x,y,width:measure(line.text,style)});y+=style.lineHeight;}
    return y;
  };
  const rect=(x:number,y:number,width:number,height:number,color:string,radius=10)=>page.shapes.push({kind:'rect',x,y,width,height,color,radius});
  rect(48,48,5,38,'#b9141a',2);
  text('NAVER · OPTIMIZATION GUIDE',65,46,660,11,'#606875',700);
  text('네이버 최적화 · 분야별 확인 지도',65,68,660,25,'#202329',700);
  let y=text(`공식 문서 확인 ${data.rulesReviewedAt} · ${data.mode==='guide'?'이전 보고서: 새 기준 재진단 필요':'저장된 페이지 관측 기준'}`,48,125,694,13,'#606875')+20;
  const note=data.mode==='guide'?'아래 숫자는 점검 기준의 개수이며 이 URL의 판정 결과가 아닙니다. 현재 상태는 새로 진단해 확인하세요.':'확인됨은 해당 근거를 관측했다는 뜻입니다. 계정 설정, 실제 색인·노출과 전환 수신은 별도 확인이 필요합니다.';
  const noteHeight=wrapPdfText(note,{size:13,color:'#606875',weight:400,lineHeight:21.45},measure,654).length*21.45+32;
  rect(48,y,694,noteHeight,'#f6f8fa');text(note,68,y+16,654,13,'#586271');y+=noteHeight+24;
  const rowHeight=228;
  Object.entries(NAVER_CATEGORIES).forEach(([key,title],index)=>{
    const checks=data.checks.filter(c=>c.category===key),counts=naverCounts(checks),x=48+(index%2)*355,top=y+Math.floor(index/2)*(rowHeight+16);
    rect(x,top,339,rowHeight,'#f6f8fa');
    text(`0${index+1}`,x+20,top+17,46,11,'#a4212e',700);
    text(title,x+20,top+44,299,17,'#202329',700);
    text(`${checks.length}개 점검 기준`,x+20,top+78,299,13,'#586271');
    if(data.mode==='guide') {
      rect(x+20,top+122,299,5,'#dce2e9',2);
      text('현재 판정 없음 · 재진단 후 확인',x+20,top+149,299,13,'#68788c',600);
    } else {
      let left=x+20;
      for(const state of Object.keys(counts) as (keyof typeof counts)[]) {
        const width=checks.length?299*counts[state]/checks.length:0;
        if(width>0)rect(left,top+122,width,7,colors[state],0);
        left+=width;
      }
      (Object.keys(counts) as (keyof typeof counts)[]).forEach((state,i)=>text(`${NAVER_STATUS[state]} ${counts[state]}개`,x+20+(i%2)*152,top+147+Math.floor(i/2)*28,147,12,colors[state],600));
    }
  });
  y+=2*(rowHeight+16)+8;
  y=text('수정은 이 순서로 확인하세요',48,y,694,18,'#202329',700)+16;
  const steps=[['페이지 근거','입력 URL에서 수집한 내용과 실제 페이지를 대조합니다.'],['계정 확인','서치어드바이저·광고 계정의 진단 상태를 확인합니다.'],['수정 후 재검토','상세 가이드의 완료 기준에 따라 수정 결과를 확인합니다.']];
  steps.forEach(([label,description],index)=>{
    const x=48+index*236;rect(x,y,222,135,'#f7f8fa');
    text(`0${index+1}  ${label}`,x+16,y+16,190,13,'#202329',700);
    text(description,x+16,y+50,190,12,'#586271');
  });
  text('각 항목의 전체 근거·수정 순서·완료 기준·공식 문서는 상세 보고서에 포함됩니다.',48,y+155,694,12,'#606875');
  return page;
}

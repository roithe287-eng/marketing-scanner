import type {MarketingReport} from './reportSchema';
import type {VisualPdfPage} from './reportVisualPdf';
import {wrapPdfText,type PdfTextStyle,type TextMeasurer} from './pdfLayout';

/** Bounded overview; every collected excerpt is preserved in the detailed document. */
export function buildSectorVisualPage(report:MarketingReport,measure:TextMeasurer):VisualPdfPage|null{
  const sector=report.sitePurpose?.sector;if(!sector)return null;
  const page:VisualPdfPage={lines:[],shapes:[]};
  const text=(value:string,x:number,y:number,width:number,size=13,weight=400,color='#24384f',max=3)=>{
    const style:PdfTextStyle={size,weight,color,lineHeight:size*1.55},lines=wrapPdfText(value,style,measure,width);
    lines.slice(0,max).forEach((l,i)=>{let content=l.text;
      if(i===max-1&&lines.length>max){const chars=Array.from(content);while(chars.length&&measure(chars.join('')+'…',style)>width)chars.pop();content=chars.join('')+'…';}
      page.lines.push({...style,text:content,x,y:y+i*style.lineHeight,width:measure(content,style)});
    });
  };
  const rect=(x:number,y:number,width:number,height:number,color:string)=>page.shapes.push({kind:'rect',x,y,width,height,color,radius:12});
  text('MARKETING SCANNER · YOUR INDUSTRY',48,48,694,10,700,'#526172',1);
  text(sector.label+' · 고객이 판단하는 6가지 정보',48,74,694,23,800,'#173b62',1);
  text('입력 URL에서 읽은 문구를 업종별 선택 기준과 연결했습니다. 원문 신호 관측이며 품질·성과 점수가 아닙니다.',48,117,694,12,400,'#526172',2);
  sector.journey.forEach((s,i)=>{const x=48+i*235;rect(x,169,224,57,'#edf7f5');text(`0${i+1}  ${s}`,x+12,186,200,12,700,'#234e45',2);});
  sector.checks.forEach((c,i)=>{
    const x=48+(i%2)*353,y=245+Math.floor(i/2)*220,w=341;
    rect(x,y,w,208,'#f3f7fc');text(c.label,x+14,y+12,w-28,15,750,'#1c3551',1);
    text(c.status==='observed'?'홈페이지 문구 확인':'보강 검토 · 실제 화면 대조',x+14,y+40,w-28,11,650,c.status==='observed'?'#18564d':'#795020',1);
    text(c.evidence[0]?.text||'연결할 원문을 수집하지 못했습니다. 실제 안내 화면과 대조하세요.',x+14,y+65,w-28,12,400,'#33475c',3);
    text('개선 방향',x+14,y+126,w-28,11,750,'#1f568f',1);
    text(c.guide,x+14,y+147,w-28,11.5,400,'#33475c',3);
  });
  text(`다음 행동 · ${report.sitePurpose!.goal.label}`,48,906,694,15,750,'#173b62',1);
  text(sector.caution,48,940,694,11.5,400,'#526172',3);
  text('원문 일부 발췌 · 전체 수집 근거와 검토 방법은 상세 PDF에 포함됩니다.',48,1010,694,10,400,'#526172',1);
  return page;
}

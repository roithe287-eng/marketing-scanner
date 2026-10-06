import {buildReportSummaryPage} from './reportSummaryPdf';
export type PdfScope='full'|'summary';
import {buildVisualPdfPages,type VisualPdfPage} from './reportVisualPdf';
import type { MarketingReport } from './reportSchema';
import { buildDetailedReportPdf } from './reportReadingPdf';
import { PDF_FONT, PDF_PAGE, type PdfTextStyle } from './pdfLayout';

const yieldToBrowser=()=>new Promise<void>(resolve=>setTimeout(resolve,0));

/** Prepare a browser-independent PDF result; saving is an explicit user action. */
export async function renderReportPdf(report:MarketingReport,onProgress:(text:string)=>void,canvas:HTMLCanvasElement,fontFamily=PDF_FONT,signal?:AbortSignal,scope:PdfScope='full') {
  signal?.throwIfAborted();
  onProgress(scope==='summary'?'한 장 요약을 정리 중...':'결과 차트·비교 카드·상세 안내를 정리 중...');
  const {default:JsPDF}=await import('jspdf');
  const scale=2;
  canvas.width=PDF_PAGE.width*scale;canvas.height=PDF_PAGE.height*scale;
  const ctx=canvas.getContext('2d');
  if(!ctx) throw new Error('PDF 렌더링을 시작할 수 없습니다.');
  let currentFont='';
  const setFont=(style:PdfTextStyle)=>{
    const font=`${style.weight} ${style.size}px ${fontFamily}`;
    if(currentFont!==font) {ctx.font=font;currentFont=font;}
  };
  const measure=(text:string,style:PdfTextStyle)=>{setFont(style);return ctx.measureText(text).width;};
  const summary=buildReportSummaryPage(report,measure);
  const visuals=scope==='full'?buildVisualPdfPages(report,measure):[];
  if(visuals.length)visuals[0].anchors=['visual-report-start'];
  const detail=scope==='full'?buildDetailedReportPdf(report,measure,1+visuals.length):null;
  const pages=detail?[summary,...detail.contents,...visuals,...detail.pages]:[summary];
  const anchors=new Map<string,number>();
  pages.forEach((page,index)=>page.anchors?.forEach(id=>anchors.set(id,index+1)));
  const pdf=new JsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  pdf.setProperties({title:`${report.meta?.siteName || 'Marketing Scanner'} report`,creator:'Marketing Scanner'});
  try {
    for(let i=0;i<pages.length;i++) {
      onProgress(`PDF 생성 중 ${i+1} / ${pages.length}페이지`);
      await yieldToBrowser();
      signal?.throwIfAborted();
      ctx.setTransform(scale,0,0,scale,0,0);
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,PDF_PAGE.width,PDF_PAGE.height);
      ctx.textBaseline='top';ctx.textAlign='left';
      for(const shape of (pages[i] as Partial<VisualPdfPage>).shapes||[]) {
        if(shape.kind==='rect') {ctx.fillStyle=shape.color;ctx.beginPath();ctx.roundRect(shape.x,shape.y,shape.width,shape.height,shape.radius||0);ctx.fill();}
        else if(shape.kind==='polygon') {ctx.beginPath();shape.points.forEach((p,j)=>{if(j===0)ctx.moveTo(shape.x+p.x,shape.y+p.y);else ctx.lineTo(shape.x+p.x,shape.y+p.y);});ctx.closePath();if(shape.fill){ctx.fillStyle=shape.fill;ctx.fill();}ctx.strokeStyle=shape.color;ctx.lineWidth=1.5;ctx.stroke();}
        else {const radius=shape.size/2-7,cx=shape.x+shape.size/2,cy=shape.y+shape.size/2;ctx.lineWidth=8;ctx.strokeStyle='#dfe4ec';ctx.beginPath();ctx.arc(cx,cy,radius,0,2*Math.PI);ctx.stroke();if(shape.value!==null&&shape.value>0){ctx.strokeStyle=shape.color;ctx.beginPath();ctx.arc(cx,cy,radius,-Math.PI/2,-Math.PI/2+2*Math.PI*shape.value/100);ctx.stroke();}}
      }
      for(const line of pages[i].lines) {
        setFont(line);ctx.fillStyle=line.color;
        const top=line.y+(line.lineHeight-line.size)/2;
        ctx.fillText(line.text,line.x,top);
        if((line.href||line.targetId) && line.width) {
          ctx.strokeStyle=line.color;ctx.lineWidth=0.5;ctx.beginPath();
          ctx.moveTo(line.x,top+line.size+2);ctx.lineTo(line.x+line.width,top+line.size+2);ctx.stroke();
        }
      }
      const footerTop=PDF_PAGE.height-49;
      ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(PDF_PAGE.padding,footerTop);ctx.lineTo(PDF_PAGE.width-PDF_PAGE.padding,footerTop);ctx.stroke();
      setFont({size:11,weight:400,color:'#6b7280',lineHeight:18});ctx.fillStyle='#6b7280';
      ctx.fillText(`진짜마케팅 · 마케팅스캐너     ${i+1} / ${pages.length}`,PDF_PAGE.padding,footerTop+9);
      if(detail&&i>0){ctx.fillStyle='#2442b5';ctx.fillText('목차로 이동',PDF_PAGE.width-PDF_PAGE.padding-64,footerTop+9);}
      if(i>0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg',0.92),'JPEG',0,0,210,297,undefined,'FAST');
      for(const line of pages[i].lines) if((line.href||line.targetId) && line.width) {
        const targetPage=line.targetId?anchors.get(line.targetId):undefined;
        if(line.href||targetPage)pdf.link(line.x*210/PDF_PAGE.width,line.y*297/PDF_PAGE.height,line.width*210/PDF_PAGE.width,line.lineHeight*297/PDF_PAGE.height,line.href?{url:line.href}:{pageNumber:targetPage!,top:0});
      }
      if(detail&&i>0)pdf.link((PDF_PAGE.width-PDF_PAGE.padding-70)*210/PDF_PAGE.width,(footerTop+5)*297/PDF_PAGE.height,23,7,{pageNumber:anchors.get('report-contents')!,top:0});
    }
    let domain='website';
    try {domain=new URL(report.url).hostname.replace(/[^a-zA-Z0-9-]/g,'_');} catch { /* Older snapshots may contain a bare domain. */ }
    signal?.throwIfAborted();
    return {pages:pages.length,blob:pdf.output('blob'),filename:`마케팅스캐너_${scope==='summary'?'한장요약_':''}${domain}_${new Date().toISOString().slice(0,10)}.pdf`};
  } finally {canvas.width=1;canvas.height=1;}
}

/** Draw the complete snapshot directly, without cloning or capturing the app DOM. */
export async function exportReportPdf(report:MarketingReport,onProgress:(text:string)=>void,signal?:AbortSignal,scope:PdfScope='full') {
  await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,2500))]);
  signal?.throwIfAborted();
  return renderReportPdf(report,onProgress,document.createElement('canvas'),getComputedStyle(document.body).fontFamily||PDF_FONT,signal,scope);
}

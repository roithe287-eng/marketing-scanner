import type { MarketingReport } from './reportSchema';
import { buildReportDocument } from './reportDocument';
import { layoutPdfPages, PDF_FONT, PDF_PAGE, type PdfTextStyle } from './pdfLayout';

const yieldToBrowser=()=>new Promise<void>(resolve=>setTimeout(resolve,0));

/** Draw the complete snapshot directly, without cloning or capturing the app DOM. */
export async function exportReportPdf(report:MarketingReport,onProgress:(text:string)=>void) {
  onProgress('전체 상세 내용을 페이지별로 정리 중...');
  const {default:JsPDF}=await import('jspdf');
  await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,2500))]);
  const fontFamily=getComputedStyle(document.body).fontFamily || PDF_FONT;
  const canvas=document.createElement('canvas');
  const scale=2;
  canvas.width=PDF_PAGE.width*scale;canvas.height=PDF_PAGE.height*scale;
  const ctx=canvas.getContext('2d');
  if(!ctx) throw new Error('PDF 렌더링을 시작할 수 없습니다.');
  let currentFont='';
  const setFont=(style:PdfTextStyle)=>{
    const font=`${style.weight} ${style.size}px ${fontFamily}`;
    if(currentFont!==font) {ctx.font=font;currentFont=font;}
  };
  const pages=layoutPdfPages(buildReportDocument(report),(text,style)=>{setFont(style);return ctx.measureText(text).width;});
  const pdf=new JsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  pdf.setProperties({title:`${report.meta?.siteName || 'Marketing Scanner'} report`,creator:'Marketing Scanner'});
  try {
    for(let i=0;i<pages.length;i++) {
      onProgress(`PDF 생성 중 ${i+1} / ${pages.length}페이지`);
      await yieldToBrowser();
      ctx.setTransform(scale,0,0,scale,0,0);
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,PDF_PAGE.width,PDF_PAGE.height);
      ctx.textBaseline='top';ctx.textAlign='left';
      for(const line of pages[i].lines) {
        setFont(line);ctx.fillStyle=line.color;
        const top=line.y+(line.lineHeight-line.size)/2;
        ctx.fillText(line.text,line.x,top);
        if(line.href && line.width) {
          ctx.strokeStyle=line.color;ctx.lineWidth=0.5;ctx.beginPath();
          ctx.moveTo(line.x,top+line.size+2);ctx.lineTo(line.x+line.width,top+line.size+2);ctx.stroke();
        }
      }
      const footerTop=PDF_PAGE.height-49;
      ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(PDF_PAGE.padding,footerTop);ctx.lineTo(PDF_PAGE.width-PDF_PAGE.padding,footerTop);ctx.stroke();
      setFont({size:11,weight:400,color:'#6b7280',lineHeight:18});ctx.fillStyle='#6b7280';
      ctx.fillText(`진짜마케팅 · 마케팅스캐너     ${i+1} / ${pages.length}`,PDF_PAGE.padding,footerTop+9);
      if(i>0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg',0.92),'JPEG',0,0,210,297,undefined,'FAST');
      for(const line of pages[i].lines) if(line.href && line.width) {
        pdf.link(line.x*210/PDF_PAGE.width,line.y*297/PDF_PAGE.height,line.width*210/PDF_PAGE.width,line.lineHeight*297/PDF_PAGE.height,{url:line.href});
      }
    }
    let domain='website';
    try {domain=new URL(report.url).hostname.replace(/[^a-zA-Z0-9-]/g,'_');} catch { /* Older snapshots may contain a bare domain. */ }
    await pdf.save(`마케팅스캐너_${domain}_${new Date().toISOString().slice(0,10)}.pdf`,{returnPromise:true});
    return {pages:pages.length};
  } finally {canvas.width=1;canvas.height=1;}
}

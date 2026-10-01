import type { MarketingReport } from './reportSchema';
import { buildReportDocument, type ReportBlock } from './reportDocument';

const PAGE_WIDTH=794, PAGE_HEIGHT=1123, PADDING=48, BODY_HEIGHT=PAGE_HEIGHT-PADDING*2-36;
const nextPaint = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/** Paginate actual laid-out paragraphs before capture. Never slice a full-report bitmap. */
export async function exportReportPdf(report:MarketingReport,onProgress:(text:string)=>void) {
  const [{default:html2canvas},{default:JsPDF}] = await Promise.all([import('html2canvas'),import('jspdf')]);
  await Promise.race([document.fonts.ready,new Promise(resolve => setTimeout(resolve,2500))]);
  const host=document.createElement('div');
  host.id='report-pdf-export';
  host.setAttribute('aria-hidden','true');
  Object.assign(host.style,{position:'absolute',left:'-10000px',top:'0',width:`${PAGE_WIDTH}px`,background:'#fff',color:'#111827',fontFamily:'Pretendard, "Noto Sans CJK KR", Arial, sans-serif',fontSize:'14px',lineHeight:'1.65'});
  document.body.appendChild(host);
  const pages:HTMLElement[]=[];
  let page!:HTMLElement, content!:HTMLElement;
  const newPage=()=>{
    page=document.createElement('div');
    Object.assign(page.style,{position:'relative',boxSizing:'border-box',width:`${PAGE_WIDTH}px`,height:`${PAGE_HEIGHT}px`,padding:`${PADDING}px`,background:'#fff'});
    content=document.createElement('div');content.style.display='flow-root';page.appendChild(content);host.appendChild(page);pages.push(page);
  };
  const elementFor=(block:ReportBlock)=>{
    const el=document.createElement(block.href?'a':'p');
    el.textContent=block.text;
    Object.assign(el.style,{display:'block',margin:'0 0 9px',overflowWrap:'anywhere',wordBreak:'normal',whiteSpace:'pre-wrap',fontSize:block.kind==='title'?'27px':block.kind==='heading'?'21px':block.kind==='subheading'?'15px':'14px',fontWeight:block.kind==='body'?'400':'700',lineHeight:'1.65',color:block.kind==='heading'?'#c51620':block.href?'#1d4ed8':'#111827',paddingTop:block.kind==='heading'?'14px':block.kind==='subheading'?'7px':'0',textDecoration:block.href?'underline':'none'});
    if(block.href) (el as HTMLAnchorElement).href=block.href;
    return el;
  };
  const fits=()=>content.getBoundingClientRect().height<=BODY_HEIGHT;
  try {
    newPage();
    onProgress('전체 상세 내용을 페이지별로 정리 중...');
    const queue=buildReportDocument(report);
    for(let index=0;index<queue.length;index++) {
      const block=queue[index];let el=elementFor(block);content.appendChild(el);
      // Keep headings with at least the first few lines of their following paragraph.
      if((!fits() || (block.kind!=='body' && content.getBoundingClientRect().height>BODY_HEIGHT-70)) && content.children.length>1) {
        el.remove();newPage();content.appendChild(el);
      }
      if(!fits()) {
        // A single long paragraph: find a text boundary that fits, retaining every character.
        const characters=Array.from(block.text);
        let lo=1,hi=characters.length;
        while(lo<hi) {const mid=Math.ceil((lo+hi)/2);el.textContent=characters.slice(0,mid).join('');if(fits())lo=mid;else hi=mid-1;}
        const prefix=characters.slice(0,lo).join('');
        const boundary=Math.max(prefix.lastIndexOf('\n'),prefix.lastIndexOf(' '));
        const take=boundary>prefix.length*0.65?Array.from(prefix.slice(0,boundary+1)).length:lo;
        el.textContent=characters.slice(0,take).join('');
        queue.splice(index+1,0,{...block,kind:'body',text:characters.slice(take).join('')});
      }
      if(index%35===0) await nextPaint();
    }
    const pdf=new JsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    pdf.setProperties({title:`${report.meta?.siteName || 'Marketing Scanner'} report`,creator:'Marketing Scanner'});
    for(let i=0;i<pages.length;i++) {
      const current=pages[i];
      const pageRect=current.getBoundingClientRect();
      const bodyRect=current.firstElementChild!.getBoundingClientRect();
      if (bodyRect.bottom > pageRect.top + PADDING + BODY_HEIGHT + 0.5 || current.scrollWidth > PAGE_WIDTH) {
        throw new Error('PDF 페이지 범위를 초과한 내용이 있습니다.');
      }
      const footer=document.createElement('div');
      footer.textContent=`진짜마케팅 · 마케팅스캐너     ${i+1} / ${pages.length}`;
      Object.assign(footer.style,{position:'absolute',bottom:'24px',left:`${PADDING}px`,right:`${PADDING}px`,fontSize:'11px',color:'#6b7280',borderTop:'1px solid #e5e7eb',paddingTop:'8px'});current.appendChild(footer);
      onProgress(`PDF 생성 중 ${i+1} / ${pages.length}페이지`);await nextPaint();
      const canvas=await html2canvas(current,{scale:1.6,backgroundColor:'#ffffff',logging:false,width:PAGE_WIDTH,height:PAGE_HEIGHT,windowWidth:PAGE_WIDTH,scrollX:0,scrollY:0,useCORS:true,allowTaint:false});
      if(i>0)pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg',0.92),'JPEG',0,0,210,297,undefined,'FAST');
      const box=current.getBoundingClientRect();
      for(const anchor of Array.from(current.querySelectorAll('a'))) {
        const rect=anchor.getBoundingClientRect();
        pdf.link((rect.left-box.left)*210/PAGE_WIDTH,(rect.top-box.top)*297/PAGE_HEIGHT,rect.width*210/PAGE_WIDTH,rect.height*297/PAGE_HEIGHT,{url:anchor.href});
      }
      canvas.width=1;canvas.height=1;
    }
    const domain=new URL(report.url).hostname.replace(/[^a-zA-Z0-9-]/g,'_');
    pdf.save(`마케팅스캐너_${domain}_${new Date().toISOString().slice(0,10)}.pdf`);
    return {pages:pages.length};
  } finally {host.remove();}
}

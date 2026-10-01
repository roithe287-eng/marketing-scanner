import type { ReportBlock } from './reportDocument';

export const PDF_PAGE = { width:794, height:1123, padding:48, contentBottom:1039, contentWidth:694 };
export const PDF_FONT = 'Pretendard, "Noto Sans CJK KR", Arial, sans-serif';
export type PdfTextStyle = { size:number; weight:number; color:string; lineHeight:number };
export type PdfLine = PdfTextStyle & { text:string; x:number; y:number; width:number; href?:string };
export type PdfPage = { lines:PdfLine[] };
export type TextMeasurer = (text:string, style:PdfTextStyle) => number;
export type WrappedLine = { text:string; newlineAfter:boolean };

function styleFor(block:ReportBlock):PdfTextStyle {
  const size=block.kind==='title'?27:block.kind==='heading'?21:block.kind==='subheading'?15:14;
  return {size,weight:block.kind==='body'?400:700,color:block.kind==='heading'?'#c51620':block.href?'#1d4ed8':'#111827',lineHeight:size*1.65};
}

/** Retain whitespace, surrogate pairs and combined emoji at every line boundary. */
export function wrapPdfText(text:string,style:PdfTextStyle,measure:TextMeasurer,width=PDF_PAGE.contentWidth):WrappedLine[] {
  const lines:WrappedLine[]=[];
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('ko',{granularity:'grapheme'}):null;
  const paragraphs=text.split('\n');
  paragraphs.forEach((paragraph,paragraphIndex)=>{
    const parts=segmenter?Array.from(segmenter.segment(paragraph),part=>part.segment):Array.from(paragraph);
    if (!parts.length) lines.push({text:'',newlineAfter:paragraphIndex<paragraphs.length-1});
    for(let offset=0;offset<parts.length;) {
      const remaining=parts.length-offset;
      let high=Math.min(128,remaining);
      while(high<remaining && measure(parts.slice(offset,offset+high).join(''),style)<=width) high=Math.min(high*2,remaining);
      let low=0;
      while(low<high) {
        const mid=Math.ceil((low+high)/2);
        if(measure(parts.slice(offset,offset+mid).join(''),style)<=width) low=mid; else high=mid-1;
      }
      if(!low) throw new Error('PDF의 한 글자가 본문 너비를 초과했습니다.');
      let take=low;
      if(offset+low<parts.length) {
        for(let i=low-1;i>=Math.floor(low*0.6);i--) {
          if(/\s/.test(parts[offset+i])) {take=i+1;break;}
        }
      }
      const end=offset+take;
      lines.push({text:parts.slice(offset,end).join(''),newlineAfter:end===parts.length && paragraphIndex<paragraphs.length-1});
      offset=end;
    }
  });
  return lines;
}

/** Place measured lines before drawing. Long paragraphs continue on the next page. */
export function layoutPdfPages(blocks:ReportBlock[],measure:TextMeasurer):PdfPage[] {
  const prepared=blocks.map(block=>{
    const style=styleFor(block);
    return {block,style,lines:wrapPdfText(block.text,style,measure),before:block.kind==='heading'?14:block.kind==='subheading'?7:0};
  });
  const pages:PdfPage[]=[{lines:[]}];
  let page=pages[0],y=PDF_PAGE.padding;
  const nextPage=()=>{page={lines:[]};pages.push(page);y=PDF_PAGE.padding;};
  const available=PDF_PAGE.contentBottom-PDF_PAGE.padding;
  prepared.forEach((item,index)=>{
    const {block,style,lines,before}=item;
    const height=before+lines.length*style.lineHeight;
    const next=prepared[index+1];
    const following=block.kind!=='body' && next ? next.before+Math.min(next.lines.length,2)*next.style.lineHeight+9 : 0;
    if(page.lines.length && ((height<=available && y+height>PDF_PAGE.contentBottom) || (following && y+Math.min(height+following,available)>PDF_PAGE.contentBottom))) nextPage();
    y+=before;
    for(const line of lines) {
      if(y+style.lineHeight>PDF_PAGE.contentBottom+0.01) nextPage();
      const width=measure(line.text,style);
      if(width>PDF_PAGE.contentWidth+0.01) throw new Error('PDF 본문 너비를 초과한 내용이 있습니다.');
      page.lines.push({...style,text:line.text,x:PDF_PAGE.padding,y,width,href:block.href});
      y+=style.lineHeight;
    }
    y+=9;
  });
  return pages;
}

import { buildReportDocument, type ReportBlock } from './reportDocument';
import type { MarketingReport } from './reportSchema';
import { PDF_PAGE, wrapPdfText, type PdfTextStyle, type TextMeasurer } from './pdfLayout';
import type { VisualPdfPage } from './reportVisualPdf';

export type ReadingBlock = ReportBlock & { sourceId?:number; anchor?:string; targetId?:string; originalText?:string; references?:{id:string;label:string}[] };
export type ReadingSection = { id:string; title:string; group:string; blocks:ReadingBlock[] };
const C={ink:'#17233b',muted:'#59677c',blue:'#2442b5',line:'#dce3ec',soft:'#f5f7fb',pale:'#eef3ff',white:'#ffffff'};
const body:PdfTextStyle={size:14,weight:400,color:C.ink,lineHeight:22};
const label:PdfTextStyle={size:12.5,weight:700,color:C.muted,lineHeight:20};
const heading:PdfTextStyle={size:22,weight:700,color:C.ink,lineHeight:31};
const small:PdfTextStyle={size:11,weight:400,color:C.muted,lineHeight:17};
const X=PDF_PAGE.padding,W=PDF_PAGE.contentWidth,BOTTOM=PDF_PAGE.contentBottom;
const identity=(b:ReportBlock)=>JSON.stringify([b.text,b.href||'']);
function commonName(block:ReportBlock){
  if(block.href)return '공식 출처';
  const prefix=block.text.split(':')[0];
  const names:Record<string,string>={'기대효과 · 조건부':'기대효과','효과 한계':'한계','편집 경로':'편집 경로','공식 근거의 원리':'작동 원리','확인 지표':'확인 지표','대상 페이지와 원문 확인':'원문 확인','수정할 편집 항목 열기':'편집 항목','제안 적용 범위 정하기':'적용 범위','미리보기 후 게시·재검사':'게시·검사','기대효과를 실제 데이터로 확인':'효과 검증'};
  return names[prefix]||'편집 안내';
}

function groupFor(title:string) {
  if(/이용 안내|근거와 검증 범위|집계 범위|목표 CPA|숫자 3개/.test(title))return '04  참고·측정 기준';
  if(/가이드북|공통 편집 안내/.test(title))return '03  원문 위치·편집 안내';
  if(/GEO 질문·답변|콘텐츠 발견성|핵심 개선 이슈|진단 체크리스트|이전·현재 비교/.test(title))return '01  진단 결과·확인 근거';
  if(/가이드|TO-BE|과제|할 일|보완 목록|실행 보드|개선 전·후|수정 위치|로드맵|카피 개선|키워드 연결 기회|다음 단계/.test(title))return '02  수정안·실행 계획';
  return '01  진단 결과·확인 근거';
}

/** Exact repeated instructions are printed once. All unique source wording survives. */
export function buildReadingSections(report:MarketingReport):ReadingSection[] {
  const sections:ReadingSection[]=[];
  let section:ReadingSection={id:'report-details',title:'분석 대상과 결과',group:'01  진단 결과·확인 근거',blocks:[]};
  sections.push(section);
  buildReportDocument(report).forEach((block,sourceId)=>{
    if(block.kind==='heading'){
      section={id:'detail-'+sourceId,title:block.text,group:groupFor(block.text),blocks:[]};sections.push(section);
    }
    section.blocks.push({...block,sourceId});
  });
  const guide=sections.find(s=>s.title.startsWith('URL 맞춤 편집 가이드북'));
  if(guide){
    const counts=new Map<string,number>();
    for(const block of guide.blocks)if(block.kind==='body')counts.set(identity(block),(counts.get(identity(block))||0)+1);
    const common=new Map<string,{id:string;label:string;block:ReadingBlock}>();
    const qualifies=(b:ReadingBlock)=>b.kind==='body'&&(counts.get(identity(b))||0)>1&&(
      !!b.href||/^(기대효과 · 조건부:|효과 한계:|편집 경로:|공식 근거의 원리:|확인 지표:|대상 페이지와 원문 확인:|수정할 편집 항목 열기:|제안 적용 범위 정하기:|미리보기 후 게시·재검사:|기대효과를 실제 데이터로 확인:|제작 도구 미확인|편집 도구 미확인|제작 도구가 확인되지|HTML을 직접 관리한다면|아래 선택자는 공개 HTML의 위치)/.test(b.text)
    );
    const rewritten:ReadingBlock[]=[];let refs=new Map<string,{id:string;label:string}>();
    const flush=()=>{if(refs.size){const references=[...refs.values()];rewritten.push({kind:'body',text:'공통 안내: '+references.map(r=>r.label).join(' · '),references});refs=new Map();}};
    for(const block of guide.blocks){
      if(block.kind!=='body')flush();
      if(!qualifies(block)){rewritten.push(block);continue;}
      const key=identity(block);let shared=common.get(key);
      if(!shared){const n=common.size+1;shared={id:'guide-common-'+n,label:commonName(block)+' G'+String(n).padStart(2,'0'),block};common.set(key,shared);}
      refs.set(shared.id,{id:shared.id,label:shared.label});
    }
    flush();guide.blocks=rewritten;
    if(common.size){
      const shared:ReadingSection={id:'common-editing-guide',title:'공통 편집 안내·공식 출처',group:'03  원문 위치·편집 안내',blocks:[
        {kind:'heading',text:'공통 편집 안내·공식 출처'},
        {kind:'body',text:'여러 항목에 반복되던 동일한 절차와 공식 출처를 한곳에 모았습니다. 각 항목의 G 번호를 누르면 해당 안내로 이동합니다. 원문과 수정안은 각 항목에 그대로 남겨 두었습니다.'},
      ]};
      for(const c of common.values())shared.blocks.push({kind:'subheading',text:c.label,anchor:c.id},{...c.block});
      sections.splice(sections.indexOf(guide)+1,0,shared);
    }
  }
  // Keep analysis results ahead of lengthy instructions; order within each part is stable.
  sections.sort((a,b)=>a.group.localeCompare(b.group));
  const repeated=new Map<string,{id:string;label:string}>();
  for(const s of sections){
    if(s.id==='common-editing-guide')continue;
    let item=s.title;
    for(const b of s.blocks){
      if(b.kind==='subheading')item=b.text;
      if(b.kind!=='body'||b.href||b.references)continue;
      const f=field(b),value=(f?.value||b.text).trim();
      if(value.length<180)continue;
      const known=repeated.get(value);
      if(known){b.originalText=b.text;b.text=(f?.label?f.label+' ':'')+'동일한 내용 → '+known.label;b.targetId=known.id;}
      else {const id='detail-source-'+b.sourceId;b.anchor=id;repeated.set(value,{id,label:item+(f?' · '+f.label.replace(/[:：]$/,''):'')});}
    }
  }
  return sections;
}

function field(block:ReadingBlock) {
  if(block.kind!=='body'||block.href||block.references)return null;
  const m=block.text.match(/^([^\n:：]{1,32}[:：])([\s\S]*)$/);
  if(!m||/^https?$/i.test(m[1].slice(0,-1)))return null;
  return {label:m[1],value:m[2]};
}
function comparison(a:ReadingBlock,b?:ReadingBlock) {
  const before=field(a),after=b&&field(b);
  if(!before||!after)return null;
  const left=before.label.slice(0,-1),right=after.label.slice(0,-1);
  if((/^(현재|현재 예시|개선 전|AS-IS)$/.test(left)&&/^(제안·작성 틀|개선 예시|개선 후|TO-BE)$/.test(right))||(left==='이전'&&right==='현재'))return {before,after};
  return null;
}

/** Structured detail pages: measured fields, literal before/after cards, linked common notes. */
export function buildReadingPdfPages(sections:ReadingSection[],measure:TextMeasurer):VisualPdfPage[] {
  const pages:VisualPdfPage[]=[];let page!:VisualPdfPage,y=0,current!:ReadingSection;
  const lines=(text:string,style=body,width=W)=>wrapPdfText(text,style,measure,width);
  function rect(x:number,top:number,width:number,height:number,color:string,radius=0){page.shapes.push({kind:'rect',x,y:top,width,height,color,radius});}
  function text(value:string,x:number,top:number,width:number,style:PdfTextStyle,block?:ReadingBlock,targetId?:string){
    for(const row of lines(value,style,width)){page.lines.push({...style,text:row.text,x,y:top,width:measure(row.text,style),href:block?.href,sourceId:block?.sourceId,targetId:targetId||block?.targetId});top+=style.lineHeight;}return top;
  }
  function newPage(){
    page={lines:[],shapes:[],anchors:[],title:current.title};pages.push(page);
    rect(X,48,4,25,C.blue,2);
    text('MARKETING SCANNER  /  '+current.group,X+14,47,W-14,small);
    const titleEnd=text(current.title,X,82,W,heading);
    rect(X,titleEnd+12,W,1,C.line);y=titleEnd+30;
  }
  function ensure(height:number){if(y+height>BOTTOM)newPage();}
  function mark(block:ReadingBlock){if(block.anchor)page.anchors!.push(block.anchor);}
  function renderReferences(block:ReadingBlock){
    const refs=block.references!;const gap=8;let x=X,top=y;
    ensure(66);top=y;
    text('공통 안내',x,top,W,label);x+=66;
    for(const r of refs){
      const width=measure(r.label,label)+20;
      if(x+width>X+W){x=X+66;top+=29;}
      if(top+26>BOTTOM){newPage();top=y;x=X+66;text('공통 안내 · 계속',X,top,120,small);x=X+130;}
      rect(x,top,width,24,C.pale,5);text(r.label,x+10,top+2,width-20,{...label,color:C.blue},undefined,r.id);x+=width+gap;
    }
    y=top+36;
  }
  function renderField(block:ReadingBlock,f:NonNullable<ReturnType<typeof field>>){
    const labelWidth=106,valueWidth=W-labelWidth-28;
    const left=lines(f.label,label,labelWidth-20),right=lines(f.value,body,valueWidth);
    if(right.length>7||left.length>2){
      const wrapped=lines(f.value,body,W-28);const total=wrapped.length*body.lineHeight+42;
      if(total<=620)ensure(total+5);else ensure(110);
      mark(block);let offset=0,first=true;
      while(offset<wrapped.length){
        const count=Math.min(wrapped.length-offset,Math.floor((BOTTOM-y-42)/body.lineHeight));
        if(count<1){newPage();continue;}
        const part=wrapped.slice(offset,offset+count),h=part.length*body.lineHeight+42;
        rect(X,y,W,h,C.soft,6);
        text(first?f.label:'이어서',X+14,y+8,W-28,label,first?block:undefined);
        let top=y+31;for(const row of part){page.lines.push({...body,color:block.targetId?C.blue:body.color,text:row.text,x:X+14,y:top,width:measure(row.text,body),sourceId:block.sourceId,targetId:block.targetId});top+=body.lineHeight;}
        y+=h+5;offset+=count;first=false;if(offset<wrapped.length)newPage();
      }
      return;
    }
    const fullHeight=Math.max(left.length*label.lineHeight,right.length*body.lineHeight)+12;
    if(fullHeight<=620)ensure(fullHeight+3);else ensure(115);
    mark(block);let offset=0,first=true;
    do{
      const remaining=BOTTOM-y-12;
      if(remaining<body.lineHeight){newPage();continue;}
      const count=Math.min(right.length-offset,Math.floor(remaining/body.lineHeight));
      const part=right.slice(offset,offset+count);
      const h=Math.max((first?left.length:1)*label.lineHeight,part.length*body.lineHeight)+12;
      rect(X,y,W,h,C.soft,4);rect(X+labelWidth,y+6,1,h-12,C.line);
      if(first)text(f.label,X+10,y+6,labelWidth-20,label,block);
      else text('이어서',X+10,y+6,labelWidth-20,small);
      let top=y+6;for(const row of part){page.lines.push({...body,color:block.targetId?C.blue:body.color,text:row.text,x:X+labelWidth+14,y:top,width:measure(row.text,body),sourceId:block.sourceId,targetId:block.targetId});top+=body.lineHeight;}
      y+=h+3;offset+=count;first=false;
      if(offset<right.length)newPage();
    }while(offset<right.length);
  }
  function renderText(block:ReadingBlock){
    const isTitle=block.kind==='title',isSub=block.kind==='subheading';
    const style=isTitle?{...heading,size:24,lineHeight:34}:isSub?{...body,size:16,weight:700,lineHeight:25}:block.href?{...body,size:12.5,lineHeight:20,color:C.blue}:body;
    const wrapped=lines(block.text,style,W-(isSub?24:0));
    const total=wrapped.length*style.lineHeight+(isSub?22:8);
    if(isSub||isTitle)ensure(Math.min(total+80,700));else if(total<460)ensure(total);else ensure(88);
    mark(block);
    if(isSub){y+=8;rect(X,y,3,wrapped.length*style.lineHeight,C.blue,1);}
    for(const row of wrapped){
      if(y+style.lineHeight>BOTTOM)newPage();
      page.lines.push({...style,color:block.targetId?C.blue:style.color,text:row.text,x:X+(isSub?12:0),y,width:measure(row.text,style),href:block.href,sourceId:block.sourceId,targetId:block.targetId});y+=style.lineHeight;
    }
    y+=isSub?14:9;
  }
  function bodyStartHeight(block:ReadingBlock,next?:ReadingBlock){
    if(block.references)return 66;
    const pair=comparison(block,next);
    if(pair){const width=(W-16)/2-28,h=Math.max(lines(pair.before.value,body,width).length,lines(pair.after.value,body,width).length)*body.lineHeight+58;if(h<=460)return h+16;}
    const f=field(block);
    if(f){const left=lines(f.label,label,86),right=lines(f.value,body,W-134);let h=Math.max(left.length*label.lineHeight,right.length*body.lineHeight)+15;
      if(right.length>7||left.length>2)h=lines(f.value,body,W-28).length*body.lineHeight+47;
      return h<=625?h:115;
    }
    const s=block.href?{...body,size:12.5,lineHeight:20}:body,h=lines(block.text,s,W).length*s.lineHeight+9;
    return h<460?h:88;
  }
  function followingHeight(blocks:ReadingBlock[],index:number){
    let height=0;
    for(let j=index;j<blocks.length;j++){
      const b=blocks[j];if(b.kind==='heading')continue;
      if(b.kind==='subheading'){height+=lines(b.text,{...body,size:16,weight:700,lineHeight:25},W-24).length*25+22;continue;}
      height+=bodyStartHeight(b,blocks[j+1]);break;
    }
    return Math.min(height,740);
  }
  for(const section of sections){
    const sameGroup=current?.group===section.group;current=section;
    const opening=Math.max(200,lines(section.title,heading).length*heading.lineHeight+59+(section.title==='영역별 점수'?220:followingHeight(section.blocks,0)));
    if(!page||!sameGroup||y+opening>BOTTOM)newPage();
    else{
      y+=22;rect(X,y,W,1,C.line);y+=17;
      y=text(section.title,X,y,W,heading)+20;
    }
    page.anchors!.push(section.id);
    if(section.title==='영역별 점수'){
      const values=section.blocks.filter(b=>b.kind==='body').map(b=>({b,f:field(b)}));
      if(values.length===8&&values.every(({f})=>f&&/^\s*\d{1,3}\s*$/.test(f.value)&&Number(f.value)<=100)){
        ensure(220);const top=y;
        values.forEach(({b,f},i)=>{const width=(W-36)/4,x=X+(width+12)*(i%4),rowY=top+Math.floor(i/4)*100;
          rect(x,rowY,width,88,C.soft,8);text(f!.label,x+12,rowY+10,width-24,label,b);
          text(f!.value,x+12,rowY+33,width-24,{...body,size:23,weight:700,lineHeight:31,color:C.blue},b);
          rect(x+12,rowY+73,width-24,4,C.line,2);if(Number(f!.value)>0)rect(x+12,rowY+73,(width-24)*Number(f!.value)/100,4,C.blue,2);
        });y=top+210;continue;
      }
    }
    for(let i=0;i<section.blocks.length;i++){
      const block=section.blocks[i];
      if(block.kind==='heading')continue; // Literal section heading is printed in the running title.
      if(block.kind==='subheading')ensure(followingHeight(section.blocks,i));
      if(block.references){renderReferences(block);continue;}
      const pair=comparison(block,section.blocks[i+1]);
      if(pair){
        const next=section.blocks[i+1],width=(W-16)/2,inner=width-28;
        const a=lines(pair.before.value,body,inner),b=lines(pair.after.value,body,inner);
        const h=Math.max(a.length,b.length)*body.lineHeight+58;
        // Very long comparisons use full-width fields, retaining every line without tiny text.
        if(h<=460){
          ensure(h+16);mark(block);mark(next);
          for(const [n,value,rows,source] of [[0,pair.before,a,block],[1,pair.after,b,next]] as const){
            const x=X+n*(width+16);rect(x,y,width,h,C.line,8);rect(x+1,y+1,width-2,h-2,n?C.pale:C.white,7);
            text(value.label,x+14,y+12,inner,{...label,color:n?C.blue:C.muted},source);
            let top=y+42;for(const row of rows){page.lines.push({...body,color:source.targetId?C.blue:body.color,text:row.text,x:x+14,y:top,width:measure(row.text,body),sourceId:source.sourceId,targetId:source.targetId});top+=body.lineHeight;}
          }
          y+=h+14;i++;continue;
        }
      }
      const f=field(block);if(f)renderField(block,f);else renderText(block);
    }
  }
  return pages;
}

/** Clickable directory; page numbers include all visual and directory pages. */
export function buildReadingContents(sections:ReadingSection[],details:VisualPdfPage[],measure:TextMeasurer,prefixPages:number):VisualPdfPage[] {
  const offsets=new Map<string,number>();details.forEach((p,i)=>p.anchors?.forEach(id=>offsets.set(id,i)));
  const create=(directoryCount:number)=>{
    const pages:VisualPdfPage[]=[];let page!:VisualPdfPage,y=0,column=0,part='';
    const style:PdfTextStyle={size:12.5,weight:400,color:C.ink,lineHeight:20};
    function text(value:string,x:number,top:number,width:number,s:PdfTextStyle,targetId?:string){for(const row of wrapPdfText(value,s,measure,width)){page.lines.push({...s,text:row.text,x,y:top,width:measure(row.text,s),targetId});top+=s.lineHeight;}return top;}
    function newPage(){page={lines:[],shapes:[],title:'보고서 목차',anchors:pages.length?[]:['report-contents']};pages.push(page);column=0;part='';
      text('RESULTS → ACTIONS → EVIDENCE',48,48,694,small);text('보고서 읽는 순서',48,77,694,{...heading,size:27,lineHeight:38});
      text('결과를 먼저 확인하고, 필요한 수정안과 원문 위치로 이동하세요. 제목·쪽 번호를 누르면 해당 내용이 열립니다.',48,126,694,small);
      text(`차트와 인포그래픽  ${directoryCount+2}–${directoryCount+prefixPages}쪽`,48,166,694,{...small,weight:700,color:C.blue},'visual-report-start');y=207;}
    newPage();
    for(const section of sections){
      const textWidth=285,wrapped=wrapPdfText(section.title,style,measure,textWidth);
      const newGroup=section.group!==part,needed=wrapped.length*20+19+(newGroup?40:0);
      if(y+needed>1013){if(column===0){column=1;y=207;part='';}else newPage();}
      const x=X+column*357;
      if(section.group!==part){y+=12;page.shapes.push({kind:'rect',x,y,width:337,height:26,color:C.pale,radius:5});text(section.group,x+8,y+4,321,{...small,weight:700,color:C.blue});y+=38;part=section.group;}
      text(section.title,x,y,textWidth,style,section.id);
      const number=String(prefixPages+directoryCount+(offsets.get(section.id)||0)+1);
      text(number,x+303,y,34,{...style,weight:700,color:C.blue},section.id);
      y+=wrapped.length*20+9;page.shapes.push({kind:'rect',x,y,width:337,height:1,color:C.line});y+=10;
    }
    return pages;
  };
  return create(create(0).length);
}

export function buildDetailedReportPdf(report:MarketingReport,measure:TextMeasurer,prefixPages:number){
  const sections=buildReadingSections(report),pages=buildReadingPdfPages(sections,measure);
  return {sections,pages,contents:buildReadingContents(sections,pages,measure,prefixPages)};
}

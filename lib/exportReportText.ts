import {buildReportDocument,type ReportBlock} from './reportDocument';
import {safeHttpUrl} from './citationMeasurement';
import type {MarketingReport} from './reportSchema';

const html=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const markdown=(value:string)=>value.replace(/[\r\n]+/g,' ').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([\\`*_{}\[\]()#+.!|~])/g,'\\$1');
const safeLink=(value?:string)=>{const url=value?safeHttpUrl(value):null;if(!url)return null;try{const parsed=new URL(url);return parsed.username||parsed.password?null:parsed.href;}catch{return null;}};
export function reportMarkdown(blocks:ReportBlock[]):string{
  return [...blocks.map(b=>{const prefix=b.kind==='title'?'# ':b.kind==='heading'?'## ':b.kind==='subheading'?'### ':'';const link=safeLink(b.href);return prefix+markdown(b.text)+(link?`\n\n출처: <${link.replace(/[<>\s]/g,c=>encodeURIComponent(c))}>`:'');}),'---','진짜마케팅 · Marketing Scanner','관측 범위와 원문 출처를 함께 확인해 주세요. 내려받은 파일은 공유 링크의 열람 종료 후에도 자동 회수되지 않습니다.'].join('\n\n');
}
export function reportHtml(blocks:ReportBlock[]):string{
  const title=blocks.find(b=>b.kind==='title')?.text||'마케팅 진단 리포트';
  const body=blocks.map(b=>{const tag=b.kind==='title'?'h1':b.kind==='heading'?'h2':b.kind==='subheading'?'h3':'p';const link=safeLink(b.href);return `<${tag}>${html(b.text)}</${tag}>${link?`<p class="source"><a href="${html(link)}" rel="noopener noreferrer">출처: ${html(link)}</a></p>`:''}`;}).join('\n');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>${html(title)}</title><style>body{margin:0;background:#f5f6f8;color:#19212c;font:16px/1.85 system-ui,sans-serif}main{box-sizing:border-box;max-width:920px;margin:32px auto;padding:clamp(22px,5vw,64px);background:white;border-top:6px solid #e23d34}h1{font-size:30px;line-height:1.45}h2{font-size:24px;border-top:1px solid #dfe4ea;padding-top:24px;margin-top:40px}h3{font-size:18px;margin-top:28px}p{white-space:pre-wrap;overflow-wrap:anywhere}.source{font-size:12px;color:#536273}a{color:#1d536f;overflow-wrap:anywhere}footer{border-top:1px solid #dfe4ea;margin-top:40px;padding-top:22px;color:#536273;font-size:13px}@media print{body{background:white}main{margin:0;padding:20px}h2,h3{break-after:avoid}}</style></head><body><main>${body}<footer><strong>진짜마케팅 · Marketing Scanner</strong><p>관측 범위와 원문 출처를 함께 확인해 주세요. 내려받은 파일은 공유 링크의 열람 종료 후에도 자동 회수되지 않습니다.</p></footer></main></body></html>`;
}
export function exportReportText(report:MarketingReport,format:'html'|'markdown'){
  const blocks=buildReportDocument(report),name=(report.meta?.siteName||report.meta?.domain||'website').replace(/[^\p{L}\p{N}._-]+/gu,'-').slice(0,80)||'website';
  return {text:format==='html'?reportHtml(blocks):reportMarkdown(blocks),mime:format==='html'?'text/html;charset=utf-8':'text/markdown;charset=utf-8',filename:`${name}-marketing-report.${format==='html'?'html':'md'}`};
}

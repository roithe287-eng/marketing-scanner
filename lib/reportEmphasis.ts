/** Exact authored terms only; retain all text and never interpret source HTML. */
export function reportEmphasisParts(text:string,terms:string[]=[]){
 const ranges:{start:number;end:number}[]=[];
 for(const term of [...new Set(terms)].filter(Boolean)){
  let at=0;
  while((at=text.indexOf(term,at))!==-1){ranges.push({start:at,end:at+term.length});at+=term.length;}
 }
 ranges.sort((a,b)=>a.start-b.start||b.end-a.end);
 const merged:{start:number;end:number}[]=[];
 for(const range of ranges){const last=merged.at(-1);if(last&&range.start<=last.end)last.end=Math.max(last.end,range.end);else merged.push({...range});}
 const parts:{text:string;emphasis:boolean}[]=[];let at=0;
 for(const range of merged){if(at<range.start)parts.push({text:text.slice(at,range.start),emphasis:false});parts.push({text:text.slice(range.start,range.end),emphasis:true});at=range.end;}
 if(at<text.length)parts.push({text:text.slice(at),emphasis:false});
 return parts;
}
export function draftEmphasis(text:string){return text.match(/\[[^\]\n]+\]/g)||[];}

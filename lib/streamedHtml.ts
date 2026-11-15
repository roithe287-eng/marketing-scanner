import type {CheerioAPI} from 'cheerio';
import {isComment,type AnyNode} from 'domhandler';

/** Expose completed React Suspense markup already delivered in the HTML. Never run page scripts. */
export function restoreStreamedHtml($:CheerioAPI):void {
  const scripts=$('body script:not([src]):not([type])').slice(0,300);
  const pairs=new Map<string,string>();
  scripts.each((_,node)=>{
    const code=$(node).text();
    if(!code.includes('$RC('))return;
    for(const match of code.matchAll(/(?:^|;)\$RC\("(B:[\da-f]+)","(S:[\da-f]+)"\)\s*(?=;|$)/g)){
      pairs.set(match[1],match[2]);
      if(pairs.size>=40)return false;
    }
  });
  for(const [boundaryId,segmentId] of pairs){
    const boundary=$('body template[id="'+boundaryId+'"]');
    const segment=$('body div[hidden][id="'+segmentId+'"]');
    if(boundary.length!==1||segment.length!==1||boundary.parents().toArray().some(parent=>parent===segment[0]))continue;
    const start=boundary[0].prev;
    if(!start||!isComment(start)||start.data!=='$?')continue;
    let end=boundary[0].next,depth=0;
    const fallback:AnyNode[]=[];
    for(;end&&fallback.length<300;end=end.next){
      if(isComment(end)){
        if(end.data==='/$'){if(!depth)break;depth--;}
        else if(/^\$(?:[?!~])?$/.test(end.data))depth++;
      }
      fallback.push(end);
    }
    if(!end||!isComment(end)||end.data!=='/$'||depth)continue;
    $(fallback).remove();
    boundary.replaceWith(segment.contents());
    segment.remove();
    start.data='$';
  }
}

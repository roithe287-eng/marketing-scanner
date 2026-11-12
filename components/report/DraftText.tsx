import React from 'react';
import {reportEmphasisParts,draftEmphasis} from '@/lib/reportEmphasis';
/** Only authored drafts use this renderer. Source quotations remain verbatim. */
export default function DraftText({text,emphasizeLead=false}:{text:string;emphasizeLead?:boolean}){
 const split=emphasizeLead?text.match(/^([^:：]{1,45}[:：])\s*/):null;
 if(split)return <><u className="service-instruction-label">{split[1]}</u>{' '}<DraftText text={text.slice(split[0].length)}/></>;
 return <>{reportEmphasisParts(text,draftEmphasis(text)).map((part,i)=>part.emphasis?<strong className="report-input-needed" key={i}>{part.text}</strong>:part.text)}</>;
}

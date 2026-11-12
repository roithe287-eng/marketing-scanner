import React from 'react';
import {reportEmphasisParts,draftEmphasis} from '@/lib/reportEmphasis';
/** Only authored drafts use this renderer. Source quotations remain verbatim. */
export default function DraftText({text}:{text:string}){
 return <>{reportEmphasisParts(text,draftEmphasis(text)).map((part,i)=>part.emphasis?<strong className="report-input-needed" key={i}>{part.text}</strong>:part.text)}</>;
}

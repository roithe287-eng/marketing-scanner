import React from 'react';
import {reportEmphasisParts} from '@/lib/reportEmphasis';
export default function ReportEmphasis({text,terms=[]}:{text:string;terms?:string[]}){
 return <>{reportEmphasisParts(text,terms).map((part,i)=>part.emphasis?<strong className="report-key-emphasis" key={i}>{part.text}</strong>:part.text)}</>;
}

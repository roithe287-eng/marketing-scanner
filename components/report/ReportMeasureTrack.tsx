import React from 'react';

/** Exact values are printed alongside the decorative bar. */
export default function ReportMeasureTrack({count,total}:{count:number;total:number}){
  if(!Number.isFinite(count)||!Number.isFinite(total)||total<=0||count<0||count>total)return null;
  return <span className="report-measure-track" aria-hidden="true"><i style={{width:`${100*count/total}%`}}/></span>;
}

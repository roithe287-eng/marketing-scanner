'use client';
import React from 'react';
import DiagnosisIcon from './DiagnosisIcon';

export const REPORT_CHAPTERS=[['overview','핵심 요약'],['geo','AI·GEO'],['search','검색·페이지'],['competition','경쟁사'],['actions','실행 과제']] as const;
export type ReportChapterId=typeof REPORT_CHAPTERS[number][0];

export function ReportChapter({id,number,title,note,children}:{id:ReportChapterId;number:string;title:string;note:string;children:React.ReactNode}) {
  const emphasis={overview:'무엇부터',geo:'AI가',search:'바로 다듬기',competition:'차이',actions:'실행으로'}[id];
  const emphasisAt=title.indexOf(emphasis);
  const icons={overview:'firstView',geo:'conversionFlow',search:'seo',competition:'adLanding',actions:'cta'} as const;
  return <section id={`report-${id}`} className="report-chapter" data-chapter={id} aria-labelledby={`report-title-${id}`}><div className="report-chapter-heading"><span className="report-chapter-symbol"><DiagnosisIcon axis={icons[id]}/><small>{number}</small></span><div><h2 id={`report-title-${id}`}>{emphasisAt<0?title:<>{title.slice(0,emphasisAt)}<span className="report-type-highlight">{emphasis}</span>{title.slice(emphasisAt+emphasis.length)}</>}</h2><p>{note}</p></div></div><div className="report-stack">{children}</div></section>;
}

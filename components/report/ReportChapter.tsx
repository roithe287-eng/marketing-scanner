import React from 'react';

export const REPORT_CHAPTERS=[['overview','핵심 요약'],['geo','AI·GEO'],['search','검색·페이지'],['competition','경쟁사'],['actions','실행 과제']] as const;
export type ReportChapterId=typeof REPORT_CHAPTERS[number][0];

export function ReportChapter({id,number,title,note,children}:{id:ReportChapterId;number:string;title:string;note:string;children:React.ReactNode}) {
  return <section id={`report-${id}`} className="report-chapter" data-chapter={id} aria-labelledby={`report-title-${id}`}><div className="report-chapter-heading"><span>{number}</span><div><h2 id={`report-title-${id}`}>{title}</h2><p>{note}</p></div></div><div className="report-stack">{children}</div></section>;
}

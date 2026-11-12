import React from 'react';

export function ReadingToggle({variant='default'}:{variant?:'default'|'report'}={}) {
  const report=variant==='report';
  return <span className={`reading-toggle${report?' reading-toggle--report':''}`} aria-hidden="true">
    <span className="reading-show" lang={report?'en':undefined}>{report?'OPEN':'펼치기'}</span><span className="reading-hide" lang={report?'en':undefined}>{report?'CLOSE':'접기'}</span>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" focusable="false">
      <path d={report?'m4 12 8-8M4 4h8v8':'m4 6 4 4 4-4'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>;
}

type Props = {
  title: string;
  preview?: string;
  defaultOpen?: boolean;
  index?: string;
  className?: string;
  children: React.ReactNode;
};

export default function ReadingDisclosure({title, preview, index, defaultOpen=false, className = '', children}: Props) {
  return (
    <details open={defaultOpen || undefined} className={`reading-fold ${className}`}>
      <summary className="reading-summary">
        <span className="reading-caption">
          <strong>{index?<><span className="reading-index" aria-hidden="true">{index}</span><span className="reading-title">{title}</span></>:title}</strong>
          {preview && <span className="reading-preview">{preview}</span>}
        </span>
        <ReadingToggle variant="report"/>
      </summary>
      <div className="reading-body">{children}</div>
    </details>
  );
}

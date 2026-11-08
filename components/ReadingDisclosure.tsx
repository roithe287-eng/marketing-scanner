import React from 'react';

export function ReadingToggle() {
  return <span className="reading-toggle" aria-hidden="true">
    <span className="reading-show">펼치기</span><span className="reading-hide">접기</span>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" focusable="false">
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>;
}

type Props = {
  title: string;
  preview?: string;
  index?: string;
  className?: string;
  children: React.ReactNode;
};

export default function ReadingDisclosure({title, preview, index, className = '', children}: Props) {
  return (
    <details className={`reading-fold ${className}`}>
      <summary className="reading-summary">
        <span className="reading-caption">
          <strong>{index?<><span className="reading-index" aria-hidden="true">{index}</span><span className="reading-title">{title}</span></>:title}</strong>
          {preview && <span className="reading-preview">{preview}</span>}
        </span>
        <ReadingToggle/>
      </summary>
      <div className="reading-body">{children}</div>
    </details>
  );
}

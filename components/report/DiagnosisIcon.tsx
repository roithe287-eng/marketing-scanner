import React from 'react';
import type {diagnosisAxes} from '@/lib/diagnosisVisuals';

type AxisKey=typeof diagnosisAxes[number]['key'];
const paths:Record<AxisKey,React.ReactNode>={
  firstView:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  cta:<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m12 12 9-9m-5 0h5v5"/></>,
  copywriting:<><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14l-1 6h17"/></>,
  trust:<><path d="M12 3 4 6v6c0 4 4 7 8 9 4-2 8-5 8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
  conversionFlow:<><rect x="2" y="3" width="7" height="6" rx="1.5"/><rect x="15" y="15" width="7" height="6" rx="1.5"/><path d="M9 6h9v6m-3-3 3 3 3-3M15 18H6v-6m-3 3 3-3 3 3"/></>,
  adLanding:<><path d="m3 9 15-5v14L3 13Zm5 6 2 6h4l-2-5M21 8v6"/></>,
  mobileUx:<><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 5h4m-3 14h2"/></>,
  seo:<><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5M7 12V9m3.5 3V6m3.5 6v-2"/></>,
};
export default function DiagnosisIcon({axis}:{axis:AxisKey}) {
  return <svg className="report-line-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[axis]}</svg>;
}

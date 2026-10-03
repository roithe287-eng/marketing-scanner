import {REPORT_NOTICE_TITLE,REPORT_NOTICE_LEAD,REPORT_NOTICE_ITEMS,REPORT_NOTICE_END} from '@/lib/reportNotice';

export default function Disclaimer() {
  return <section id="report-notice" className="report-notice" aria-labelledby="report-notice-title">
    <div className="report-notice-heading">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3 4 6v6c0 4 4 7 8 9 4-2 8-5 8-9V6Z"/><path d="M12 8v5m0 3v1"/></svg>
      <div><p className="report-notice-eyebrow">결과를 활용하기 전에 확인해 주세요</p><h2 id="report-notice-title">{REPORT_NOTICE_TITLE}</h2></div>
    </div>
    <p className="report-notice-lead">{REPORT_NOTICE_LEAD}</p>
    <ol className="report-notice-items">{REPORT_NOTICE_ITEMS.map((item,i)=><li key={item.title}><h3><span aria-hidden="true">0{i+1}</span>{item.title}</h3><p>{item.text}</p></li>)}</ol>
    <p className="report-notice-end">{REPORT_NOTICE_END}</p>
  </section>;
}

'use client';

import {useEffect, useState} from 'react';
import {requestJson} from '@/lib/client/request';
import {firstLandingCard, landingCards, type LandingActivity, type LandingCard} from '@/lib/landingActivity';

const ROTATE_MS = 8_000;
const LAST_CARD = 'scanner:landing:last-card';
const formatter = new Intl.NumberFormat('ko-KR');
type LandingData = {activity: LandingActivity | null; reviews: LandingCard[]};

function LandingCarousel({reviews}: {reviews: LandingCard[]}) {
  const cards = landingCards(reviews);
  const [activeId, setActiveId] = useState<string>();
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const activeIndex = cards.findIndex(card => card.id === activeId);
  const active = cards[Math.max(0, activeIndex)];
  const heading = reviews.length ? '이용 후기' : '업종별 이용 후기 예시';

  useEffect(() => {
    let previous: string | null = null;
    try { previous = localStorage.getItem(LAST_CARD); } catch {}
    setActiveId(firstLandingCard(landingCards(reviews), previous));
  }, [reviews]);

  useEffect(() => {
    if (!activeId) return;
    try { localStorage.setItem(LAST_CARD, activeId); } catch {}
  }, [activeId]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  function move(step: number) {
    setActiveId(cards[(Math.max(0, activeIndex) + step + cards.length) % cards.length].id);
  }

  const auto = !hovering && !focused && !reducedMotion;
  const nextId = cards[(Math.max(0, activeIndex) + 1) % cards.length].id;
  useEffect(() => {
    if (!auto || !activeId) return;
    const timer = window.setTimeout(() => {
      if (!document.hidden) setActiveId(nextId);
    }, ROTATE_MS);
    const resume = () => {
      if (!document.hidden) setActiveId(nextId);
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [activeId, nextId, auto]);

  return <section className="scanner-live-card scanner-carousel" aria-labelledby="scanner-carousel-title"
    onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
    onFocus={() => setFocused(true)} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    <h2 id="scanner-carousel-title">{heading}</h2>
    <figure className="scanner-carousel-content" aria-live={auto ? 'off' : 'polite'}>
      <div className="scanner-carousel-meta">
        {active.industry && <span className="scanner-carousel-industry">{active.industry}</span>}
        {active.kind === 'example' && <span className="scanner-carousel-example">예시</span>}
      </div>
      <blockquote>
        <p className="scanner-carousel-quote">“{active.title}”</p>
        <p className="scanner-carousel-text">{active.text}</p>
      </blockquote>
      {active.kind === 'review' && <figcaption>{active.byline}{active.sourceUrl && <> <a href={active.sourceUrl} target="_blank" rel="noopener noreferrer">후기 원문 보기</a></>}</figcaption>}
    </figure>
    <div className="scanner-carousel-controls">
      <button type="button" aria-label="이전 카드" onClick={() => move(-1)}>이전</button>
      <span aria-label={`${cards.length}개 중 ${Math.max(0, activeIndex) + 1}번째 카드`}>{Math.max(0, activeIndex) + 1} / {cards.length}</span>
      <button type="button" aria-label="다음 카드" onClick={() => move(1)}>다음</button>
    </div>
  </section>;
}

export default function LandingActivityPanel() {
  const [data, setData] = useState<LandingData | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void requestJson<LandingData>('/api/landing-activity', {signal: controller.signal, cache:'no-store'}, 8_000)
      .then(result => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setData({activity:null,reviews:[]});
      });
    return () => controller.abort();
  }, []);

  const totals = [
    {label:'URL 호출', value:data?.activity?.requested, unit:'회'},
    {label:'진단 완료', value:data?.activity?.completed, unit:'건'},
  ];
  return <div className="scanner-live-grid">
    <section className="scanner-live-card scanner-live-ledger" aria-labelledby="scanner-live-title" aria-busy={!data}>
      <h2 id="scanner-live-title">누적 진단 현황</h2>
      <dl className="scanner-live-totals">
        {totals.map(({label, value, unit}) => {
          const formatted = value === undefined ? '–' : formatter.format(value);
          return <div key={label}><dt>{label}</dt><dd data-wide={formatted.length > 6}><strong>{formatted}</strong>{value !== undefined && <small>{unit}</small>}</dd></div>;
        })}
      </dl>
      {data && !data.activity && <p className="scanner-live-empty" role="status">누적 집계를 확인하지 못했습니다.</p>}
    </section>
    {data
      ? <LandingCarousel reviews={data.reviews}/>
      : <section className="scanner-live-card scanner-carousel" aria-busy="true"><h2>업종별 이용 후기 예시</h2></section>}
  </div>;
}

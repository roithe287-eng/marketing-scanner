'use client';

import {useEffect, useState} from 'react';
import {requestJson} from '@/lib/client/request';
import {firstLandingCard, landingTips, type LandingActivity, type LandingCard} from '@/lib/landingActivity';

const POLL_MS = 15_000;
const ROTATE_MS = 8_000;
const LAST_CARD = 'scanner:landing:last-card';
const formatter = new Intl.NumberFormat('ko-KR');

function LandingCarousel({reviews}: {reviews: LandingCard[]}) {
  const cards = [...reviews, ...landingTips];
  const [activeId, setActiveId] = useState<string>();
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const activeIndex = cards.findIndex(card => card.id === activeId);
  const active = cards[Math.max(0, activeIndex)];
  const heading = reviews.length ? '이용 후기·활용 팁' : '진단 활용 팁';

  useEffect(() => {
    let previous: string | null = null;
    try { previous = localStorage.getItem(LAST_CARD); } catch {}
    setActiveId(firstLandingCard([...reviews, ...landingTips], previous));
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

  const auto = !paused && !hovering && !focused && !reducedMotion;
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
    <div className="scanner-carousel-content" aria-live={auto ? 'off' : 'polite'}>
      {reviews.length > 0 && <span className="scanner-carousel-kind">{active.kind === 'review' ? '이용 후기' : '활용 팁'}</span>}
      <h3>{active.title}</h3>
      {active.kind === 'review'
        ? <figure><blockquote>{active.text}</blockquote><figcaption>{active.byline}{active.sourceUrl && <> <a href={active.sourceUrl} target="_blank" rel="noopener noreferrer">후기 원문 보기</a></>}</figcaption></figure>
        : <p>{active.text}</p>}
    </div>
    <div className="scanner-carousel-controls">
      <button type="button" aria-label="이전 카드" onClick={() => move(-1)}>이전</button>
      <span aria-label={`${cards.length}개 중 ${Math.max(0, activeIndex) + 1}번째 카드`}>{Math.max(0, activeIndex) + 1} / {cards.length}</span>
      <button type="button" aria-label="다음 카드" onClick={() => move(1)}>다음</button>
      {!reducedMotion && <button type="button" onClick={() => setPaused(!paused)}>{paused ? '자동 재생' : '일시 정지'}</button>}
    </div>
  </section>;
}

export default function LandingActivityPanel() {
  const [activity, setActivity] = useState<LandingActivity | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [reviews, setReviews] = useState<LandingCard[] | null>(null);

  useEffect(() => {
    let request: AbortController | undefined;
    let timer: number | undefined;
    let active = true;

    async function update() {
      window.clearTimeout(timer);
      if (document.hidden || request) return;
      const current = new AbortController();
      request = current;
      try {
        const data = await requestJson<{activity: LandingActivity | null; reviews: LandingCard[]}>(
          '/api/landing-activity', {signal: current.signal, cache:'no-store'}, 8_000,
        );
        if (!active) return;
        if (data.activity) setActivity(data.activity);
        setLoadState(data.activity && Date.now() - data.activity.checkedAt < 45_000 ? 'ready' : 'unavailable');
        setReviews(previous => JSON.stringify(previous) === JSON.stringify(data.reviews) ? previous : data.reviews);
      } catch {
        if (!active) return;
        setLoadState('unavailable');
        setReviews(previous => previous ?? []);
      } finally {
        request = undefined;
        if (active && !document.hidden) timer = window.setTimeout(update, POLL_MS);
      }
    }

    void update();
    document.addEventListener('visibilitychange', update);
    return () => {
      active = false;
      window.clearTimeout(timer);
      request?.abort();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return <div className="scanner-live-grid">
    <section className="scanner-live-card" aria-labelledby="scanner-live-title">
      <h2 id="scanner-live-title">실시간 진단 현황</h2>
      <p className="scanner-live-state" data-live={loadState === 'ready'}>
        {loadState === 'ready' ? '15초마다 자동 확인' : loadState === 'loading' ? '집계 확인 중' : activity ? '마지막으로 확인한 집계' : '잠시 후 집계를 다시 확인합니다'}
      </p>
      <dl className="scanner-live-totals">
        <div><dt>누적 URL 호출</dt><dd>{activity ? formatter.format(activity.requested) : '–'}<small>회</small></dd></div>
        <div><dt>누적 진단 완료</dt><dd>{activity ? formatter.format(activity.completed) : '–'}<small>건</small></dd></div>
      </dl>
      <p className="scanner-live-scope">완료 건수는 종합 진단 기준</p>
      <h3 className="scanner-live-recent-title">최근 3일 진단 완료 URL</h3>
      {activity?.recent.length
        ? <ul className="scanner-live-recent">{activity.recent.map((label, index) => <li key={`${index}-${label}`}>{label}</li>)}</ul>
        : activity && <p className="scanner-live-empty">최근 3일 내 완료된 진단이 없습니다.</p>}
    </section>
    {reviews
      ? <LandingCarousel reviews={reviews}/>
      : <section className="scanner-live-card scanner-carousel" aria-busy="true"><h2>진단 활용 팁</h2></section>}
  </div>;
}

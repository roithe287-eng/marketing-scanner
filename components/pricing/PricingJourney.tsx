'use client';

import { useEffect, useRef, useState } from 'react';
import DiagnosisRadarGraphic from '@/components/DiagnosisRadarGraphic';
import styles from './PricingJourney.module.css';

const steps = [
  { label: 'URL 입력', title: '시작은, 주소 하나.', caption: '점검할 페이지의 URL을 입력합니다.' },
  { label: '페이지 분석', title: '보이는 화면, 그 안의 구조까지.', caption: '문구·버튼·검색 정보를 차례로 살펴봅니다.' },
  { label: '약점 발견', title: '먼저 손볼 곳이 보입니다.', caption: '영역별 진단에서 강점과 보완점을 확인합니다.' },
  { label: '실행 계획', title: '발견한 문제를, 다음 행동으로.', caption: '수정 위치와 방법, 적용 후 확인할 내용을 정리합니다.' },
] as const;
const exampleScores = [78, 48, 64, 84, 52, 61, 88, 70] as const;

/** A self-contained, synthetic demonstration. It never submits a URL or runs a diagnosis. */
export default function PricingJourney() {
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) { setStep(3); setPlaying(false); }
    };
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncPreference();
    syncVisibility();
    setReady(true);
    preference.addEventListener('change', syncPreference);
    document.addEventListener('visibilitychange', syncVisibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    if (root.current) observer.observe(root.current);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', syncPreference);
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (!ready || !playing || !visible || !pageVisible || reducedMotion || step === 3) return;
    const timer = window.setTimeout(() => setStep(current => Math.min(current + 1, 3)), step === 2 ? 3000 : 2400);
    return () => window.clearTimeout(timer);
  }, [ready, playing, visible, pageVisible, reducedMotion, step]);

  const paused = !playing || !visible || !pageVisible || reducedMotion;

  return (
    <div ref={root} className={styles.journey} data-paused={paused} aria-label="URL 입력부터 실행 계획까지, 진단 과정 예시">
      <div className={styles.topbar}>
        <span className={styles.windowDots} aria-hidden="true"><i /><i /><i /></span>
        <span>마케팅스캐너 <b>PROCESS PREVIEW</b></span>
        <span className={styles.example}>예시</span>
      </div>

      <div className={styles.stage}>
        {steps.map((item, index) => (
          <section key={item.label} className={`${styles.scene} ${step === index ? styles.active : ''}`} aria-hidden={step !== index} aria-label={`${index + 1}단계 ${item.label}`}>
            <div className={styles.sceneHeading}><span>0{index + 1} <i>/ 04</i></span><h2>{item.title}</h2></div>

            {index < 2 && <div className={styles.website}>
              <div className={styles.address}><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M3 10h14M10 3c4 4 4 10 0 14-4-4-4-10 0-14Z" /></svg><span className={index === 0 ? styles.typedUrl : undefined}>my-site.example</span><span className={styles.addressArrow} aria-hidden="true">↵</span></div>
              <div className={styles.websitePage} aria-hidden="true">
                <div className={styles.siteNav}><b>YOUR BRAND</b><span>ABOUT&nbsp;&nbsp; SERVICE</span></div>
                <div className={styles.siteContent}><div><strong>YOUR<br />WEBSITE.</strong><i /><i /><span>자세히 보기 <b>↗</b></span></div><div className={styles.siteArt}><span /><span /><span /></div></div>
                {index === 1 && <><div className={styles.scanBeam} /><div className={styles.scanTags}><span>✓ 페이지 구조</span><span>✓ 문구·버튼</span><span>✓ 검색 정보</span></div></>}
              </div>
            </div>}

            {index === 2 && <div className={styles.diagnosis}>
              <div className={styles.radar}><DiagnosisRadarGraphic scores={exampleScores} selected={1} example /></div>
              <div className={styles.scoreList}>
                <div className={styles.priorityScore}><span>우선 보완 · CTA</span><strong>48<small>/ 100</small></strong><i><b style={{ width: '48%' }} /></i></div>
                <div><span>검색 기본</span><strong>70<small>/ 100</small></strong><i><b style={{ width: '70%' }} /></i></div>
                <div><span>강점 · 모바일</span><strong>88<small>/ 100</small></strong><i><b style={{ width: '88%' }} /></i></div>
              </div>
            </div>}

            {index === 3 && <div className={styles.actionPlan}>
              <div className={styles.planLabel}><span>YOUR NEXT ACTION</span><span>수정안 예시 <b>↗</b></span></div>
              <ol>
                <li><span>01</span><div><strong>문구를 구체적으로</strong><p>첫 화면에 대상·제공 범위 명시</p></div><b aria-hidden="true">↗</b></li>
                <li><span>02</span><div><strong>문의 동선을 명확하게</strong><p>버튼 위에 신청 후 진행 과정 안내</p></div><b aria-hidden="true">↗</b></li>
                <li><span>03</span><div><strong>적용 후 다시 확인</strong><p>버튼 클릭·문의 완료 지표 점검</p></div><b aria-hidden="true">✓</b></li>
              </ol>
            </div>}
            <p className={styles.caption}>{item.caption}</p>
          </section>
        ))}
      </div>

      <div className={styles.stepper} role="group" aria-label="진단 과정 선택">
        {steps.map((item, index) => <button type="button" key={item.label} aria-pressed={step === index} onClick={() => { setStep(index); setPlaying(false); }}><span>0{index + 1}</span><strong>{item.label}</strong><i aria-hidden="true" /></button>)}
      </div>
      <div className={styles.controls}><p>과정을 압축한 예시 · 실제 분석 시간과 다릅니다.</p>{!reducedMotion && <button type="button" onClick={() => { if (step === 3) { setStep(0); setPlaying(true); } else setPlaying(current => !current); }}><span aria-hidden="true">{step === 3 ? '↻' : playing ? 'Ⅱ' : '▷'}</span>{step === 3 ? '다시 보기' : playing ? '일시정지' : '이어 보기'}</button>}</div>
    </div>
  );
}

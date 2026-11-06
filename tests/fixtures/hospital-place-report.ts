import {buildAnswerContentPlan} from '../../lib/answerContent';
import {fixture} from './report';
import {captureSiteDiagnosticSeed} from '../../lib/siteDiagnostics';
import {buildMedicalAudit} from '../../lib/medicalAudit';
import type {SiteDiagnostics} from '../../lib/siteDiagnosticsSchema';
import type {MarketingReport} from '../../lib/reportSchema';

export const hospitalUrl = 'https://clinic.example.com/';
export const hospitalHtml = '<html><head><title>예시 이비인후과의원</title></head><body><main>'+
  '<h1>예시 이비인후과의원</h1><h2>진료 안내</h2><p>진료시간 평일 09:00~18:00</p>'+
  '<ul><li>증상: 어지럼증</li><li>질병: 이석증</li><li>시술: 고막절개술</li><li>검진: 청력검사</li></ul>'+
  '<p>도수치료는 시행하지 않습니다.</p><form><p>환자 개인 기록 · 족저근막염</p></form>'+
  '<a href="https://m.place.naver.com/hospital/100000000000000000/home">네이버 플레이스</a>'+
  '</main></body></html>';

export function hospitalPlaceReport():MarketingReport {
  const page = captureSiteDiagnosticSeed(hospitalHtml,hospitalUrl).page;
  const sitemap = {url:hospitalUrl+'sitemap.xml',status:'unavailable' as const,note:'검수 표본',declared:false,entries:0,lastmod:0,invalidDates:0,futureDates:0,sampled:false};
  const siteDiagnostics:SiteDiagnostics = {
    version:1,observedAt:'2026-11-06T00:00:00Z',targetUrl:hospitalUrl,limited:false,scopeNote:'검수용 공개 진료안내 표본',
    pages:[page],attempts:[],sitemap,llms:{url:hospitalUrl+'llms.txt',status:'unavailable',note:'검수 표본'},crawlers:[],findings:[],medicalAudit:buildMedicalAudit([page])
  };
  const answerContentPlan = buildAnswerContentPlan({url:hospitalUrl,finalUrl:hospitalUrl,title:page.title,description:'이비인후과 진료 안내',ogDescription:'',
    h1:[page.title],h2:['진료 안내'],bodyText:'어지럼증, 이석증 진료 안내. 청력검사 준비 사항은 진료 전 확인하세요.',isJsHeavy:false});
  return {...fixture,url:hospitalUrl,llmCitationTest:null,siteDiagnostics,answerContentPlan};
}

import assert from 'node:assert/strict';
import test from 'node:test';
import * as cheerio from 'cheerio';
import {captureBusinessDocument,captureBusinessLinks} from '../lib/businessResearch';
import {captureSiteEditing} from '../lib/captureSiteEditing';
import {buildCompetitionScope,competitionMismatch,scopeAllowsKeyword} from '../lib/competitionScope';
import {classifyIndustryFromEvidence} from '../lib/industryClassifier';
import {marketKeywordCandidates} from '../lib/competitorResearch';
import {captureCompetitorPage} from '../lib/competitorAnalysis';
import {restoreStreamedHtml} from '../lib/streamedHtml';
import {analyzeWebsitePurpose,outOfPurpose,showProductCollection} from '../lib/websitePurpose';

const url='https://reading.example/';
const digitalHtml='<title>달빛사주 | 온라인 사주와 궁합</title><meta name="description" content="사주 풀이와 궁합, 무료 만세력을 확인하세요.">'+
  '<main><!--$?--><template id="B:0"></template><p>준비 중</p><!--/$--></main>'+
  '<div hidden id="S:0"><h1>달빛사주</h1><p>무료 만세력과 신년 사주를 확인할 수 있어요.</p><a href="/newyear">신년 사주 시작하기</a><button>신년 사주 배너 보기</button><a href="/service-info">서비스 상세정보</a><a href="/refund-policy">환불 정책</a><a href="/my/results">개인 사주 결과</a><div hidden><a href="/hidden">신점 상담하기</a></div></div>'+
  '<div hidden id="S:1"><a href="/pending">사주 상담</a></div><script>$RC("B:0","S:0")</script>';
function page(html:string,link=url){
  const $=cheerio.load(html);
  restoreStreamedHtml($);
  return {url:link,finalUrl:link,title:$('title').text(),description:$('meta[name="description"]').attr('content')||'',h1:$('h1').toArray().map(el=>$(el).text()),h2:[],bodyText:$('main').text(),siteEditing:captureSiteEditing($,link,new Headers()),businessDocuments:[captureBusinessDocument(html,link)]};
}

test('uses completed public streaming markup for online fortune checks and does not follow private, hidden or pending links',()=>{
  const links=captureBusinessLinks(digitalHtml,url);
  assert.deepEqual(new Set(links),new Set(['service-info','newyear','refund-policy'].map(path=>url+path)));
  const input=page(digitalHtml);
  input.businessDocuments.push(captureBusinessDocument('<title>서비스 안내</title><main><header><h1>온라인 사주 서비스</h1><p>생년월일시를 입력하고 출생 시간을 모르는 경우 별도 선택 항목을 사용하세요.</p></header><p>무료 티저 후 유료 리포트 가격과 결제 금액을 확인하세요.</p><p>유료 리포트는 결제 후 열람 기간 동안 재열람할 수 있습니다.</p></main>',url+'service-info'));
  const purpose=analyzeWebsitePurpose(input);
  assert.equal(purpose.business?.id,'fortune_digital');
  assert.equal(classifyIndustryFromEvidence(input),'fortune');
  assert.equal(showProductCollection(purpose),false);
  assert.equal(purpose.goal.key,'start');
  assert.deepEqual(purpose.goal.evidence.map(e=>e.text),['신년 사주 시작하기']);
  assert.equal(purpose.checks.find(c=>c.id==='business-input')?.evidence[0]?.locator,url+'service-info');
  assert.equal(purpose.checks.find(c=>c.id==='price')?.status,'observed');
  assert.equal(outOfPurpose('결제 버튼의 무료 범위와 유료 금액을 개선',purpose),false);
  assert.equal(outOfPurpose('배송비 안내 추가',purpose),true);
  assert.ok(marketKeywordCandidates({...input,scope:buildCompetitionScope(input),businessKeywords:purpose.business?.keywords}).some(k=>k.keyword==='무료 만세력'));
});

test('compares first-party fortune businesses by delivery model, specialty and the area for visits',()=>{
  function scopeFor(title:string,description:string,path='/'){
    return buildCompetitionScope({url:'https://candidate.example'+path,title,description});
  }
  const online=buildCompetitionScope({...page(digitalHtml),localPlaceEvidence:{sector:'local',name:'운영사',identity:'운영사',address:'서울 구로구',branch:'',franchise:false,links:[],terms:[],signals:[],media:{images:0,described:0,videos:0}}});
  const remote=scopeFor('전화로 만나는 사주·타로·신점','운세 상담을 제공하고 예약 시간을 안내합니다.');
  const local=scopeFor('부산 철학관 | 사주 상담','방문 상담은 예약제로 운영합니다.');
  const otherLocal=scopeFor('서울 철학관 | 사주 상담','방문 상담은 예약제로 운영합니다.');
  const anotherOnline=scopeFor('온라인 궁합과 만세력','무료 만세력과 사주 리포트를 제공합니다.');
  assert.equal(online.area,'');
  assert.equal(remote.nationwide,true);
  assert.equal(local.area,'부산');
  assert.equal(competitionMismatch(online,anotherOnline),undefined);
  assert.match(competitionMismatch(online,local)||'',/제공 업무/);
  assert.match(competitionMismatch(remote,local)||'',/원격 상담/);
  assert.match(competitionMismatch(local,otherLocal)||'',/운영 지역/);
  assert.ok(competitionMismatch(online,scopeFor('타로 카드 판매 쇼핑몰','타로 카드를 구매하세요.')));
  assert.ok(competitionMismatch(online,scopeFor('사주·운세 블로그','무료 만세력을 소개합니다.','/blog/reading')));
  assert.ok(competitionMismatch(online,scopeFor('타로 상담사 목록','무료 만세력 서비스를 소개합니다.')));
  assert.equal(scopeAllowsKeyword('결혼 상담',online),false);

  assert.equal(captureCompetitorPage(digitalHtml,url).scope?.profile,'fortune_digital');
  assert.notEqual(scopeFor('포트폴리오 제작 에이전시','사주 상담 홈페이지 제작 사례').profile,'fortune_consultation');
  assert.notEqual(scopeFor('무지개사주','무지개 최신 소식').profile,'fortune_digital');
  assert.notEqual(scopeFor('오늘의 운세','오늘의 별자리 운세를 읽어보세요.').profile,'fortune_digital');
});

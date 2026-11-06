import test from 'node:test';
import assert from 'node:assert/strict';
import {citationNextAction,keywordNextAction,needsVerification} from '../lib/reportNextAction';
import {buildExecutionPlan} from '../lib/reportExecution';
import type {LlmCitationQuestionResult,KeywordRankItem} from '../lib/reportSchema';
import {fixture} from './fixtures/report';

test('AI guidance requires verified search before advising a content review',()=>{
  const row:LlmCitationQuestionResult={...fixture.llmCitationTest!.results[0],status:'ok',searchUsed:true,citationVerified:true,cited:false};
  assert.match(citationNextAction([row]),/관련 페이지/);
  assert.match(citationNextAction([{...row,cited:true}]),/최신/);
  for(const partial of [{searchUsed:false},{citationVerified:false},{status:'unverified' as const}]){
    const action=citationNextAction([{...row,...partial}]);
    assert.match(action,/다시 확인한 뒤 수정 여부/);
    assert.doesNotMatch(action,/관련 페이지의 답변·조건을 점검/);
  }
  for(const status of ['error','timeout','unavailable'] as const)assert.match(citationNextAction([{...row,status}]),/복구|연결 설정/);
  for(const rows of [[],[row,row]])assert.match(citationNextAction(rows),/다시 확인한 뒤 수정 여부/);
});

test('keyword guidance separates valid absence, collection failures and legacy snapshots',()=>{
  const item:KeywordRankItem={keyword:'서비스 상담',naverWebRank:null,status:'none',observationStatus:'not_found'};
  assert.match(keywordNextAction(item,2),/검색어·URL.*수집·색인/);
  assert.match(keywordNextAction({...item,observationStatus:'found',naverWebRank:3},2),/제목·내용/);
  for(const status of ['error','unavailable',undefined] as const){
    const action=keywordNextAction({...item,observationStatus:status},2);
    assert.doesNotMatch(action,/수집·색인|제목·내용/);
    assert.match(action,/정상 응답|연결 설정/);
  }
  assert.match(keywordNextAction(item),/새 기준/);
});

test('review and account-only tasks are not presented as immediate edits',()=>{
  const plan=buildExecutionPlan({...fixture,checklist:[{id:'intro',category:'content',label:'서비스 소개',status:'warning',currentValue:'제공 범위 확인',diagnosis:'범위 보완',guide:'조건을 구체적으로 안내하세요.'}]});
  const task=plan.first[0];
  assert.equal(needsVerification(task),false);
  assert.equal(needsVerification({...task,status:'review'}),true);
  assert.equal(needsVerification({...task,owner:'verify'}),true);
  assert.equal(needsVerification({...task,guideScope:'account'}),true);
});

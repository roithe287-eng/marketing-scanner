import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UserActivityPanel, type ActivityDetailData } from '../components/access/UserActivityView';
import { DEFAULT_FEATURES } from '../lib/saas/types';
const now=Date.UTC(2026,9,6,2);
const data:ActivityDetailData={
  account:{id:'00000000-0000-4000-8000-000000000001',email:'test@example.com',name:'<script>계정</script>',company:'테스트',role:'customer',status:'approved',expiresAt:now+86400000,monthlyLimit:10,features:DEFAULT_FEATURES,createdAt:now,version:1},
  totals:{analyze_started:4,analyze_success:2,analyze_failed:1,pdf_ready:3,pdf_save:2,share_created:5,login:8,firstTrackedAt:now,lastSeenAt:now},usage:{analyze:3},
  activity:{events:[{id:'event',accountId:'00000000-0000-4000-8000-000000000001',action:'pdf_save',at:now,ip:'203.0.113.20',device:'Chrome / Windows',source:'browser',target:'<img src=x onerror=alert(1)>',scope:'full'}],daily:[{day:'2026-10-06',counts:{analyze_success:2}}],ips:['203.0.113.20'],retentionDays:30,truncated:false},
  reports:[{id:'test123',url:'https://example.com',title:'<script>보고서</script>',createdAt:now,expiresAt:now+86400000}],
};
test('admin activity panel retains identifiers, distinct PDF semantics, and escapes user-controlled content',()=>{
  const html=renderToStaticMarkup(React.createElement(UserActivityPanel,{data}));
  for(const label of ['test@example.com',data.account.id,'203.0.113.20','PDF 파일 저장 클릭','브라우저 보고','기기에 파일이 실제 저장됐는지는 확인할 수 없습니다','공유 링크 상태'])assert.ok(html.includes(label),label);
  assert.ok(html.includes('&lt;script&gt;보고서&lt;/script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('진행·결과 미확인 1'));assert.ok(html.includes('href="/r/test123"'));assert.ok(html.includes('전체 PDF'));
});
test('admin empty states remain explicit instead of inventing IP, activity or old usage',()=>{
  const html=renderToStaticMarkup(React.createElement(UserActivityPanel,{data:{...data,totals:{},activity:{...data.activity,events:[],ips:[]},reports:[]}}));
  for(const label of ['확인된 접속 IP가 없습니다','현재 보관된 공유 링크가 없습니다','도입 이전 활동은 소급 집계하지 않습니다','선택한 활동의 기록이 없습니다'])assert.ok(html.includes(label),label);
});
test('suspended users do not have their stored reports labelled as active links',()=>{
  const html=renderToStaticMarkup(React.createElement(UserActivityPanel,{data:{...data,account:{...data.account,status:'suspended'}}}));
  assert.ok(html.includes('고객 열람 중지'));assert.ok(!html.includes('class="admin-badge">활성'));
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './fixtures/report';
import {buildKeywordRewrites,keywordRewrite,rewriteClipboard} from '../lib/keywordRewrite';
import ScoreRadar from '../components/ScoreRadar';
import {buildReportDocument} from '../lib/reportDocument';
import {buildVisualPdfPages} from '../lib/reportVisualPdf';
import type {KeywordFreqItem,MarketingReport} from '../lib/reportSchema';
import type {PdfTextStyle} from '../lib/pdfLayout';
const item=(keyword:string,count=12):KeywordFreqItem=>({keyword,count,density:4,inTitle:false,inMetaDescription:false});
test('brand names remain identifiable while negation and exceptions are preserved',()=>{
 const meta={siteName:'진짜마케팅',ogTitle:'진짜마케팅 | 광고 운영'};
 for(const word of ['진짜마케팅','진짜마케팅은'])assert.equal(keywordRewrite(item(word,99),meta).kind,'유지');
 assert.notEqual(keywordRewrite(item('가짜진짜마케팅'),meta).kind,'유지');
 for(const word of ['않습니다','제외 조건','없는 서비스는 불가']){const p=keywordRewrite(item(word),meta,true);assert.equal(p.kind,'문맥 검토');assert.match(p.action,/보존/);}
 assert.equal(keywordRewrite(item('함께'),meta).kind,'정리');
});
test('templates are specific to the term and do not invent source sentences, results or ideal density',()=>{
 const a=keywordRewrite(item('운영'),{ogTitle:'광고 운영 안내'}),b=keywordRewrite(item('분석'),undefined);
 assert.equal(a.source,'광고 운영 안내');assert.equal(b.source,null);assert.notEqual(a.template,b.template);
 assert.match(b.template,/\[분석 지표\]/);assert.match(rewriteClipboard(b),/문장 원문 미저장/);
 assert.equal(keywordRewrite(item('전문 서비스',999),undefined).kind,keywordRewrite(item('전문 서비스',2),undefined).kind);
});
test('all saved words and phrases survive in full TO-BE PDF appendix without mutating frequency data',()=>{
 const singles=[item('운영'),item('진짜마케팅'),item('함께'),item('않습니다'),item('광고를')],phrases=[item('구체적인 진행')];
 const frequency={singles,phrases,totalTokens:400,uniqueSingles:5,uniquePhrases:1};
 const r:MarketingReport={...fixture,meta:{siteName:'진짜마케팅'},keywordFrequency:frequency};
 const before=JSON.stringify(r),plans=buildKeywordRewrites(frequency,r.meta);assert.equal(plans.singles.length,5);assert.equal(plans.phrases.length,1);
 const text=buildReportDocument(r).map(b=>b.text).join('\n');for(const p of [...plans.singles,...plans.phrases])assert.ok(text.includes(p.action));
 assert.match(text,/반복 표현 TO-BE 제안/);assert.match(text,/작성 틀 \(사실 확인 후 사용\)/);assert.equal(JSON.stringify(r),before);
 assert.deepEqual(buildKeywordRewrites(undefined),{singles:[],phrases:[]});
});
test('eight-direction graphic is initially visible, accessible and linked to eight controls',()=>{
 const html=renderToStaticMarkup(React.createElement(ScoreRadar,{diagnosis:fixture.diagnosis}));
 assert.equal((html.match(/aria-pressed=/g)||[]).length,8);assert.match(html,/8방향 레이더 차트/);assert.match(html,/완료 확인/);

});
test('radar and TO-BE visual pages stay in bounds with long multilingual strings',()=>{
 const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size*(t.weight===700?1.06:1),0);
 const r:MarketingReport={...fixture,meta:{siteName:'브랜드'.repeat(70)},keywordFrequency:{totalTokens:300,uniqueSingles:3,uniquePhrases:0,singles:[item('브랜드'.repeat(70)),item('운영'),item('abc長文'.repeat(60))],phrases:[]}};
 const pages=buildVisualPdfPages(r,measure);assert.match(pages[0].lines.map(l=>l.text).join(''),/8개 영역/);
 for(const page of pages){for(const l of page.lines){assert.ok(l.x>=48&&l.x+l.width<=742.01,`x: ${l.text}`);assert.ok(l.y+l.lineHeight<=1039,`y: ${l.text}`);}for(const s of page.shapes)if(s.kind==='polygon')for(const p of s.points){assert.ok(p.x>=0&&p.x<=s.width);assert.ok(p.y>=0&&p.y<=s.height);}}
});

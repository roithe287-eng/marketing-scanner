import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import AdminUsageTable,{customerActivityPage} from '../components/access/AdminUsageTable';
import type {AdminCustomerActivity} from '../lib/saas/activityTypes';
const now=Date.UTC(2026,9,13);
const customers:AdminCustomerActivity[]=Array.from({length:25},(_,i)=>({
  id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,name:'동일 고객명',company:i===24?'마지막 회사':'테스트',email:`customer${i}@example.com`,status:'approved',expiresAt:now+86400000,activated:true,
  periods:{'1':{analyze_started:i+1,analyze_success:i,pdf_saved:i},'7':{analyze_success:100+i},'30':{analyze_success:200+i},'all':{analyze_success:300+i}}
}));
const groups={owner:{analyze_success:10},customers:{analyze_success:200},network:{analyze_success:2}};
test('customer rows display full stable IDs, identity and the selected period counts separately',()=>{
  const html=renderToStaticMarkup(React.createElement(AdminUsageTable,{customers:customers.slice(0,2),period:'1',groups,at:now,onSelect:()=>{}}));
  for(const customer of customers.slice(0,2))assert.ok(html.includes(customer.id)&&html.includes(customer.email));
  assert.equal((html.match(/data-customer-id=/g)||[]).length,2);
  const first=html.split(`data-customer-id="${customers[0].id}"`)[1].split('</tr>')[0];
  const second=html.split(`data-customer-id="${customers[1].id}"`)[1].split('</tr>')[0];
  assert.ok(first.includes('<td>1</td><td>0 / 0</td>'));assert.ok(second.includes('<td>2</td><td>1 / 0</td>'));
  assert.ok(html.includes('ID 복사')&&html.includes('활동 상세 보기'));
});
test('customer UUID, company and email search covers every page and deletion cannot leave an invalid page',()=>{
  assert.equal(customerActivityPage(customers,'',0).rows.length,20);
  assert.equal(customerActivityPage(customers,'',1).rows.length,5);
  for(const search of [customers[24].id,customers[24].email,'마지막 회사']){
    const page=customerActivityPage(customers,search,8);assert.equal(page.total,1);assert.equal(page.current,0);assert.equal(page.rows[0].id,customers[24].id);
  }
  assert.equal(customerActivityPage(customers.slice(0,2),'',1).current,0);
  assert.equal(customerActivityPage(customers,'없는 ID',0).total,0);
});
test('unactivated, suspended and expired customers stay identifiable without unescaped profile content',()=>{
  const rows=customers.slice(0,3).map((customer,i)=>({...customer,name:'<script>same</script>',status:i===1?'suspended' as const:'approved' as const,activated:false,expiresAt:i===2?now-1:now+1000}));
  const html=renderToStaticMarkup(React.createElement(AdminUsageTable,{customers:rows,period:'all',groups,at:now,onSelect:()=>{}}));
  for(const label of ['활성화 대기','이용 중지','기간 종료'])assert.ok(html.includes(label));
  assert.ok(html.includes('&lt;script&gt;same&lt;/script&gt;'));assert.ok(!html.includes('<script>'));
});

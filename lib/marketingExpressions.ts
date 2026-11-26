/** Keep literals and offsets from each field. A limit on one offer must not negate another. */
export function marketingExpressions(text:string,pattern:RegExp){
  const matches=new Map<string,string>();
  const excluded:{expression:string;context:string}[]=[];
  const offsets:number[]=[];
  for(let i=0;i<text.length;i++)if(!/\s/u.test(text[i]))offsets.push(i);
  const compact=offsets.map(i=>text[i]).join('');
  const scope=/^(?:(?:은|는|이|가|을|를|도|의)|형|현재|아직|일시|배송|예약|상담|제작|주문|구매|방문|체험|신청|접수|문의|서비스|할인|혜택|제공|지원|운영|이용|보유|인증|발급|진행|적용|교환|반품|오픈|개시){0,4}(?:없|미제공|미보유|미지원|미운영|미적용|불가|불가능|예정|준비중|종료|중단|제한|중지|하지(?:않|못)|되지않|아님|아닙|아니|안(?:됨|됩|합)|할수없|받을수없|확인되지)/u;
  for(const match of compact.matchAll(new RegExp(pattern.source.replace(/ /g,''),'giu'))){
    const start=offsets[match.index!],end=offsets[match.index!+match[0].length-1]+1;
    const expression=text.slice(start,end);
    const prefix=text.slice(0,start).match(/(?:^|[\s\p{P}\p{S}])([미비])$/u)?.[1];
    if((prefix==='미'&&/^(?:지원|인증|제공|확인|운영|예약|적용)$/u.test(match[0]))||(prefix==='비'&&match[0]==='공식')){
      const context=prefix+expression;
      if(!excluded.some(e=>e.context===context))excluded.push({expression,context});
      continue;
    }
    const tail=compact.slice(match.index!+match[0].length);
    const limit=scope.exec(tail);
    // A waiver or an absence of limits is affirmative pricing/service information.
    const lifted=limit&&/제한|중단/u.test(limit[0])&&/^(?:이|은|는)?없/u.test(tail.slice(limit[0].length));
    const waived=limit&&/^(?:비용|수수료|배송비|추가금|추가비용)$/u.test(match[0])&&/^(?:이|가|은|는|도)?없/u.test(tail);
    if(limit&&!lifted&&!waived){
      const last=offsets[match.index!+match[0].length+limit[0].length-1]+1;
      const ending=text.slice(last).match(/^[^\s\n,;.!?·|。！？，；]{0,16}/u)?.[0]||'';
      const context=text.slice(start,last)+ending;
      if(!excluded.some(e=>e.context===context))excluded.push({expression,context});
    }else matches.set(match[0].toLocaleLowerCase(),expression);
  }
  return {matches:[...matches.values()],excluded};
}

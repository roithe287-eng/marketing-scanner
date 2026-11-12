/** Attach a particle to a generated Korean label. Never rewrite quoted source text. */
export function koreanParticle(value:string,kind:'object'|'topic'|'subject'|'and'){
 const last=value.trim().charCodeAt(value.trim().length-1);
 const hasFinal=last>=0xac00&&last<=0xd7a3&&(last-0xac00)%28!==0;
 const pair={object:['을','를'],topic:['은','는'],subject:['이','가'],and:['과','와']}[kind];
 return value+pair[hasFinal?0:1];
}

/** Presentation only: retain complete sentences and never alter the stored report. */
export function reportExcerpt(text:string,limit=130):string {
  const clean=text.trim();
  if(clean.length<=limit)return clean;
  const sentences=clean.split(/(?<=[.!?。])\s+/u);
  if(!sentences||sentences.length<2)return clean;
  let excerpt='';
  for(const sentence of sentences){
    const next=(excerpt+' '+sentence.trim()).trim();
    if(excerpt&&next.length>limit)break;
    excerpt=next;
  }
  const qualifications=sentences.filter(s=>/아닙니다|보장하지|미측정|미확인|단정|가정|추정|별도 확인|확인.*필요/.test(s)&&!excerpt.includes(s));
  if(qualifications.length)excerpt+=' '+qualifications.join(' ');
  return excerpt.length>=24&&excerpt.length<clean.length?excerpt:clean;
}

/** Compact explanatory prose without dropping distinct facts, qualifications or steps. */
export function reportReadingPoints(text:string):string[]{
 const parts=text.trim().split(/(?<=[.!?。])\s+|\n+/u).map(part=>part.trim()).filter(Boolean);
 const points:string[]=[];
 for(let i=0;i<parts.length;i++){
  const point=/^\d+[.)]$/.test(parts[i])&&parts[i+1]?parts[i]+' '+parts[++i]:parts[i];
  // Only consecutive identical sentences are redundant. Repetition in another context stays.
  if(points.at(-1)!==point)points.push(point);
 }
 return points;
}

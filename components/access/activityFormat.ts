export const koreanTime=(at?:number)=>at?new Date(at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}):'기록 없음';

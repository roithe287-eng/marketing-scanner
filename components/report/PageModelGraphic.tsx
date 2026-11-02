import React from 'react';
import type {PageSketchKind} from '@/lib/reportPlainLanguage';

const ink='#284f79',blue='#3769b7',muted='#afc0d5',teal='#168272',paper='#f3f7fc';
function Lines({x,y,width=70,rows=3}:{x:number;y:number;width?:number;rows?:number}){
 return <g stroke={muted} strokeWidth="2.6" strokeLinecap="round">{Array.from({length:rows},(_,i)=><path key={i} d={`M${x} ${y+i*9}h${width*(i===rows-1?.72:1)}`}/>)}</g>;
}
function Check({x,y}:{x:number;y:number}){return <g><circle cx={x} cy={y} r="6" fill="#e4f4ed"/><path d={`m${x-2.6} ${y} 1.8 2 3.8-4.3`} fill="none" stroke={teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></g>;}
function Scene({type}:{type:PageSketchKind}){
 switch(type){
 case 'hero':return <><rect x="29" y="49" width="202" height="83" rx="8" fill={paper}/><path d="M41 66h101m-101 9h82" stroke={ink} strokeWidth="4.7" strokeLinecap="round"/><Lines x={41} y={88} width={86} rows={2}/><rect x="41" y="111" width="56" height="12" rx="6" fill={blue}/><path d="M49 117h31m-3-2.5 3 2.5-3 2.5" stroke="white" strokeWidth="1.5" fill="none"/><rect x="163" y="61" width="54" height="57" rx="8" fill="#e0eaf8" stroke="#cbd9ee"/><path d="m172 102 12-13 9 8 13-19" fill="none" stroke={blue} strokeWidth="2.4" strokeLinecap="round"/><circle cx="178" cy="76" r="5" fill="white"/><path d="M170 124h39" stroke={muted} strokeWidth="2" strokeLinecap="round"/></>;
 case 'search':return <><circle cx="36" cy="57" r="7" fill="#e3edf9"/><path d="M49 54h58m-58 6h37" stroke={muted} strokeWidth="2.2" strokeLinecap="round"/><path d="M30 76h184" stroke={blue} strokeWidth="5" strokeLinecap="round"/><Lines x={30} y={90} width={184} rows={3}/><rect x="29" y="122" width="66" height="5" rx="2.5" fill="#dce5f0"/><rect x="105" y="122" width="48" height="5" rx="2.5" fill="#dce5f0"/></>;
 case 'cost':return <>{[30,137].map((x,i)=><g key={x}><rect x={x} y="49" width="94" height="82" rx="7" fill={i?'#fcfbf7':paper} stroke={i?'#e8dfca':'#dce6f2'}/><path d={`M${x+12} 62h48`} stroke={i?'#a77b38':blue} strokeWidth="3.5" strokeLinecap="round"/><path d={`M${x+12} 76h65`} stroke={ink} strokeWidth="4.5" strokeLinecap="round"/>{[94,111].map(y=><g key={y}><Check x={x+15} y={y}/><path d={`M${x+28} ${y}h49`} stroke={muted} strokeWidth="2.5" strokeLinecap="round"/></g>)}</g>)}</>;
 case 'faq':return <><rect x="29" y="49" width="202" height="21" rx="5" fill="#eaf0fb"/><circle cx="41" cy="59.5" r="4.5" fill={blue}/><path d="M53 59h137m24-2 3 3-3 3" stroke={blue} strokeWidth="2.5" strokeLinecap="round" fill="none"/><rect x="29" y="74" width="202" height="37" rx="5" fill="#f0f8f6"/><path d="M41 84h6m-3-3v6" stroke={teal} strokeWidth="1.6"/><Lines x={55} y={84} width={160} rows={3}/><rect x="29" y="117" width="202" height="14" rx="4" fill={paper}/><path d="M41 124h126m47-2 3 2-3 2" stroke={muted} strokeWidth="2" strokeLinecap="round" fill="none"/></>;
 case 'proof':return <><rect x="30" y="50" width="69" height="80" rx="7" fill={paper} stroke="#dce6f2"/><path d="M43 65h42m-42 7h28" stroke={blue} strokeWidth="3" strokeLinecap="round"/><rect x="42" y="83" width="44" height="27" rx="4" fill="#e4edf8"/><path d="m48 102 9-8 7 5 14-12" stroke={blue} strokeWidth="2" fill="none"/><Check x={81} y={118}/><path d="M113 59h103" stroke={ink} strokeWidth="4" strokeLinecap="round"/><Lines x={113} y={74} width={109} rows={2}/><rect x="111" y="98" width="115" height="31" rx="7" fill="#edf7f3" stroke="#c6e2d7"/><Check x={124} y={113}/><path d="M138 109h72m-72 8h51" stroke={teal} strokeWidth="2.4" strokeLinecap="round"/></>;
 case 'action':return <><path d="M53 54h154" stroke={ink} strokeWidth="3.6" strokeLinecap="round"/><Lines x={65} y={67} width={130} rows={2}/><path d="M130 86v8m-3-3 3 3 3-3" stroke={muted} strokeWidth="1.8" fill="none"/><rect x="78" y="100" width="104" height="24" rx="12" fill={teal}/><path d="M98 112h59m-5-4 5 4-5 4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/><circle cx="204" cy="111" r="12" fill="#edf7f3" stroke="#b7dacd"/><path d="m199 111 3 3 6-7" stroke={teal} strokeWidth="2" fill="none" strokeLinecap="round"/></>;
 case 'image':return <><rect x="30" y="50" width="95" height="80" rx="7" fill={paper} stroke="#dce6f2"/><rect x="38" y="58" width="79" height="49" rx="4" fill="#dfeaf8"/><circle cx="56" cy="72" r="7" fill="white"/><path d="m42 100 22-20 15 13 16-19 18 26" stroke={blue} strokeWidth="2.2" fill="none" strokeLinejoin="round"/><Lines x={40} y={118} width={67} rows={1}/><path d="M140 59h68" stroke={ink} strokeWidth="3.5" strokeLinecap="round"/><rect x="138" y="72" width="89" height="40" rx="5" fill="white" stroke="#c7d8ed"/><Lines x={147} y={83} width={69} rows={2}/><path d="M140 123h57" stroke={teal} strokeWidth="3" strokeLinecap="round"/></>;
 case 'settings':return <>{[58,87,116].map((y,i)=><g key={y}><rect x="30" y={y-10} width="201" height="23" rx="5" fill={i===1?'#f0f7f4':paper}/><path d={`M41 ${y+1}h${[70,91,57][i]}`} stroke={i===1?teal:ink} strokeWidth="2.7" strokeLinecap="round"/><rect x="181" y={y-4} width="32" height="12" rx="6" fill={i===1?teal:'#d8e3f1'}/><circle cx={i===1?207:187} cy={y+2} r="4" fill="white"/></g>)}</>;
 case 'flow':return <>{[30,101,172].map((x,i)=><g key={x}><rect x={x} y={61-i*4} width="58" height="58" rx="7" fill={i===2?'#edf7f3':paper} stroke={i===2?'#b7dacd':'#d1deee'}/><rect x={x+10} y={72-i*4} width="17" height="12" rx="3" fill={i===2?'#c8e7db':'#dce8f8'}/><Lines x={x+10} y={93-i*4} width={37} rows={2}/></g>)}<path d="M91 89h7m-3-3 3 3-3 3m67-7h7m-3-3 3 3-3 3" fill="none" stroke={blue} strokeWidth="1.8" strokeLinecap="round"/></>;
 }
}

/** Scalable page models: decorative geometry only; readable labels live in HTML. */
export default function PageModelGraphic({type}:{type:PageSketchKind}){
 return <svg className="report-source-sketch" data-page-model={type} viewBox="0 0 260 156" aria-hidden="true" focusable="false">
  <rect x="17" y="18" width="228" height="126" rx="12" fill="#dfe7f1" opacity=".42"/>
  <rect x="15" y="12" width="230" height="128" rx="11" fill="white" stroke="#ccdaea"/>
  <path d="M16 39h228" stroke="#dce6f2"/><path d="M27 25h.01m8 0h.01m8 0h.01" stroke="#8faacb" strokeWidth="4" strokeLinecap="round"/>
  <rect x="61" y="21" width="137" height="10" rx="5" fill="#f0f4f9"/>
  <path d="M69 26h90" stroke="#c6d3e3" strokeWidth="2" strokeLinecap="round"/>
  <path d="M220 23h12m-12 4h12" stroke="#b8c9df" strokeWidth="1.5" strokeLinecap="round"/>
  <Scene type={type}/>
 </svg>;
}

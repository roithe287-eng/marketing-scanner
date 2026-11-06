import React from 'react';
import type {PlaceCategory} from '@/lib/hospitalPlace';

type Kind=PlaceCategory|'place'|'compare'|'image'|'video'|'search'|'document';
const icons:Record<Kind,React.ReactNode>={
  증상:<><path d="M2 13h5l3-8 4 14 3-8 2 2h3"/></>,
  질병:<><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6m-3-3v6m-4 4h8m-8 3h5"/></>,
  시술:<><path d="m5 17 9-9 3 3-9 9H5v-3Zm7-7 3 3m-.5-6.5 2-2a2 2 0 0 1 3 3l-2 2M3 21h7"/></>,
  검진:<><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 10l2 2 4-4"/></>,
  place:<><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  compare:<><rect x="2" y="5" width="8" height="14" rx="2"/><rect x="14" y="5" width="8" height="14" rx="2"/><path d="M5 9h2m-2 4h2m10-4h2m-2 4h2"/></>,
  image:<><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/></>,
  video:<><rect x="2" y="5" width="20" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/></>,
  search:<><circle cx="10" cy="10" r="6.5"/><path d="m15 15 5.5 5.5"/></>,
  document:<><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h5"/></>
};
export default function ClinicIcon({kind}:{kind:Kind}){
  return <svg className="hp-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[kind]}</svg>;
}

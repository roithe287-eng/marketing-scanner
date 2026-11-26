import {z} from 'zod';

export const METADATA_LIMITS={title:600,description:1600} as const;
export const HINT_METADATA_LIMITS={full:2000,compact:[640,240,80]} as const;

export function clipMetadata(value:string,limit:number){
  return value.slice(0,limit).replace(/[\uD800-\uDBFF]$/u,'');
}

export const MetadataTruncationSchema=z.object({title:z.boolean(),description:z.boolean()});
export type MetadataTruncation=z.infer<typeof MetadataTruncationSchema>;

export function metadataCoverage(title:string|undefined,description:string|undefined,recorded?:MetadataTruncation,source:'page'|'hint'='page'){
  // When an old capture ends at its storage limit, the rest of that field is unknown.
  if(recorded)return recorded;
  if(source==='hint'){
    const atLimit=(value:string|undefined)=>!!value&&[HINT_METADATA_LIMITS.full,...HINT_METADATA_LIMITS.compact].some(limit=>value.length===limit);
    return {title:atLimit(title),description:atLimit(description)};
  }
  return {title:(title?.length??0)>=METADATA_LIMITS.title,description:(description?.length??0)>=METADATA_LIMITS.description};
}

import {clipMetadata,HINT_METADATA_LIMITS,MetadataTruncationSchema} from './metadataCoverage';
import {z} from 'zod';
import {CommunityContextSchema} from './communityContext';
import {CompetitionScopeSchema,type CompetitionScope} from './competitionScope';
import {competitorOwnText} from './competitorResearch';
import type {ExtractedWebsiteData} from './extractWebsite';
import {isSecondarySection,providerBody} from './websiteIdentity';

export const COMPETITOR_REQUEST_BYTES=49_152;
const field=z.string().max(2000);
export const CompetitorRequestSchema=z.object({
  url:z.string().min(1).max(2048),
  hints:z.object({
    scope:CompetitionScopeSchema.optional(),communityContext:CommunityContextSchema.optional(),
    metadataTruncated:MetadataTruncationSchema.optional(),title:field.optional(),ogTitle:field.optional(),description:field.optional(),ogDescription:field.optional(),
    keywords:field.optional(),h1:z.array(field).max(50).optional(),h2:z.array(field).max(100).optional(),
    bodyText:z.string().max(8000).optional(),
  }),
});
type HintSource=Pick<ExtractedWebsiteData,'url'|'finalUrl'|'diagnosticSeed'|'siteEditing'|'businessDocuments'|'communityContext'|'title'|'ogTitle'|'description'|'ogDescription'|'keywords'|'h1'|'h2'|'bodyText'>;
type Hints=z.infer<typeof CompetitorRequestSchema>['hints'];
const excerpt=(text:string|undefined,limit:number)=>clipMetadata(text||'',limit);

/** Prepare the exact JSON envelope that the comparison endpoint will receive. */
export function buildCompetitorHints(url:string,data:HintSource,scope:CompetitionScope):Hints|null{
  if(url.length>2048)return null;
  const body=providerBody(data),ownText=competitorOwnText(data);
  const h1=data.h1.slice(0,50).map(h=>excerpt(h,2000));
  const headings=data.h2.filter(heading=>!isSecondarySection(heading,'')&&body.includes(heading));
  const community=data.communityContext;
  function metadata(limit:number){
    const title=excerpt(data.title,limit),description=excerpt(data.description,limit);
    return {title,description,metadataTruncated:{title:title.length<data.title.length,description:description.length<data.description.length}};
  }
  const fits=(hints:Hints)=>Buffer.byteLength(JSON.stringify({url,hints}),'utf8')<=COMPETITOR_REQUEST_BYTES;
  const full:Hints={
    ...metadata(HINT_METADATA_LIMITS.full),scope,communityContext:community,ogTitle:excerpt(data.ogTitle,2000),
    ogDescription:excerpt(data.ogDescription,2000),keywords:excerpt(data.keywords,2000),
    h1,h2:headings.slice(0,100).map(h=>excerpt(h,2000)),bodyText:excerpt(ownText,8000),
  };
  if(fits(full))return full;
  // Keyword selection uses the community's identity excerpts and board names.
  // The complete navigation and sampled pages remain in the diagnostic report.
  const identity=community?{...community,evidence:community.evidence.map(e=>({text:excerpt(e.text,300),locator:excerpt(e.locator,100)})),
    navigation:[],pages:[],attempts:[],note:''}:undefined;
  for(const limit of HINT_METADATA_LIMITS.compact){
    const compact:Hints={
      ...metadata(limit),scope,communityContext:identity,ogTitle:excerpt(full.ogTitle,limit),
      ogDescription:excerpt(full.ogDescription,limit),keywords:excerpt(full.keywords,limit),
      h1:h1.slice(0,3).map(h=>excerpt(h,limit)),h2:headings.slice(0,8).map(h=>excerpt(h,limit)),
      bodyText:excerpt(ownText,limit*8),
    };
    if(fits(compact))return compact;
  }
  return null;
}

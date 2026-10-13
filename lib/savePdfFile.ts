import type { PdfPhase } from './saas/activityTypes';
export type SavePicker = (options:{suggestedName:string;types:{description:string;accept:Record<string,string[]>}[]})=>Promise<{createWritable:()=>Promise<{write:(blob:Blob)=>Promise<void>;close:()=>Promise<void>;abort:()=>Promise<void>}>}>;
/** Only a closed file stream confirms a save. Anchor downloads have no completion API. */
export async function savePdfFile({blob,filename,picker,handoff,record}:{blob:Blob;filename:string;picker?:SavePicker;handoff:()=>void;record:(phase:PdfPhase)=>Promise<unknown>}){
  if(!picker){
    handoff();
    try{await record('save');}catch{throw Error('다운로드를 전달했지만 이용 기록을 전송하지 못했습니다.');}
    return 'requested' as const;
  }
  // Open the picker synchronously in the click gesture, before any network await.
  const selection=picker({suggestedName:filename,types:[{description:'PDF 문서',accept:{'application/pdf':['.pdf']}}]})
    .then(handle=>({handle,error:null}),error=>({handle:null,error}));
  await record('save_started');
  const selected=await selection;
  let stream:Awaited<ReturnType<NonNullable<typeof selected.handle>['createWritable']>>|undefined;
  try{
    if(selected.error)throw selected.error;
    if(!selected.handle)throw Error('파일 저장 위치를 확인하지 못했습니다.');
    stream=await selected.handle.createWritable();
    await stream.write(blob);await stream.close();
  }catch(error){
    if(stream)await stream.abort().catch(()=>{});
    const cancelled=error instanceof Error&&error.name==='AbortError';
    await record(cancelled?'save_cancelled':'save_failed');
    if(cancelled)return 'cancelled' as const;
    throw Error('PDF 파일을 저장하지 못했습니다. 저장 위치와 여유 공간을 확인해 주세요.');
  }
  try{await record('saved');}catch{throw Error('PDF 파일은 저장됐지만 완료 기록을 전송하지 못했습니다.');}
  return 'saved' as const;
}

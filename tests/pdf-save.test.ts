import assert from 'node:assert/strict';
import { test } from 'node:test';
import { savePdfFile, type SavePicker } from '../lib/savePdfFile';
const blob=new Blob(['test pdf'],{type:'application/pdf'});
test('save completion is recorded only after the stream is closed, with picker opened before network await',async()=>{
  const calls:string[]=[];
  const picker:SavePicker=async()=>{calls.push('picker');return {createWritable:async()=>({write:async()=>{calls.push('write');},close:async()=>{calls.push('close');},abort:async()=>{calls.push('abort');}})};};
  const result=await savePdfFile({blob,filename:'report.pdf',picker,handoff:()=>assert.fail('no fallback'),record:async phase=>{calls.push(phase);}});
  assert.equal(result,'saved');assert.deepEqual(calls,['picker','save_started','write','close','saved']);
});
test('picker cancellation and file-write errors never report a successful save',async()=>{
  for(const mode of ['cancel','write','close']){
    const phases:string[]=[];let aborted=false;
    const picker:SavePicker=async()=>{
      if(mode==='cancel')throw new DOMException('cancel','AbortError');
      return {createWritable:async()=>({write:async()=>{if(mode==='write')throw Error('disk');},close:async()=>{throw Error('close failed');},abort:async()=>{aborted=true;}})};
    };
    const run=savePdfFile({blob,filename:'report.pdf',picker,handoff:()=>{},record:async phase=>{phases.push(phase);}});
    if(mode==='cancel')assert.equal(await run,'cancelled');else{await assert.rejects(run);assert.equal(aborted,true);}
    assert.deepEqual(phases,['save_started',mode==='cancel'?'save_cancelled':'save_failed']);
  }
});
test('unsupported browsers report download handoff without claiming a completed save',async()=>{
  const calls:string[]=[];
  assert.equal(await savePdfFile({blob,filename:'report.pdf',handoff:()=>{calls.push('handoff');},record:async phase=>{calls.push(phase);}}),'requested');
  assert.deepEqual(calls,['handoff','save']);
});
test('a telemetry failure after writing does not mislabel the successful file as failed',async()=>{
  const phases:string[]=[];
  const picker:SavePicker=async()=>({createWritable:async()=>({write:async()=>{},close:async()=>{},abort:async()=>assert.fail('already saved')})});
  await assert.rejects(()=>savePdfFile({blob,filename:'report.pdf',picker,handoff:()=>{},record:async phase=>{phases.push(phase);if(phase==='saved')throw Error('network');}}),/파일은 저장됐지만/);
  assert.deepEqual(phases,['save_started','saved']);
});

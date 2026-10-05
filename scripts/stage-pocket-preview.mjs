import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=resolve(root,'consumer-app/dist');
const target=resolve(root,'public/pocket');
// Generated preview only. Native bundles retain their root-relative assets.
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
await cp(source,target,{recursive:true});
const html=(await readFile(resolve(source,'index.html'),'utf8'))
 .replaceAll('"/assets/','"/pocket/assets/')
 .replaceAll('"/icon.svg"','"/pocket/icon.svg"');
await writeFile(resolve(target,'index.html'),html);
console.log('Pocket preview staged at /pocket/index.html');

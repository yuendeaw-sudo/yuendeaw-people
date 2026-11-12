// Actual endpoint with controlled PostgREST response, no real HR reads.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import ts from 'typescript';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const dir=resolve('.tmp/directory-test');await mkdir(dir,{recursive:true});
const source=(await readFile('app/api/directory/is-employee/route.ts','utf8')).replace('from "next/server"','from "next/server.js"');
await writeFile(resolve(dir,'route.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
const {GET}=await import(pathToFileURL(resolve(dir,'route.mjs')));
const keys=['DIRECTORY_API_TOKEN','COMMUNEED_DIRECTORY_API_TOKEN','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const originalFetch=globalThis.fetch;
let reads=0,status='active';
globalThis.fetch=async(url,options)=>{reads++;assert.equal(new URL(url).origin,'https://directory.example.invalid');assert.ok(String(url).includes('select=status'));assert.equal(options.cache,'no-store');return Response.json([{status}])};
async function call(token,expected){const req=new Request('https://people.example.invalid/api/directory/is-employee?email=person%40example.invalid',{headers:token===null?{}:{Authorization:'Bearer '+token}});const r=await GET(req);assert.equal(r.status,expected);const body=await r.json();assert.ok(!JSON.stringify(body).includes('synthetic-'));if(expected===200){assert.equal(r.headers.get('Cache-Control'),'no-store');assert.deepEqual(body,{employee:['active','probation','intern','freelance'].includes(status),status})}}
try{
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://directory.example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-service';
 delete process.env.DIRECTORY_API_TOKEN;delete process.env.COMMUNEED_DIRECTORY_API_TOKEN;
 await call(null,503);await call('unknown',503);assert.equal(reads,0);
 process.env.DIRECTORY_API_TOKEN='synthetic-existing';
 await call(null,401);await call('unknown',401);assert.equal(reads,0);await call('synthetic-existing',200);
 process.env.COMMUNEED_DIRECTORY_API_TOKEN='synthetic-communeed';
 await call('synthetic-existing',200);await call('synthetic-communeed',200);const before=reads;
 await call(null,401);await call('unknown',401);assert.equal(reads,before);
 delete process.env.DIRECTORY_API_TOKEN;await call('synthetic-existing',401);await call('synthetic-communeed',200);
 for(status of ['probation','intern','freelance','inactive','alumni','candidate'])await call('synthetic-communeed',200);
 console.log('PASS actual directory handler: existing-only, both tokens, Communeed-only, no/invalid token denied before HR read; status contract and no-store unchanged');
}finally{globalThis.fetch=originalFetch;for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}}

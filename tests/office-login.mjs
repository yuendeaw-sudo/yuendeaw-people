import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import ts from 'typescript';
const dir=resolve('.tmp/office-login');await mkdir(dir,{recursive:true});
for(const name of ['office-policy','office-crypto']){
 const source=await readFile('lib/'+name+'.ts','utf8');
 await writeFile(resolve(dir,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
}
const {isCurrentStaff,localReturnPath}=await import(pathToFileURL(resolve(dir,'office-policy.mjs')));
const {seal,unseal}=await import(pathToFileURL(resolve(dir,'office-crypto.mjs')));
const id='11111111-1111-4111-8111-111111111111';
assert.equal(isCurrentStaff(null,id),false);
for(const type of ['full_time','probation','part_time','hybrid','intern']){
 for(const status of ['active','probation','intern'])assert.equal(isCurrentStaff({user_id:id,status,employment_types:{key:type}},id),true);
 for(const status of ['inactive','alumni','candidate','freelance','unknown',''])assert.equal(isCurrentStaff({user_id:id,status,employment_types:{key:type}},id),false);
}
for(const key of ['freelance','candidate','alumni','specialist','project_based','unknown',''])assert.equal(isCurrentStaff({user_id:id,status:'active',employment_types:{key}},id),false);
assert.equal(isCurrentStaff({user_id:'another',status:'active',employment_types:{key:'full_time'}},id),false);
for(const path of ['https://evil.invalid','//evil.invalid','/\\evil.invalid',' /office','/\noffice'])assert.equal(localReturnPath(path),'/office');
assert.equal(localReturnPath('/oauth/consent?authorization_id=synthetic'),'/oauth/consent?authorization_id=synthetic');
const secret='synthetic-only-key-at-least-43-characters-long';
const value={accessToken:'synthetic-sensitive-token',clientId:'synthetic-client',expiresAt:Date.now()+1000};
const encrypted=seal(value,secret,'www.yuendeaw.com:session');
assert.ok(!encrypted.includes(value.accessToken));
assert.deepEqual(unseal(encrypted,secret,'www.yuendeaw.com:session'),value);
assert.equal(unseal(encrypted,secret,'aioffice.yuendeaw.com:session'),null);
assert.equal(unseal(encrypted,secret,'www.yuendeaw.com:flow'),null);
assert.equal(unseal(encrypted,'wrong-but-long-key-at-least-43-characters-long','www.yuendeaw.com:session'),null);
assert.equal(unseal('tampered'+encrypted,secret,'www.yuendeaw.com:session'),null);
assert.equal(unseal(encrypted,'','www.yuendeaw.com:session'),null);
console.log('PASS current staff/type/status/user binding, deny external/former/freelance accounts, local redirects, encrypted host/purpose-bound sessions and tamper rejection');

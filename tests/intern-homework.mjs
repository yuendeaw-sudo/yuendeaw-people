import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const config=JSON.parse(fs.readFileSync('lib/creative-intern-questions.json','utf8'));
function load(file,deps){const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};vm.runInNewContext(source,{exports,require:n=>n in deps?deps[n]:require(n),Buffer,Date,Response,Request,process:{env:{RESEND_API_KEY:'test-only',RESEND_FROM:'test@example.com',NEXT_PUBLIC_SITE_URL:'https://people.example'}},console});return exports}
const util=load('lib/intern-homework.ts',{'@/lib/applications':{CREATIVE_INTERN_SET:config}});
const id='11111111-1111-4111-8111-111111111111',otherId='22222222-2222-4222-8222-222222222222';
const token=util.createHomeworkToken(id),base={token_hash:util.tokenHash(token),expires_at:new Date(Date.now()+60000).toISOString()};
assert(util.validHomeworkToken(token,base));assert(!util.validHomeworkToken(util.createHomeworkToken(otherId),base));assert(!util.validHomeworkToken(token,{token_hash:'bad'}));assert(!util.tokenApplicationId('bad'));assert(util.homeworkExpired({expires_at:'bad'}));assert(util.homeworkExpired({expires_at:new Date(0).toISOString()}));
const answers={q1:'สามช่องที่ชอบ',q2:'E',q3:'B',q4:'รับฟังทีม',q5:'คุยกัน'};
assert(util.validateHomeworkAnswers(answers));assert(!util.validateHomeworkAnswers({...answers,q3:'A,B'}));assert(!util.validateHomeworkAnswers({...answers,q5:' '}));assert(!util.validateHomeworkAnswers({...answers,q1:'x'.repeat(12001)}));
let row,context,emails=[],sendOk=true,casConflict=false,version=0;
function reset(){row={id,email:'candidate@example.com',applicant_type:'internship',interested_roles:['creative_content_creator'],answers:{primary_role:'creative_content_creator',university:'kept'},updated_at:'v0'};context={isOwner:true,userId:'staff'};emails=[];sendOk=true;casConflict=false;version=0}
const admin={from(){let patch,filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},update(p){patch=p;return q},async maybeSingle(){if(filters.some(([k,v])=>row[k]!==v)||patch&&casConflict)return {data:null,error:null};if(patch){row={...row,...structuredClone(patch),updated_at:'v'+(++version)}}return {data:structuredClone(row),error:null}}};return q}};
const deps={'@/lib/auth':{getAccessContext:async()=>context,audit:async()=>{}},'@/lib/permissions':{can:()=>false},'@/lib/supabase/admin':{createAdminClient:()=>admin},'@/lib/email':{sendEmail:async o=>{emails.push(o);return sendOk},emailShell:s=>s,emailButton:(url,label)=>`<a href="${url}">${label}</a>`},'@/lib/applications':{CREATIVE_INTERN_SET:config},'@/lib/intern-homework':util};
const staff=load('app/api/applications/[id]/homework/route.ts',deps),pub=load('app/api/intern-homework/[token]/route.ts',deps);
const request=body=>new Request('https://people.example/api',{method:'POST',body:JSON.stringify(body)}),staffParams={params:Promise.resolve({id})};
reset();context=null;assert.equal((await staff.POST(request({action:'invite',role:'creative_content_creator'}),staffParams)).status,401);assert.equal(emails.length,0);
reset();context={isOwner:false};assert.equal((await staff.POST(request({action:'invite',role:'creative_content_creator'}),staffParams)).status,403);
reset();row.interested_roles=['graphic_ai_designer'];row.answers.primary_role='graphic_ai_designer';assert.equal((await staff.POST(request({action:'invite',role:'creative_content_creator'}),staffParams)).status,400);assert.equal(emails.length,0);
reset();casConflict=true;assert.equal((await staff.POST(request({action:'invite',role:'creative_content_creator'}),staffParams)).status,409);assert.equal(emails.length,0);
reset();sendOk=false;assert.equal((await staff.POST(request({action:'invite',role:'creative_content_creator'}),staffParams)).status,502);assert.equal(row.answers.homework.email_delivery,'failed');
reset();assert.equal((await staff.POST(request({action:'invite',role:'creative_content_creator'}),staffParams)).status,200);assert.equal(emails.length,1);assert.equal(row.stage,'homework_sent');assert.equal(row.answers.university,'kept');assert(!emails[0].html.includes('token_hash'));
const invitedToken=emails[0].html.match(/homework\/([^"<]+)/)[1],params={params:Promise.resolve({token:invitedToken})};
const get=await pub.GET(new Request('https://people.example/api'),params);assert.equal(get.status,200);const body=await get.json();assert.equal(body.questions.length,5);assert(!('email' in body));assert(!('token_hash' in body));
assert.equal((await pub.POST(request({answers:{q1:'only'}}),params)).status,400);
assert.equal((await pub.POST(request({answers}),params)).status,200);assert.equal(row.stage,'homework_submitted');assert.equal(row.answers.university,'kept');assert.equal((await pub.POST(request({answers}),params)).status,409);assert.equal((await (await pub.GET(new Request('https://people.example/api'),params)).json()).submitted,true);
assert.equal((await staff.POST(request({action:'review',decision:'pass',note:'พร้อมสัมภาษณ์'}),staffParams)).status,200);assert.equal(row.stage,'homework_reviewed');assert.equal(row.answers.homework.review.decision,'pass');
// A reissued link invalidates the old token.
reset();await staff.POST(request({action:'invite',role:'creative_content_creator'}),staffParams);row.answers.homework.invited_at=new Date(0).toISOString();await staff.POST(request({action:'invite',role:'creative_content_creator'}),staffParams);assert.equal((await pub.GET(new Request('https://people.example/api'),params)).status,404);
// The initial form cannot render/submit this homework or set reserved workflow state.
const initial=fs.readFileSync('public/internship/apply/apply.js','utf8');assert(!initial.includes('creativeQuestions'));assert(!initial.includes('creativeSet'));
assert(fs.readFileSync('app/api/applications/submit/route.ts','utf8').includes('delete applicationAnswers.homework'));
console.log('PASS: staff authorization, role matching, email failure, CAS conflict, private token access, validation, single submission, review, link rotation and initial-form isolation');

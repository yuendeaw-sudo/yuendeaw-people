import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const dir = resolve('.tmp/calendar-test');
await mkdir(dir, {recursive: true});
const source = await readFile('lib/company-calendar.ts', 'utf8');
await writeFile(resolve(dir, 'calendar.mjs'), ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText);
const {COMPANY_HOLIDAYS, bangkokDate, summarizeLeave} = await import(pathToFileURL(resolve(dir, 'calendar.mjs')));
const holidays = COMPANY_HOLIDAYS[2027];
assert.equal(holidays.length, 16);
assert.equal(new Set(holidays.map(h => h.date)).size, 16);
assert.equal(holidays.filter(h => h.special).length, 3);
for (const h of holidays) {
  assert.ok(![0,6].includes(new Date(h.date+'T00:00:00Z').getUTCDay()));
  const month = h.date.slice(5,7);
  if (!['04','12'].includes(month)) assert.ok(holidays.filter(x => x.date.slice(5,7) === month).length <= 3);
}
assert.ok(holidays.some(h => h.date === '2027-02-08'));
assert.ok(holidays.some(h => h.date === '2027-12-27'));
assert.ok(!holidays.some(h => ['2027-04-06','2027-05-04','2027-02-22'].includes(h.date)));
assert.equal(COMPANY_HOLIDAYS[2026], undefined);
assert.equal(bangkokDate(new Date('2026-12-31T17:01:00Z')), '2027-01-01');
const row=(key, start, status, total_days=1)=>({id:start+status+key,key,name:key,start_date:start,end_date:start,total_days,status});
const result = summarizeLeave([
  row('sick','2027-01-04','approved',0.5), row('sick','2027-01-06','approved',2),
  row('personal','2027-01-05','approved'), row('annual','2027-02-01','approved',3),
  row('sick','2027-01-03','rejected',5), row('personal','2027-01-05','cancelled',2),
  row('annual','2027-01-02','pending'), row('annual','2027-01-02','awaiting_confirm'),
  row('sick','2026-12-31','approved',5),
],2027,'2027-01-05');
assert.equal(result.sick,0.5);assert.equal(result.personal,1);assert.equal(result.annual,0);
assert.equal(result.planned.length,2);assert.equal(result.pending.length,2);
assert.equal(summarizeLeave([],2027,'2026-11-12').sick,0);
console.log('PASS 16 holidays / 13 traditional + 3 special, substitutes, monthly limits, unpublished years, Bangkok year boundary, half-days, started vs planned vs pending and cancelled/rejected exclusion');

const wfh = summarizeLeave([
  row('wfh','2027-01-02','approved',1), row('wfh','2027-01-05','approved',0.5),
  row('wfh','2027-01-06','approved',1), row('wfh','2027-01-03','cancelled',1),
  row('wfh','2027-01-03','rejected',1), row('wfh','2027-01-03','pending',1),
  row('wfh','2027-01-03','awaiting_confirm',1), row('wfh','2026-12-01','approved',3),
],2027,'2027-01-05');
assert.equal(wfh.wfh,1.5);
assert.equal(wfh.sick,0);assert.equal(wfh.personal,0);assert.equal(wfh.annual,0);
assert.equal(wfh.planned.length,0);assert.equal(wfh.pending.length,0);
console.log('PASS WFH recorded days: approved through selected date only, includes half-days, excludes future/other years/rejected/cancelled/pending; never mixed into leave bookings');

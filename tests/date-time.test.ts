import test from 'node:test'
import assert from 'node:assert/strict'
import {formatLocalDateTime,getDeviceTimeZone,localInputToUtc,utcToLocalInput,timestampDate,localDateKey} from '../src/lib/dateTime.ts'
const moment='2027-01-15T23:30:00Z'
test('device-local dates and RU/UZ formatting preserve a single UTC instant across countries',()=>{
 const previous=process.env.TZ
 try{
  for(const [zone,time,date] of [['Asia/Tashkent','04:30','2027-01-16'],['Europe/Riga','01:30','2027-01-16'],['America/New_York','18:30','2027-01-15'],['UTC','23:30','2027-01-15']]){
   process.env.TZ=zone;assert.equal(getDeviceTimeZone(),zone);assert.equal(localDateKey(moment),date)
   for(const language of ['ru','uz'])assert.match(formatLocalDateTime(moment,language),new RegExp(time))
   assert.equal(timestampDate('2027-01-15T23:30:00').toISOString(),'2027-01-15T23:30:00.000Z')
   assert.equal(timestampDate('2027-01-16T04:30:00+05:00').toISOString(),'2027-01-15T23:30:00.000Z')
  }
  assert.equal(formatLocalDateTime(null),'—');assert.equal(formatLocalDateTime('bad'),'—')
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous}
})
test('new schedules use device DST rules; changing timezone changes the label, not the selected instant',()=>{
 const previous=process.env.TZ
 try{
  process.env.TZ='America/New_York'
  const utc=localInputToUtc('2027-07-01T15:00');assert.equal(utc,'2027-07-01T19:00:00.000Z')
  assert.equal(localInputToUtc('2027-01-01T15:00'),'2027-01-01T20:00:00.000Z')
  assert.throws(()=>localInputToUtc('2027-03-14T02:30'),/Invalid local time/)
  assert.throws(()=>localInputToUtc('2027-02-30T15:00'),/Invalid local time/)
  assert.equal(localInputToUtc('2027-11-07T01:30'),'2027-11-07T05:30:00.000Z')
  process.env.TZ='Asia/Tashkent';assert.equal(utcToLocalInput(utc),'2027-07-02T00:00');assert.equal(localInputToUtc(utcToLocalInput(utc)),utc)
  assert.equal(localInputToUtc(''),'');assert.equal(utcToLocalInput(null),'')
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous}
})

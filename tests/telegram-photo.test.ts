import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {approvedProductImage,compatiblePhoto} from '../server/telegramPhoto.ts'
test('Telegram photo accepts only the configured public catalogue origin and rejects redirects/query sources',()=>{
 const root='https://fixture.supabase.co',url=root+'/storage/v1/object/public/product-images/a.png';assert.equal(approvedProductImage(url,root),url);for(const value of ['http://fixture.supabase.co/storage/v1/object/public/product-images/a.png','https://evil.test/a.jpg',url+'?redirect=evil',root+'/storage/v1/object/public/receipts/a.png'])assert.equal(approvedProductImage(value,root),null)
})
test('square, vertical and horizontal sources become bounded baseline JPEGs with real proportions and separate previews',async()=>{
 for(const [width,height] of [[1000,1000],[1242,1654],[1800,900]]){
  const source=await sharp({create:{width,height,channels:4,background:{r:130,g:80,b:25,alpha:0.5}}}).png().toBuffer(),r=await compatiblePhoto(source),m=await sharp(r.data).metadata(),thumb=await sharp(r.thumb).metadata()
  assert.equal(m.format,'jpeg');assert.equal(m.isProgressive,false);assert.equal(m.width,r.width);assert.equal(m.height,r.height);assert.ok(Math.abs(r.width/r.height-width/height)<0.002);assert.ok(r.width<=1280&&r.height<=1280);assert.ok(thumb.width<=320&&thumb.height<=320);assert.ok(r.data.length<5*1024*1024);assert.equal(m.hasAlpha,false)
 }
 const rotated=await sharp({create:{width:100,height:200,channels:3,background:'#123456'}}).jpeg().withMetadata({orientation:6}).toBuffer(),r=await compatiblePhoto(rotated);assert.equal(r.width,200);assert.equal(r.height,100)
 await assert.rejects(()=>compatiblePhoto(Buffer.from('not an image')))
})

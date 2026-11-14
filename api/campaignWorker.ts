import type {VercelRequest,VercelResponse} from '../server/types.ts'
import {database,fail,start} from '../server/http.ts'
import {HttpError} from '../server/auth.ts'
import {runCampaignBatch} from '../server/campaignDelivery.ts'
export default async function handler(req:VercelRequest,res:VercelResponse){
 try{
  start(req,res)
  const auth=req.headers.authorization;if(typeof auth!=='string'||!/^Bearer [a-f0-9]{64}$/.test(auth))throw new HttpError(401,'Unauthorized')
  const db=database(),{data:allowed,error}=await db.rpc('store_worker_authorized',{p_token:auth.slice(7)})
  if(error||allowed!==true)throw new HttpError(401,'Unauthorized')
  const processed=await runCampaignBatch(db);return res.json({success:true,processed})
 }catch(error){return fail(res,error)}
}

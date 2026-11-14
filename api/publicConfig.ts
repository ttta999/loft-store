import type {VercelRequest,VercelResponse} from '../server/types.ts'
import {miniAppBase} from '../server/links.ts'
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('X-Content-Type-Options','nosniff')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'})}
 try{const base=await miniAppBase();res.setHeader('Cache-Control','public, s-maxage=600');return res.json({miniAppBase:base})}catch{res.setHeader('Cache-Control','no-store');return res.status(503).json({miniAppBase:null})}
}

export type CampaignContent={title:string;message:string;image_ref?:string|null;button_label:string;target_type:string;target_id?:string|null}
const escape=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
export function campaignMessage(c:CampaignContent){
 const plain=`${c.title}\n\n${c.message}`,limit=c.image_ref?1024:4096
 if(!c.title.trim()||!c.message.trim()||plain.length>limit||!c.button_label.trim()||c.button_label.length>64)throw new Error(`Сообщение превышает лимит ${limit} символов или содержит пустые поля`)
 return {plain,html:`<b>${escape(c.title)}</b>\n\n${escape(c.message)}`,limit}
}

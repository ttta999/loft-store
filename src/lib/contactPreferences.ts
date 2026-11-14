import type {Preferences} from './preferences'
export const normalizedText=(value:string)=>value.trim().replace(/\s+/g,' ').toLocaleLowerCase('ru')
export const normalizedPhone=(value:string)=>value.replace(/\D/g,'')
export function needsContactSave(p:Preferences|null,name:string,phone:string,address:string,delivery:boolean){
 if(!p)return false
 return !p.name.trim()||!normalizedPhone(p.phone)||normalizedText(p.name)!==normalizedText(name)||normalizedPhone(p.phone)!==normalizedPhone(phone)||(delivery&&!!address.trim()&&!p.addresses.some(a=>normalizedText(a.address)===normalizedText(address)))
}

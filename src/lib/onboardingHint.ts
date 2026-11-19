/** Non-sensitive presentation hint only. Never authorizes requests or completes onboarding on the server. */
export type OnboardingHint={language:'ru'|'uz';completed:boolean}
const key=(id:string|number)=>`loft-intro-v1:${id}`
export function readOnboardingHint(id:string|number|undefined):OnboardingHint|null{
 if(!id)return null
 try{const value=JSON.parse(localStorage.getItem(key(id))||'null');return value&&['ru','uz'].includes(value.language)&&typeof value.completed==='boolean'?value:null}catch{return null}
}
export function writeOnboardingHint(id:string|number,hint:OnboardingHint){try{localStorage.setItem(key(id),JSON.stringify(hint))}catch{/* Private mode still uses verified server state. */}}

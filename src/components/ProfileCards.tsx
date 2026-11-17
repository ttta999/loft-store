import type {ReactNode} from 'react'
export function ListHeaderCard({title,subtitle,icon,transitionKey}:{title:string;subtitle?:string;icon:ReactNode;transitionKey?:string}) {
 return <div data-profile-surface={transitionKey} className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 min-h-[74px] flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="text-xl font-bold text-[#1B2A4A] dark:text-white break-words">{title}</h2>{subtitle&&<p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">{subtitle}</p>}</div><div data-profile-icon className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">{icon}</div></div>
}
export function EmptyStateCard({icon,text,title}:{icon:ReactNode;text:string;title?:string}) {
 return <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-8 text-center"><div className="w-14 h-14 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border mx-auto mb-3 flex items-center justify-center">{icon}</div>{title&&<h3 className="font-bold text-[#1B2A4A] dark:text-white mb-2">{title}</h3>}<p className="text-sm text-[#8A8275] dark:text-gray-300">{text}</p></div>
}

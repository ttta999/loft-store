import {ListHeaderCard} from './ProfileCards'
import {Ruler} from 'lucide-react'
import SavedSizeRow from './SavedSizeRow'
import {usePreferences} from '../lib/preferences'
import {useStore} from '../store/useStore'
export default function SavedSizes(){
 const {language,ensureCategories}=useStore(),ru=language==='ru',categories=ensureCategories()||[],{data,error,loading,save}=usePreferences()
 const setSize=async(sub:any,category:string,system:string,size?:string)=>{if(!data)return false;const sizes=data.sizes.filter(v=>v.subcategory!==sub.id||v.system!==system);if(size)sizes.push({category,subcategory:sub.id,system,size});await save({sizes})}
 return <div data-loft-content className="p-4 pb-28 text-[#1B2A4A] dark:text-white"><ListHeaderCard title={ru?'Мои размеры':'Mening o‘lchamlarim'} subtitle={ru?'Сохраните размеры для удобного выбора товаров':'Mahsulotlarni qulay tanlash uchun o‘lchamlaringizni saqlang'} icon={<Ruler size={20}/>}/>{loading&&<p role="status">{ru?'Загрузка...':'Yuklanmoqda...'}</p>}{error&&<p role="alert">{error}</p>}{data&&categories.map(c=>{const subs=c.subcategories.filter(s=>s.id!=='all'&&s.sizes?.length&&s.size_type!=='one_size');return subs.length>0&&<section key={c.id} className="mb-4"><h2 className="text-xs font-bold px-3 mb-2 text-[#8A8275] dark:text-gray-300">{ru?c.name_ru:c.name_uz}</h2><div className="rounded-2xl overflow-hidden border border-[#E8E2D5] dark:border-dark-border bg-[#FBF9F4] dark:bg-dark-card divide-y divide-[#E8E2D5] dark:divide-dark-border">{subs.map(s=><SavedSizeRow key={s.id} sub={s} category={c.id} language={language} saved={data.sizes.filter(v=>v.subcategory===s.id)} onSave={(system,size)=>setSize(s,c.id,system,size)}/>)}</div></section>})}</div>
}

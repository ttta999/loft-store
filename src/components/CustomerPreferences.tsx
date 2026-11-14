import { useEffect, useState } from 'react'
import { Check, Plus, Trash2, User, Ruler, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { usePreferences, type SavedAddress, type SavedSize } from '../lib/preferences'
import { useStore } from '../store/useStore'
import Collapse from './Collapse'
const card='bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-4 mb-3'
const input='w-full p-3 rounded-xl bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border text-base focus:outline-none focus:border-[#C9A961]'
const button='px-4 py-3 rounded-xl font-bold bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] flex items-center justify-center gap-2 disabled:opacity-50'
export default function CustomerPreferences({section}:{section:'personal'|'sizes'}){
 const {language,ensureCategories}=useStore(),ru=language==='ru',categories=ensureCategories()||[]
 const {data,error,loading,save}=usePreferences()
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[method,setMethod]=useState<'pickup'|'delivery'>('pickup'),[addresses,setAddresses]=useState<SavedAddress[]>([]),[sizes,setSizes]=useState<SavedSize[]>([]),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false)
 const [editing,setEditing]=useState<SavedAddress|null>(null),[subId,setSubId]=useState(''),[size,setSize]=useState('')
 useEffect(()=>{if(data&&!dirty){setName(data.name);setPhone(data.phone);setMethod(data.delivery_method);setAddresses(data.addresses);setSizes(data.sizes)}},[data,dirty])
 const subs=categories.flatMap(c=>c.subcategories.filter(s=>s.id!=='all'&&s.sizes.length).map(s=>({...s,category:c})))
 const selected=subs.find(s=>s.id===subId)
 const commit=async()=>{setBusy(true);try{await save(section==='personal'?{name:name.trim(),phone,delivery_method:method,addresses}:{sizes});setDirty(false);toast.success(ru?'Сохранено':'Saqlandi')}catch(e){toast.error(e instanceof Error?e.message:'Ошибка')}finally{setBusy(false)}}
 const addAddress=()=>{if(!editing)return;if(!editing.label.trim()||editing.address.trim().length<5){toast.error(ru?'Укажите название и полный адрес':'Nom va to‘liq manzilni kiriting');return}setAddresses(old=>[...old.filter(a=>a.id!==editing.id).map(a=>editing.is_default?{...a,is_default:false}:a),{...editing,label:editing.label.trim(),address:editing.address.trim()}]);setEditing(null);setDirty(true)}
 return <div data-loft-content className="p-4 pb-24 text-[#1B2A4A] dark:text-white">
  <header className={`${card} flex items-center justify-between`}><h1 className="text-xl font-bold">{section==='personal'?(ru?'Личные данные':'Shaxsiy ma’lumotlar'):(ru?'Мои размеры':'Mening o‘lchamlarim')}</h1>{section==='personal'?<User size={24}/>:<Ruler size={24}/>}</header>
  {loading&&<p role="status" className={card}>{ru?'Загрузка...':'Yuklanmoqda...'}</p>}
  {error&&<p role="alert" className={card}>{error}</p>}
  {data&&<>{section==='personal'?<>
   <div className={`${card} space-y-3`}>
    <label className="block text-sm">{ru?'Имя':'Ism'}<input autoComplete="name" className={`${input} mt-1`} value={name} maxLength={120} onChange={e=>{setName(e.target.value);setDirty(true)}}/></label>
    <label className="block text-sm">{ru?'Телефон':'Telefon'}<input autoComplete="tel" type="tel" className={`${input} mt-1`} value={phone} maxLength={13} placeholder="+998" onChange={e=>{setPhone(e.target.value.replace(/[^+0-9]/g,''));setDirty(true)}}/></label>
    <label className="block text-sm">{ru?'Предпочитаемый способ получения':'Afzal olish usuli'}<select className={`${input} mt-1`} value={method} onChange={e=>{setMethod(e.target.value as typeof method);setDirty(true)}}><option value="pickup">{ru?'Самовывоз':'Olib ketish'}</option><option value="delivery">{ru?'Доставка':'Yetkazib berish'}</option></select></label>
   </div>
   <section className={card}><h2 className="font-bold mb-3 flex gap-2 items-center"><MapPin size={18}/>{ru?'Адреса доставки':'Yetkazib berish manzillari'}</h2>
    {!addresses.length&&<p className="text-sm text-[#8A8275] dark:text-gray-300 mb-3">{ru?'Сохранённых адресов пока нет':'Saqlangan manzillar yo‘q'}</p>}
    {addresses.map(a=><div key={a.id} className="border-t border-[#E8E2D5] dark:border-dark-border py-3"><div className="flex justify-between gap-3"><button className="text-left flex-1" onClick={()=>setEditing({...a})}><strong>{a.label}</strong>{a.is_default&&<Check size={16} className="inline ml-2"/>}<p className="text-sm mt-1">{a.address}</p>{a.comment&&<p className="text-xs text-[#8A8275] dark:text-gray-300">{a.comment}</p>}</button><button aria-label={ru?'Удалить адрес':'Manzilni o‘chirish'} onClick={()=>{setAddresses(addresses.filter(v=>v.id!==a.id));setDirty(true)}}><Trash2 size={18}/></button></div></div>)}
    {addresses.length<10&&<button className={button} onClick={()=>setEditing({id:crypto.randomUUID(),label:'',address:'',comment:'',is_default:addresses.length===0})}><Plus size={18}/>{ru?'Добавить адрес':'Manzil qo‘shish'}</button>}
    <Collapse open={!!editing}><div className="space-y-3 mt-4">{editing&&<>
     <label className="block text-sm">{ru?'Название адреса':'Manzil nomi'}<input className={`${input} mt-1`} placeholder={ru?'Дом, работа...':'Uy, ish...'} maxLength={80} value={editing.label} onChange={e=>setEditing({...editing,label:e.target.value})}/></label>
     <label className="block text-sm">{ru?'Полный адрес':'To‘liq manzil'}<textarea className={`${input} mt-1`} maxLength={500} value={editing.address} onChange={e=>setEditing({...editing,address:e.target.value})}/></label>
     <label className="flex gap-2 items-center"><input type="checkbox" checked={editing.is_default} onChange={e=>setEditing({...editing,is_default:e.target.checked})}/>{ru?'По умолчанию':'Asosiy manzil'}</label>
     <div className="flex gap-3"><button className={button} onClick={addAddress}>{ru?'Применить адрес':'Manzilni qo‘llash'}</button><button onClick={()=>setEditing(null)}>{ru?'Отмена':'Bekor qilish'}</button></div>
    </>}</div></Collapse>
   </section>
  </>:<>
   <section className={card}><p className="text-sm text-[#8A8275] dark:text-gray-300 mb-4">{ru?'Сохраняйте размер для нужного типа товара. Системы размеров разных категорий не смешиваются.':'Kerakli mahsulot turi uchun o‘lchamni saqlang. Turli o‘lcham tizimlari aralashtirilmaydi.'}</p>
    {sizes.map(s=><div key={s.subcategory} className="py-3 border-t border-[#E8E2D5] dark:border-dark-border flex justify-between"><span>{subs.find(v=>v.id===s.subcategory)?.[ru?'name_ru':'name_uz']||s.subcategory}: <strong>{s.size}</strong></span><button aria-label={ru?'Удалить размер':'O‘lchamni o‘chirish'} onClick={()=>{setSizes(sizes.filter(v=>v.subcategory!==s.subcategory));setDirty(true)}}><Trash2 size={18}/></button></div>)}
    <label className="block text-sm mt-3">{ru?'Тип товара':'Mahsulot turi'}<select className={`${input} mt-1`} value={subId} onChange={e=>{setSubId(e.target.value);setSize('')}}><option value="">{ru?'Выберите подкатегорию':'Ichki toifani tanlang'}</option>{subs.map(s=><option key={s.id} value={s.id}>{s.category[ru?'name_ru':'name_uz']} · {s[ru?'name_ru':'name_uz']}</option>)}</select></label>
    {selected&&<label className="block text-sm mt-3">{ru?'Размер':'O‘lcham'}<select className={`${input} mt-1`} value={size} onChange={e=>setSize(e.target.value)}><option value="">{ru?'Выберите размер':'O‘lchamni tanlang'}</option>{selected.sizes.map(v=><option key={v}>{v}</option>)}</select></label>}
    <button className={`${button} mt-3`} disabled={!selected||!size} onClick={()=>{if(!selected)return;setSizes([...sizes.filter(s=>s.subcategory!==subId),{category:selected.category_id,subcategory:subId,system:selected.size_type,size}]);setDirty(true)}}><Plus size={18}/>{ru?'Сохранить размер':'O‘lchamni qo‘shish'}</button>
   </section>
  </>}
  <button className={`${button} w-full`} disabled={busy||!dirty||!!editing} onClick={()=>void commit()}><Check size={18}/>{busy?(ru?'Сохраняем...':'Saqlanmoqda...'):(ru?'Сохранить изменения':'O‘zgarishlarni saqlash')}</button>
  </>}
 </div>
}

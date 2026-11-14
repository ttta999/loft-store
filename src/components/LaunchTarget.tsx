import {useEffect,useRef} from 'react'
import {useNavigate} from 'react-router-dom'
import {authenticate} from '../lib/api'
import {decodeLaunch} from '../lib/launchTarget'
export default function LaunchTarget(){
 const navigate=useNavigate(),seen=useRef('')
 useEffect(()=>{let active=true
  const launch=async()=>{
   const tg=window.Telegram?.WebApp as any,params=new URLSearchParams(location.search)
   const value=tg?.initDataUnsafe?.start_param||params.get('tgWebAppStartParam')||params.get('launch')||''
   const key=`${tg?.initData||''}:${value}`;if(!value||seen.current===key)return
   const target=decodeLaunch(value);if(!target)return
   try{if(tg?.initData)await authenticate();if(!active||seen.current===key)return
    seen.current=key
    if(target.type==='product')navigate(`/product/${target.id}${target.variant?`?variant=${target.variant}`:''}`,{replace:true})
    else if(target.type==='brand')navigate(`/brands?brand=${target.id}`,{replace:true})
    else if(target.type==='category')navigate('/category',{replace:true,state:{categoryId:target.id}})
    else if(target.type==='new'||target.type==='sale')navigate('/all-products',{replace:true,state:{sortBy:target.type==='new'?'newest':'sale'}})
    else navigate('/',{replace:true})
   }catch{seen.current=''}
  }
  void launch();window.addEventListener('focus',launch);document.addEventListener('visibilitychange',launch)
  return()=>{active=false;window.removeEventListener('focus',launch);document.removeEventListener('visibilitychange',launch)}
 },[navigate])
 return null
}

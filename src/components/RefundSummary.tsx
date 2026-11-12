import { formatMoney, refundStatus } from '../lib/orderState'
export default function RefundSummary({refund,language,support}: {refund:any;language:string;support:string}) {
  if (!refund) return null
  const ru=language==='ru',descriptions:Record<string,string>=ru?{
    'Проверка платежа':'Мы проверяем информацию о вашем переводе. Если оплата поступила, менеджер оформит возврат средств.',
    'Ожидает возврата':'Ваш заказ отменён. Возврат средств будет обработан менеджером. Мы уведомим вас после выполнения перевода.',
    'Возврат выполнен':'Возврат средств выполнен.',
    'Возврат не требуется':'Мы проверили информацию об оплате. Возврат средств по этому заказу не требуется.',
  }:{
    'Проверка платежа':'O‘tkazmangiz haqidagi ma’lumotni tekshiryapmiz. To‘lov kelib tushgan bo‘lsa, menejer pulni qaytaradi.',
    'Ожидает возврата':'Buyurtma bekor qilindi. Menejer pulni qaytarishni amalga oshiradi. O‘tkazma bajarilgach, sizga xabar beramiz.',
    'Возврат выполнен':'Pul qaytarildi.',
    'Возврат не требуется':'To‘lov haqidagi ma’lumot tekshirildi. Bu buyurtma uchun pul qaytarish talab qilinmaydi.',
  }
  const confirmed=['Ожидает возврата','Возврат выполнен'].includes(refund.status)
  return <section data-refund-summary className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-4 mb-3">
    <h3 className="font-bold text-[#1B2A4A] dark:text-white">{ru?'Возврат средств':'Pulni qaytarish'}</h3>
    <p className="text-sm font-semibold text-[#C9A961] mt-2">{refundStatus(refund.status,language)}</p>
    <p className="text-sm text-[#8A8275] dark:text-gray-300 mt-2">{descriptions[refund.status]}</p>
    {confirmed&&refund.amount!=null&&refund.currency&&<p className="font-bold text-[#1B2A4A] dark:text-white mt-2">{ru?'Сумма':'Summa'}: {formatMoney(refund.amount,refund.currency,language)}</p>}
    {refund.completed_at&&<p className="text-xs text-[#8A8275] dark:text-gray-300 mt-2">{new Date(refund.completed_at).toLocaleString(ru?'ru-RU':'uz-UZ')}</p>}
    <a href={support} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm font-bold text-[#1B2A4A] dark:text-gold">{ru?'Поддержка':'Yordam'}</a>
  </section>
}

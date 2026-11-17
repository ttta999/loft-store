import {customerTranslator,type CustomerLanguage} from './customerLanguage.ts'
import { displayMoney } from '../src/lib/money.ts'
import type { TelegramOptions } from './notifications.ts'
export interface SpecialSnapshot {
  id: string | number
  status: string
  amount_uzs?: number
  exchange_rate?: number
  manager_price?: number
  currency?: string
  manager_comment?: string | null
  rejection_reason?: string | null
  order_id?: string | number | null
}
const escape = (value: unknown) => String(value ?? '').slice(0, 2000).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export function specialNotification(request: SpecialSnapshot,language:CustomerLanguage='ru'): { message: string; options: TelegramOptions } {
  const t=customerTranslator(language)
  if (!/^[1-9][0-9]*$/.test(String(request.id))) throw new Error('Invalid special request ID')
  const id = String(request.id)
  let paragraphs: string[]
  switch (request.status) {
    case 'На оценке': paragraphs = [t`📋 <b>Спецзаказ №${id} принят</b>`, t('Мы получили вашу заявку и передали её менеджеру для расчёта стоимости.'), t('Сообщим, когда предложение будет готово.')]; break
    case 'Оценён': {
      const price = request.amount_uzs != null ? Number(request.amount_uzs) : Number(request.exchange_rate)>0 ? Math.round(Number(request.manager_price)*Number(request.exchange_rate)) : NaN
      if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(price)) throw new Error('Invalid special quote')
      paragraphs = [t`💎 <b>Спецзаказ №${id} оценён</b>`, t`Стоимость: <b>${displayMoney(price,'UZS')}</b>`, request.manager_comment?.trim() ? escape(request.manager_comment.trim()) : '', t('Менеджер завершил расчёт стоимости вашего товара.'), t('Ознакомьтесь с предложением в приложении и решите, хотите ли вы оформить заказ.')]; break
    }
    case 'Оформлен':
      if (!/^[1-9][0-9]*$/.test(String(request.order_id))) throw new Error('Missing linked order')
      paragraphs = [t`✅ <b>Спецзаказ №${id} оформлен</b>`, t('Вы успешно оформили заказ на выбранный товар.'), t`Номер заказа: <b>№${request.order_id}</b>`, t('Следить за его дальнейшим статусом можно в разделе «Мои заказы».')]; break
    case 'Отменён': paragraphs = [t`❌ <b>Спецзаказ №${id} отменён</b>`, t('Вы отменили заявку на индивидуальный заказ.'), t('Если передумаете, вы всегда можете создать новую заявку.')]; break
    case 'Отклонён':
      if (!request.rejection_reason?.trim()) throw new Error('Missing rejection reason')
      paragraphs = [t`⚠️ <b>Спецзаказ №${id} отклонён</b>`, t('К сожалению, мы не можем выполнить вашу заявку.'), t`Причина: ${escape(request.rejection_reason.trim())}`, t('Вы можете обратиться в поддержку LOFT Store для подбора альтернативы.')]; break
    default: throw new Error('Unknown special status')
  }
  const target = request.status === 'Оформлен' ? `section=orders&order=${request.order_id}` : `section=china&request=${id}`
  return { message: paragraphs.filter(Boolean).join('\n\n'), options: {
    parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: request.status === 'Оформлен' ? t('Перейти к заказу') : request.status === 'Оценён' ? t('Открыть предложение') : t('Открыть заявку'), web_app: { url: `https://loft-store-24bz.vercel.app/profile?${target}` } }]] },
  } }
}

import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { FileText } from 'lucide-react'
import IslandHeader from '../components/IslandHeader'

interface DocSection {
  title: string
  paragraphs: string[]
}

const CONTENT: Record<'ru' | 'uz', { title: string; subtitle: string; sections: DocSection[] }> = {
  ru: {
    title: 'Пользовательское соглашение',
    subtitle: 'Действует с [ДАТА] · Версия 1.0',
    sections: [
      {
        title: 'Общие положения',
        paragraphs: [
          'Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между [НАЗВАНИЕ КОМПАНИИ] (ИНН [ИНН]) и пользователями приложения LOFT MENS SHOP (Telegram Mini App).',
          'Использование Приложения означает полное и безоговорочное принятие (акцепт) настоящего Соглашения. Если вы не согласны — не используйте Приложение.',
        ],
      },
      {
        title: 'Предмет и возможности приложения',
        paragraphs: [
          'Приложение предоставляет доступ к каталогу товаров, оформлению заказов, подаче заявок на спецзаказ и отслеживанию статусов.',
          'Приложение является Telegram Mini App и использует платформу Telegram для авторизации и сервисных уведомлений.',
        ],
      },
      {
        title: 'Порядок оформления заказа',
        paragraphs: [
          'Заказ оформляется через корзину: выбор товара и размера, указание контактных данных, выбор способа получения и оплаты.',
          'При предоплате заказ принимается в работу после подтверждения оплаты менеджером (скриншот перевода).',
          'Спецзаказ: заявка с описанием товара → оценка менеджера → предоплата → закупка товара.',
        ],
      },
      {
        title: 'Цены и порядок оплаты',
        paragraphs: [
          'Цены указаны в долларах США (USD). При выборе валюты UZS цены отображаются в сумах по курсу Оператора.',
          'Курс фиксируется на момент оформления заказа и сохраняется в данных заказа.',
          'Оплата — переводом на одну из двух карт Оператора в зависимости от валюты заказа либо при получении (для самовывоза).',
        ],
      },
      {
        title: 'Получение товара',
        paragraphs: [
          'Самовывоз: ТЦ Mercato, 2 этаж, магазин 34, Ташкент — ежедневно 10:00–20:00.',
          'Доставка: по согласованию с менеджером, по предоплате переводом.',
          'Срок доставки спецзаказа — в среднем 14–21 день с момента оплаты.',
        ],
      },
      {
        title: 'Возврат и обмен',
        paragraphs: [
          'Возврат и обмен товаров надлежащего качества, в том числе привезённых по спецзаказу, не осуществляются.',
          'Перед оформлением заказа проверяйте размер, цвет и комплектацию: в карточке товара есть фото и описание.',
          'Требования по товарам ненадлежащего качества рассматриваются в соответствии с законодательством РУз о защите прав потребителей.',
        ],
      },
      {
        title: 'Ответственность сторон',
        paragraphs: [
          'Цвет и оттенок товара могут отличаться от фото из-за настроек экрана устройства.',
          'Оператор не несёт ответственности за задержки, вызванные обстоятельствами непреодолимой силы.',
          'Пользователь отвечает за достоверность указанных контактных данных и адреса доставки.',
        ],
      },
      {
        title: 'Персональные данные',
        paragraphs: [
          'Обработка данных осуществляется согласно Политике конфиденциальности Приложения (/privacy).',
          'Подтверждая заказ, пользователь даёт согласие на обработку персональных данных.',
        ],
      },
      {
        title: 'Изменения условий',
        paragraphs: [
          'Оператор вправе изменять настоящее Соглашение в одностороннем порядке. Актуальная версия опубликована в Приложении по адресу /terms.',
        ],
      },
      {
        title: 'Контакты и реквизиты',
        paragraphs: [
          'Оператор: [НАЗВАНИЕ КОМПАНИИ], ИНН [ИНН]',
          'Email: [EMAIL], телефон: +998 93 378 87 70',
          'Магазин: ТЦ Mercato, 2 этаж, магазин 34, Ташкент',
        ],
      },
    ],
  },
  uz: {
    title: 'Foydalanish shartnomasi',
    subtitle: '[SANA] dan amal qiladi · Versiya 1.0',
    sections: [
      {
        title: 'Umumiy qoidalar',
        paragraphs: [
          'Ushbu Foydalanish shartnomasi (keyingi o\'rinlarda — «Shartnoma») [KOMPANIYA NOMI] (STIR [STIR]) va LOFT MENS SHOP ilovasi (Telegram Mini App) foydalanuvchilari o\'rtasidagi munosabatlarni tartibga soladi.',
          'Ilovadan foydalanish ushbu Shartnomaning to\'liq va so\'zsiz qabul qilinishini (aksept) anglatadi. Rozi bo\'lmasangiz — ilovadan foydalanmang.',
        ],
      },
      {
        title: 'Shartnoma predmeti va imkoniyatlar',
        paragraphs: [
          'Ilova mahsulotlar katalogi, buyurtma rasmiylashtirish, maxsus buyurtma so\'rovlari va holatlarni kuzatish imkonini beradi.',
          'Ilova Telegram Mini App hisoblanadi va avtorizatsiya hamda bildirishnomalar uchun Telegram platformasidan foydalanadi.',
        ],
      },
      {
        title: 'Buyurtma rasmiylashtirish tartibi',
        paragraphs: [
          'Buyurtma savat orqali rasmiylashtiriladi: mahsulot va o\'lchamni tanlash, kontakt ma\'lumotlarini kiritish, olish va to\'lov usulini tanlash.',
          'Oldindan to\'lovda buyurtma menejer to\'lovni tasdiqlagandan so\'ng (o\'tkazma skrinshoti) ishga qabul qilinadi.',
          'Maxsus buyurtma: mahsulot tavsifi bilan so\'rov → menejer bahosi → oldindan to\'lov → mahsulotni xarid qilish.',
        ],
      },
      {
        title: 'Narxlar va to\'lov tartibi',
        paragraphs: [
          'Narxlar AQSH dollarida (USD) belgilanadi. UZS valyutasini tanlaganda narxlar Operator kursida so\'mda ko\'rsatiladi.',
          'Valyuta kursi buyurtma rasmiylashtirish paytida qayd etiladi va buyurtma ma\'lumotlarida saqlanadi.',
          'To\'lov — buyurtma valyutasiga qarab Operatorning ikkita kartasidan biriga o\'tkazma yoki olishda (samovivoz uchun).',
        ],
      },
      {
        title: 'Mahsulotni olish',
        paragraphs: [
          'Samovivoz: Mercato SM, 2-qavat, 34-do\'kon, Toshkent — har kuni 10:00–20:00.',
          'Yetkazib berish: menejer bilan kelishuv bo\'yicha, o\'tkazma orqali oldindan to\'lov bilan.',
          'Maxsus buyurtma yetkazib berish muddati — to\'lovdan so\'ng o\'rtacha 14–21 kun.',
        ],
      },
      {
        title: 'Qaytarish va almashtirish',
        paragraphs: [
          'Sifatli tovarlarni, shu jumladan maxsus buyurtma asosida keltirilganlarni, qaytarish va almashtirish amalga oshirilmaydi.',
          'Buyurtmadan oldin o\'lcham, rang va komplektni tekshiring: mahsulot kartasida foto va tavsif mavjud.',
          'Nosifatli tovar bo\'yicha talablar iste\'molchilar huquqlarini himoya qilish to\'g\'risidagi O\'zR qonunchiligiga muvofiq ko\'rib chiqiladi.',
        ],
      },
      {
        title: 'Tomonlar mas\'uliyati',
        paragraphs: [
          'Mahsulot rangi va tusi ekran sozlamalari tufayli fotodan farq qilishi mumkin.',
          'Operator fors-major holatlar tufayli majburiyatlarni bajarishdagi kechikishlar uchun javob bermaydi.',
          'Foydalanuvchi kiritilgan kontakt ma\'lumotlari va yetkazib berish manzilining aniqligi uchun javobgar.',
        ],
      },
      {
        title: 'Shaxsiy ma\'lumotlar',
        paragraphs: [
          'Ma\'lumotlarni qayta ishlash Ilovaning Maxfiylik siyosatiga (/privacy) muvofiq amalga oshiriladi.',
          'Buyurtmani tasdiqlash orqali foydalanuvchi shaxsiy ma\'lumotlarini qayta ishlashga rozilik beradi.',
        ],
      },
      {
        title: 'Shartlarga o\'zgartirishlar',
        paragraphs: [
          'Operator ushbu Shartnomani bir tomonlama tartibda o\'zgartirishi mumkin. Amaldagi versiya ilovada /terms manzilida e\'lon qilinadi.',
        ],
      },
      {
        title: 'Aloqa va rekvizitlar',
        paragraphs: [
          'Operator: [KOMPANIYA NOMI], STIR [STIR]',
          'Email: [EMAIL], telefon: +998 93 378 87 70',
          'Do\'kon: Mercato SM, 2-qavat, 34-do\'kon, Toshkent',
        ],
      },
    ],
  },
}

export default function TermsPage() {
  const navigate = useNavigate()
  const { language } = useStore()
  const t = CONTENT[language === 'uz' ? 'uz' : 'ru']

  const handleBack = () => {
    const idx = (window.history.state as any)?.idx
    if (typeof idx === 'number' && idx > 0) navigate(-1)
    else navigate('/profile')
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <IslandHeader needsBack={true} onBack={handleBack} />

      <div className="p-4">
        {/* ✅ Шапка-карточка документа */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#1B2A4A] dark:text-white truncate">{t.title}</h1>
            <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-0.5">{t.subtitle}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-[#1B2A4A] dark:text-white" />
          </div>
        </div>

        {/* ✅ Секции документа — карточки с нумерацией */}
        {t.sections.map((s, i) => (
          <div
            key={i}
            className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border p-4 mb-3"
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[#1B2A4A] dark:text-white">{i + 1}</span>
              </div>
              <h2 className="text-sm font-bold text-[#1B2A4A] dark:text-white">{s.title}</h2>
            </div>
            <div className="space-y-2">
              {s.paragraphs.map((p, j) => (
                <p key={j} className="text-xs text-[#8A8275] dark:text-gray-300 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { ShieldCheck } from 'lucide-react'
import IslandHeader from '../components/IslandHeader'

interface DocSection {
  title: string
  paragraphs: string[]
}

const CONTENT: Record<'ru' | 'uz', { title: string; subtitle: string; sections: DocSection[] }> = {
  ru: {
    title: 'Политика конфиденциальности',
    subtitle: 'Действует с [ДАТА] · Версия 1.0',
    sections: [
      {
        title: 'Общие положения',
        paragraphs: [
          'Настоящая Политика конфиденциальности регулирует обработку персональных данных в приложении LOFT MENS SHOP (Telegram Mini App, далее — «Приложение»).',
          'Оператор: [НАЗВАНИЕ КОМПАНИИ], ИНН/СТИР [ИНН], адрес: [ЮР. АДРЕС] (далее — «Оператор»).',
          'Используя Приложение и подтверждая согласие при оформлении заказа, пользователь даёт согласие на обработку персональных данных.',
        ],
      },
      {
        title: 'Какие данные мы собираем',
        paragraphs: [
          'Данные профиля Telegram: имя, username, фото, Telegram ID — через Telegram Web App API.',
          'Данные, указанные пользователем: имя, номер телефона, адрес доставки.',
          'Данные заказов: состав корзины, суммы, валюта, статусы, скриншоты оплаты.',
          'Данные спецзаказов: название товара, ссылка, размер/цвет, комментарий, прикреплённые фото.',
          'Технические данные: IP-адрес, журналы запросов (облачный сервис Supabase).',
        ],
      },
      {
        title: 'Цели обработки',
        paragraphs: [
          'Оформление заказов, подтверждение оплаты и доставка товаров.',
          'Связь с пользователем: уведомления о статусах заказов и спецзаказов.',
          'Улучшение сервиса и аналитика популярности товаров.',
        ],
      },
      {
        title: 'Правовые основания',
        paragraphs: [
          'Согласие пользователя, выраженное в Приложении (флажок при оформлении заказа и спецзаявки).',
          'Закон Республики Узбекистан «О персональных данных» и иные нормативные акты.',
        ],
      },
      {
        title: 'Сроки хранения',
        paragraphs: [
          'Данные заказов — 3 года с даты последнего заказа.',
          'Скриншоты оплаты — 12 месяцев с даты загрузки.',
          'По истечении сроков данные удаляются или обезличиваются.',
        ],
      },
      {
        title: 'Передача данных',
        paragraphs: [
          'Службам доставки и курьерам — только имя, телефон и адрес доставки.',
          'Telegram — для отправки сервисных уведомлений.',
          'Supabase — облачное хранение данных Приложения.',
          'Данные не передаются третьим лицам в рекламных целях.',
        ],
      },
      {
        title: 'Защита данных',
        paragraphs: [
          'Передача данных осуществляется по протоколу HTTPS.',
          'Хранение в Supabase с разграничением прав доступа.',
          'Доступ к данным имеют только уполномоченные сотрудники Оператора.',
        ],
      },
      {
        title: 'Права пользователя',
        paragraphs: [
          'Запрашивать копию своих персональных данных или сведения об их обработке.',
          'Требовать исправления, блокирования или удаления данных.',
          'Отозвать согласие на обработку.',
          'Обращения принимаются на email [EMAIL] и через контакты менеджера в Приложении.',
        ],
      },
      {
        title: 'Cookies и локальное хранилище',
        paragraphs: [
          'Приложение не использует рекламные и отслеживающие cookies.',
          'Локальное хранилище (localStorage) применяется для корзины, избранного и настроек — только на устройстве пользователя.',
        ],
      },
      {
        title: 'Изменения политики',
        paragraphs: [
          'Оператор может обновлять настоящую Политику. Актуальная версия всегда опубликована в Приложении по адресу /privacy.',
        ],
      },
      {
        title: 'Контакты',
        paragraphs: [
          'Email: [EMAIL]',
          'Телефон: +998 93 378 87 70',
          'Адрес магазина: ТЦ Mercato, 2 этаж, магазин 34, Ташкент',
          'Юридический адрес: [ЮР. АДРЕС]',
        ],
      },
    ],
  },
  uz: {
    title: 'Maxfiylik siyosati',
    subtitle: '[SANA] dan amal qiladi · Versiya 1.0',
    sections: [
      {
        title: 'Umumiy qoidalar',
        paragraphs: [
          'Ushbu Maxfiylik siyosati LOFT MENS SHOP ilovasida (Telegram Mini App, keyingi o\'rinlarda — «Ilova») shaxsiy ma\'lumotlarni qayta ishlashni tartibga soladi.',
          'Operator: [KOMPANIYA NOMI], STIR [STIR], manzil: [YUR. MANZIL] (keyingi o\'rinlarda — «Operator»).',
          'Ilovadan foydalanish va buyurtmani rasmiylashtirishda rozilikni tasdiqlash orqali foydalanuvchi shaxsiy ma\'lumotlarini qayta ishlashga rozilik beradi.',
        ],
      },
      {
        title: 'Qanday ma\'lumotlarni yig\'amiz',
        paragraphs: [
          'Telegram profil ma\'lumotlari: ism, username, foto, Telegram ID — Telegram Web App API orqali.',
          'Foydalanuvchi kiritgan ma\'lumotlar: ism, telefon raqami, yetkazib berish manzili.',
          'Buyurtma ma\'lumotlari: savat tarkibi, summa, valyuta, holatlar, to\'lov skrinshotlari.',
          'Maxsus buyurtma ma\'lumotlari: mahsulot nomi, havola, o\'lcham/rang, izoh, biriktirilgan foto.',
          'Texnik ma\'lumotlar: IP manzil, so\'rovlar jurnali (Supabase bulut xizmati).',
        ],
      },
      {
        title: 'Qayta ishlash maqsadlari',
        paragraphs: [
          'Buyurtmalarni rasmiylashtirish, to\'lovni tasdiqlash va mahsulotlarni yetkazib berish.',
          'Foydalanuvchi bilan aloqa: buyurtma va maxsus so\'rov holati bo\'yicha bildirishnomalar.',
          'Xizmat sifatini oshirish va mahsulotlar mashhurligi tahlili.',
        ],
      },
      {
        title: 'Huquqiy asoslar',
        paragraphs: [
          'Foydalanuvchining ilovada berilgan roziligi (buyurtma va maxsus so\'rovni rasmiylashtirishdagi belgi).',
          'O\'zbekiston Respublikasining «Shaxsiy ma\'lumotlar to\'g\'risida»gi qonuni va boshqa normativ hujjatlar.',
        ],
      },
      {
        title: 'Saqlash muddatlari',
        paragraphs: [
          'Buyurtma ma\'lumotlari — oxirgi buyurtma sanasidan 3 yil.',
          'To\'lov skrinshotlari — yuklangan sanadan 12 oy.',
          'Muddat tugagach ma\'lumotlar o\'chiriladi yoki anonimlashtiriladi.',
        ],
      },
      {
        title: 'Ma\'lumotlarni uzatish',
        paragraphs: [
          'Yetkazib berish va kuryer xizmatlariga — faqat ism, telefon va yetkazib berish manzili.',
          'Telegram — xizmat bildirishnomalarini yuborish uchun.',
          'Supabase — ilova ma\'lumotlarini bulutli saqlash.',
          'Ma\'lumotlar reklama maqsadida uchinchi shaxslarga uzatilmaydi.',
        ],
      },
      {
        title: 'Ma\'lumotlarni himoya qilish',
        paragraphs: [
          'Ma\'lumotlar HTTPS protokoli orqali uzatiladi.',
          'Supabase\'da cheklangan kirish huquqlari bilan saqlanadi.',
          'Ma\'lumotlarga faqat Operatorning vakolatli xodimlari kiradi.',
        ],
      },
      {
        title: 'Foydalanuvchi huquqlari',
        paragraphs: [
          'Shaxsiy ma\'lumotlar nusxasini yoki ularni qayta ishlash haqidagi ma\'lumotni so\'rash.',
          'Ma\'lumotlarni tuzatish, bloklash yoki o\'chirishni talab qilish.',
          'Qayta ishlashga rozilikni chaqirib olish.',
          'So\'rovlar [EMAIL] pochta manzili va ilovadagi menejer kontaktlari orqali qabul qilinadi.',
        ],
      },
      {
        title: 'Cookies va lokal saqlash',
        paragraphs: [
          'Ilova reklama yoki kuzatuv cookie\'laridan foydalanmaydi.',
          'Savat, sevimlilar va sozlamalar uchun lokal saqlash (localStorage) qo\'llanadi — faqat foydalanuvchi qurilmasida.',
        ],
      },
      {
        title: 'Siyosatga o\'zgartirishlar',
        paragraphs: [
          'Operator ushbu Siyosatni yangilashi mumkin. Amaldagi versiya har doim ilovada /privacy manzilida e\'lon qilinadi.',
        ],
      },
      {
        title: 'Aloqa',
        paragraphs: [
          'Email: [EMAIL]',
          'Telefon: +998 93 378 87 70',
          'Do\'kon manzili: Mercato SM, 2-qavat, 34-do\'kon, Toshkent',
          'Yuridik manzil: [YUR. MANZIL]',
        ],
      },
    ],
  },
}

export default function PrivacyPage() {
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
            <ShieldCheck size={18} className="text-[#1B2A4A] dark:text-white" />
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
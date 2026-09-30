import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Upload, Send, CheckCircle, X, Tag, Link2, Ruler, MessageCircle, Image as ImageIcon } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { supabase, notifyNewChinaRequest } from '../lib/supabase'

export default function ChinaPage() {
  const { language, telegramUser } = useStore()
  const [productName, setProductName] = useState('')
  const [link, setLink] = useState('')
  const [sizeColor, setSizeColor] = useState('')
  const [comment, setComment] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(language === 'ru' ? 'Фото слишком большое (макс 5MB)' : 'Rasm juda katta (max 5MB)')
        return
      }
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.onerror = () => {
        toast.error(language === 'ru' ? 'Ошибка загрузки фото' : 'Rasm yuklashda xatolik')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async () => {
    if (!productName.trim()) {
      toast.error(
        language === 'ru' ? 'Укажите название товара' : 'Mahsulot nomini kiriting',
        { duration: 3000 }
      )
      return
    }
    setSubmitting(true)
    try {
      let imageUrl = null
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        try {
          const { error: uploadError } = await supabase.storage
            .from('china-requests')
            .upload(fileName, imageFile, {
              cacheControl: '3600',
              upsert: false
            })
          if (uploadError) {
            console.error('Ошибка загрузки:', uploadError)
            toast.error(language === 'ru' ? 'Не удалось загрузить фото' : 'Rasm yuklab bo\'lmadi')
          } else {
            const { data: urlData } = supabase.storage
              .from('china-requests')
              .getPublicUrl(fileName)
            imageUrl = urlData.publicUrl
          }
        } catch (err) {
          console.error('Ошибка:', err)
        }
      }
      const userId = telegramUser?.id?.toString() || 'guest-user'
      const requestData = {
        user_id: userId,
        product_name: productName.trim(),
        link: link.trim() || null,
        size_color: sizeColor || null,
        comment: comment || null,
        image_url: imageUrl,
        status: 'На рассмотрении',
      }
      const { data, error } = await supabase
        .from('china_requests')
        .insert(requestData)
        .select()
      if (error) {
        console.error('Ошибка при создании спецзаказа:', error)
        toast.error(
          language === 'ru' ? 'Ошибка при отправке' : 'Yuborishda xatolik',
          { duration: 3000 }
        )
        setSubmitting(false)
        return
      }
      if (data && data[0]) {
        await notifyNewChinaRequest(data[0])
      }
      setSubmitted(true)
      toast.success(
        language === 'ru' ? 'Спецзаказ отправлен!' : 'Maxsus buyurtma yuborildi!',
        { duration: 3000 }
      )
    } catch (error) {
      console.error('Ошибка:', error)
      toast.error(
        language === 'ru' ? 'Произошла ошибка' : 'Xatolik yuz berdi',
        { duration: 3000 }
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setProductName('')
    setLink('')
    setSizeColor('')
    setComment('')
    setImageFile(null)
    setImagePreview(null)
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg flex flex-col">
        <Toaster position="top-center" richColors />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={56} className="text-green-500 dark:text-green-300" />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? 'Заявка отправлена!' : 'Ariza yuborildi!'}
          </h2>
          <p className="text-[#8A8275] dark:text-gray-300 text-lg mb-8 max-w-md">
            {language === 'ru'
              ? 'Менеджер рассмотрит ваш спецзаказ'
              : 'Menejer sizning maxsus buyurtmangizni ko\'rib chiqadi'}
          </p>
          <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-6 mb-8 max-w-sm w-full border border-[#E8E2D5] dark:border-dark-border">
            <p className="text-[#8A8275] dark:text-gray-300 text-sm leading-relaxed">
              {language === 'ru' ? (
                <>
                  Статус заявки можно посмотреть в разделе<br />
                  <span className="font-semibold text-[#1B2A4A] dark:text-white">"Профиль"</span> → <span className="font-semibold text-[#1B2A4A] dark:text-white">"Мои спецзаказы"</span>
                </>
              ) : (
                <>
                  Ariza holatini bo'limdan ko'rishingiz mumkin<br />
                  <span className="font-semibold text-[#1B2A4A] dark:text-white">"Profil"</span> → <span className="font-semibold text-[#1B2A4A] dark:text-white">"Maxsus buyurtmalarim"</span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#142038] dark:hover:bg-[#d6b57e] transition-colors"
          >
            {language === 'ru' ? 'Новый спецзаказ' : 'Yangi maxsus buyurtma'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-dark-bg pb-24">
      <Toaster position="top-center" richColors />

      <div className="p-4">
        {/* ✅ Шапка-карточка в стиле страницы заказа (без бейджа срока доставки) */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl p-4 border border-[#E8E2D5] dark:border-dark-border mb-3">
          <h2 className="text-xl font-bold text-[#1B2A4A] dark:text-white">
            {language === 'ru' ? '🌍 Спецзаказ' : '🌍 Maxsus buyurtma'}
          </h2>
          <p className="text-xs text-[#8A8275] dark:text-gray-300 mt-1">
            {language === 'ru'
              ? 'Привезём товар по вашему описанию или ссылке'
              : 'Tavsif yoki havola bo\'yicha mahsulot keltiramiz'}
          </p>
        </div>

        {/* ✅ Единая карточка со строками-иконками (как на странице заказа) */}
        <div className="bg-[#FBF9F4] dark:bg-dark-card rounded-2xl border border-[#E8E2D5] dark:border-dark-border mb-3 divide-y divide-[#E8E2D5] dark:divide-dark-border">
          {/* Название товара */}
          <div className="flex items-start gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Tag size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[#8A8275] dark:text-gray-300 block mb-0.5">
                {language === 'ru' ? 'Название товара' : 'Mahsulot nomi'} *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={language === 'ru' ? 'Например: Nike Air Force 1' : 'Masalan: Nike Air Force 1'}
                className="w-full bg-transparent text-sm font-medium text-[#1B2A4A] dark:text-white focus:outline-none placeholder:text-[#8A8275] dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Ссылка на товар */}
          <div className="flex items-start gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Link2 size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[#8A8275] dark:text-gray-300 block mb-0.5">
                {language === 'ru' ? 'Ссылка на товар' : 'Mahsulot havolasi'}
                <span className="ml-1 text-[10px]">({language === 'ru' ? 'необязательно' : 'ixtiyoriy'})</span>
              </label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="w-full bg-transparent text-sm font-medium text-[#1B2A4A] dark:text-white focus:outline-none placeholder:text-[#8A8275] dark:placeholder:text-gray-500 break-all"
              />
            </div>
          </div>

          {/* Размер / Цвет */}
          <div className="flex items-start gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <Ruler size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[#8A8275] dark:text-gray-300 block mb-0.5">
                {language === 'ru' ? 'Размер / Цвет' : 'O\'lcham / Rang'}
              </label>
              <input
                type="text"
                value={sizeColor}
                onChange={(e) => setSizeColor(e.target.value)}
                placeholder={language === 'ru' ? '42 размер, белый цвет' : '42 o\'lcham, oq rang'}
                className="w-full bg-transparent text-sm font-medium text-[#1B2A4A] dark:text-white focus:outline-none placeholder:text-[#8A8275] dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Комментарий */}
          <div className="flex items-start gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <MessageCircle size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[#8A8275] dark:text-gray-300 block mb-0.5">
                {language === 'ru' ? 'Комментарий' : 'Izoh'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={language === 'ru' ? 'Дополнительная информация...' : 'Qo\'shimcha ma\'lumotlar...'}
                rows={3}
                className="w-full bg-transparent text-sm font-medium text-[#1B2A4A] dark:text-white focus:outline-none placeholder:text-[#8A8275] dark:placeholder:text-gray-500 resize-none"
              />
            </div>
          </div>

          {/* Скриншот товара */}
          <div className="flex items-start gap-3 p-3.5">
            <div className="w-9 h-9 rounded-full bg-[#F5F1E8] dark:bg-dark-accent border border-[#E8E2D5] dark:border-dark-border flex items-center justify-center flex-shrink-0">
              <ImageIcon size={16} className="text-[#1B2A4A] dark:text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-[#8A8275] dark:text-gray-300 block mb-1.5">
                {language === 'ru' ? 'Скриншот товара' : 'Mahsulot skrinshoti'}
              </label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-xl border border-[#E8E2D5] dark:border-dark-border"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-[#9B3B3B] text-white rounded-full p-1 shadow"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#E8E2D5] dark:border-dark-border rounded-xl cursor-pointer hover:border-[#1B2A4A] dark:hover:border-gold transition-colors bg-[#F5F1E8] dark:bg-dark-accent">
                  <Upload size={24} className="text-[#8A8275] dark:text-gray-300 mb-1" />
                  <span className="text-xs text-[#8A8275] dark:text-gray-300">
                    {language === 'ru' ? 'Нажмите для загрузки' : 'Yuklash uchun bosing'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* ✅ Кнопка отправки */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-md ${
            submitting
              ? 'bg-[#E8E2D5] dark:bg-dark-accent text-[#8A8275] dark:text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-[#1B2A4A] dark:bg-gold text-white dark:text-[#1B2A4A] hover:bg-[#142038] dark:hover:bg-[#d6b57e]'
          }`}
        >
          <Send size={20} />
          {submitting
            ? (language === 'ru' ? 'Отправка...' : 'Yuborilmoqda...')
            : (language === 'ru' ? 'Отправить заявку' : 'Ariza yuborish')}
        </button>
      </div>
    </div>
  )
}
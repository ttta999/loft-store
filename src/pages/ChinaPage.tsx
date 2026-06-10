import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Upload, Send, CheckCircle } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { supabase, notifyNewChinaRequest } from '../lib/supabase'

export default function ChinaPage({ telegramUser }: { telegramUser?: any }) {
  const { language } = useStore()
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

  const handleSubmit = async () => {
    if (!link) {
      toast.error(
        language === 'ru' ? 'Введите название или ссылку на товар' : 'Mahsulot nomi yoki havolasini kiriting',
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
            console.log('Фото загружено:', imageUrl)
          }
        } catch (err) {
          console.error('Ошибка:', err)
        }
      }

      const userId = telegramUser?.id?.toString() || 'guest-user'

      const requestData = {
        user_id: userId,
        link: link,
        size_color: sizeColor || null,
        comment: comment || null,
        image_url: imageUrl,
        status: 'На рассмотрении',
      }

      console.log('Отправляем спецзаказ:', requestData)

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

      console.log('Спецзаказ создан:', data)

      // Отправляем уведомление
      if (data && data[0]) {
        await notifyNewChinaRequest(data[0])
      }

      setSubmitted(true)
      toast.success(
        language === 'ru' ? 'Спецзаказ отправлен!' : 'Maxsus buyurtma yuborildi!',
        {
          description: language === 'ru' 
            ? 'Менеджер рассмотрит вашу заявку' 
            : 'Menejer arizangizni ko\'rib chiqadi',
          duration: 3000,
        }
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
    setLink('')
    setSizeColor('')
    setComment('')
    setImageFile(null)
    setImagePreview(null)
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
        <Toaster position="top-center" richColors />
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">
          {language === 'ru' ? 'Заявка отправлена!' : 'Ariza yuborildi!'}
        </h2>
        <p className="text-gray-600 text-center mb-6">
          {language === 'ru' 
            ? 'Менеджер рассмотрит ваш спецзаказ и свяжется с вами' 
            : 'Menejer sizning maxsus buyurtmangizni ko\'rib chiqadi va siz bilan bog\'lanadi'}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          {language === 'ru' 
            ? 'Статус заявки можно посмотреть в разделе "Профиль" → "Мои спецзаказы"' 
            : 'Ariza holatini "Profil" → "Maxsus buyurtmalarim" bo\'limida ko\'rishingiz mumkin'}
        </p>
        <button
          onClick={handleReset}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold"
        >
          {language === 'ru' ? 'Новый спецзаказ' : 'Yangi maxsus buyurtma'}
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20">
      <Toaster position="top-center" richColors />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {language === 'ru' ? '🌍 Спецзаказ' : ' Maxsus buyurtma'}
        </h1>
        <p className="text-gray-600 text-sm">
          {language === 'ru' 
            ? 'Загрузите ссылку на товар — мы привезем его для вас' 
            : 'Mahsulot havolasini yuklang — biz siz uchun uni olib kelamiz'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {language === 'ru' ? 'Название или ссылка на товар *' : 'Mahsulot nomi yoki havolasi *'}
          </label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={language === 'ru' ? 'Например: Nike Air Force 1 или https://...' : 'Masalan: Nike Air Force 1 yoki https://...'}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {language === 'ru' ? 'Размер / Цвет' : 'O\'lcham / Rang'}
          </label>
          <input
            type="text"
            value={sizeColor}
            onChange={(e) => setSizeColor(e.target.value)}
            placeholder={
              language === 'ru' 
                ? '42 размер, белый цвет' 
                : '42 o\'lcham, oq rang'
            }
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {language === 'ru' ? 'Комментарий' : 'Izoh'}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              language === 'ru' 
                ? 'Дополнительная информация...' 
                : 'Qo\'shimcha ma\'lumotlar...'
            }
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            {language === 'ru' ? 'Скриншот товара' : 'Mahsulot skrinshoti'}
          </label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-black transition-colors bg-gray-50">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="h-full object-contain rounded-lg"
              />
            ) : (
              <>
                <Upload size={32} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">
                  {language === 'ru' ? 'Нажмите для загрузки' : 'Yuklash uchun bosing'}
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
            submitting 
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
              : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          <Send size={20} />
          {submitting 
            ? (language === 'ru' ? 'Отправка...' : 'Yuborilmoqda...')
            : (language === 'ru' ? 'Отправить заявку' : 'Ariza yuborish')
          }
        </button>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          {language === 'ru' 
            ? ' Среднее время доставки: 14-21 день. Менеджер свяжется с вами для уточнения деталей и стоимости.' 
            : ' O\'rtacha yetkazib berish vaqti: 14-21 kun. Menejer tafsilotlar va narxni aniqlash uchun siz bilan bog\'lanadi.'}
        </p>
      </div>
    </div>
  )
}
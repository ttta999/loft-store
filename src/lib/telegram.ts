// Инициализация Telegram Web App
export const initTelegram = () => {
  // Проверяем, что мы внутри Telegram
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    try {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
      
      // Устанавливаем цвета темы Telegram
      if (window.Telegram.WebApp.themeParams) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', window.Telegram.WebApp.themeParams.bg_color || '#ffffff')
        document.documentElement.style.setProperty('--tg-theme-text-color', window.Telegram.WebApp.themeParams.text_color || '#000000')
      }
      
      return window.Telegram.WebApp
    } catch (error) {
      console.error('Ошибка инициализации Telegram:', error)
    }
  }
  
  console.log('Приложение открыто вне Telegram')
  return null
}

// Получение данных пользователя из Telegram
export const getUserData = () => {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
    return null
  }
  
  try {
    const user = window.Telegram.WebApp.initDataUnsafe?.user
    
    if (!user) {
      return null
    }
    
    return {
      id: user.id.toString(),
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      username: user.username || '',
      photoUrl: user.photo_url || '',
      languageCode: user.language_code || 'ru',
    }
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error)
    return null
  }
}

// Проверка, открыто ли приложение в Telegram
export const isTelegram = () => {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp
}

// Отправка данных обратно боту
export const sendDataToBot = (data: any) => {
  if (isTelegram() && window.Telegram?.WebApp) {
    window.Telegram.WebApp.sendData(JSON.stringify(data))
  }
}

// Закрытие приложения
export const closeApp = () => {
  if (isTelegram() && window.Telegram?.WebApp) {
    window.Telegram.WebApp.close()
  }
}
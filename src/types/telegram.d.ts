declare namespace Telegram {
  interface WebApp {
    ready(): void
    expand(): void
    close(): void
    sendData(data: string): void
    MainButton: {
      text: string
      isVisible: boolean
      isActive: boolean
      isProgressVisible: boolean
      setText(text: string): void
      show(): void
      hide(): void
      enable(): void
      disable(): void
      showProgress(leaveActive?: boolean): void
      hideProgress(): void
      onClick(callback: () => void): void
      offClick(callback: () => void): void
    }
    initDataUnsafe: {
      user?: {
        id: number
        first_name: string
        last_name?: string
        username?: string
        language_code?: string
        photo_url?: string
      }
    }
    themeParams: {
      bg_color?: string
      text_color?: string
      hint_color?: string
      link_color?: string
      button_color?: string
      button_text_color?: string
    }
  }
}

interface Window {
  Telegram?: {
    WebApp: Telegram.WebApp
  }
}
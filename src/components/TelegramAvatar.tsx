import { User } from 'lucide-react'
import { useState } from 'react'

export function TelegramAvatar({ url, large = false }: { url?: string; large?: boolean }) {
  return <div className={`${large ? 'size-14' : 'size-12'} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E8E2D5] bg-[#F5F1E8] dark:border-dark-border dark:bg-dark-accent`}>
    <User aria-hidden size={large ? 24 : 22} className="text-[#8A8275] dark:text-gray-300" />
    {url && <AvatarImage key={url} url={url} />}
  </div>
}

function AvatarImage({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  return failed ? null : <img src={url} alt="" decoding="async" referrerPolicy="no-referrer"
    className="absolute inset-0 size-full object-cover" onError={() => setFailed(true)} />
}

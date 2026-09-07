import { ArrowLeft, Search } from 'lucide-react'

interface IslandHeaderProps {
  onBack?: () => void
  showSearch?: boolean
  onSearch?: () => void
}

export default function IslandHeader({ onBack, showSearch = false, onSearch }: IslandHeaderProps) {
  return (
    <div className="sticky top-0 z-40 px-4 pt-4 pb-2 bg-[#F5F1E8]">
      <div className="flex items-center gap-3">
        {/* Островок с названием */}
        <div className="flex-1 h-14 bg-[#FBF9F4] border border-[#E8E2D5] rounded-full shadow-lg relative flex items-center justify-center">
          {onBack && (
            <button
              onClick={onBack}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-[#1B2A4A] hover:bg-[#F5F1E8] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-lg font-bold text-[#1B2A4A] tracking-wide">LOFT</h1>
        </div>
        {/* Круглая кнопка поиска */}
        {showSearch && (
          <button
            onClick={onSearch}
            className="w-14 h-14 shrink-0 rounded-full bg-[#FBF9F4] border border-[#E8E2D5] shadow-lg flex items-center justify-center text-[#1B2A4A] hover:text-[#C9A961] transition-colors"
          >
            <Search size={22} />
          </button>
        )}
      </div>
    </div>
  )
}
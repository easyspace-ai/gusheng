import { useState, useMemo } from 'react'
import { Search, FileText } from 'lucide-react'
import { useAppStore } from '../../stores'

export function SearchPanel() {
  const { notes, openNoteInTab } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')

  // 搜索结果
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase()
    const results: Array<{
      noteId: string
      title: string
      matches: Array<{ line: number; text: string; highlight: string }>
    }> = []

    Object.values(notes).forEach(note => {
      const titleMatch = note.title.toLowerCase().includes(query)
      const contentLines = note.content.split('\n')
      const contentMatches: Array<{ line: number; text: string; highlight: string }> = []

      contentLines.forEach((line, index) => {
        if (line.toLowerCase().includes(query)) {
          // 创建高亮文本
          const regex = new RegExp(`(${query})`, 'gi')
          const highlightedText = line.replace(regex, '<mark>$1</mark>')
          contentMatches.push({
            line: index + 1,
            text: line.trim(),
            highlight: highlightedText
          })
        }
      })

      if (titleMatch || contentMatches.length > 0) {
        results.push({
          noteId: note.id,
          title: note.title,
          matches: contentMatches
        })
      }
    })

    return results
  }, [searchQuery, notes])

  const handleResultClick = (noteId: string) => {
    openNoteInTab(noteId)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 搜索输入 */}
      <div className="p-3 border-b border-light-border dark:border-dark-border">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记..."
            className="w-full pl-10 pr-3 py-2 bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border rounded text-sm text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:border-light-accent dark:focus:border-dark-accent"
          />
        </div>
      </div>

      {/* 搜索结果 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!searchQuery.trim() ? (
          <div className="flex items-center justify-center h-32 text-light-text-secondary dark:text-dark-text-secondary">
            <div className="text-center">
              <Search size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">输入关键词搜索笔记</p>
            </div>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-light-text-secondary dark:text-dark-text-secondary">
            <div className="text-center">
              <Search size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">没有找到匹配的结果</p>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-3">
            {searchResults.map(result => (
              <div
                key={result.noteId}
                className="border border-light-border dark:border-dark-border rounded-lg p-3 hover:bg-light-hover dark:hover:bg-dark-hover cursor-pointer transition-colors"
                onClick={() => handleResultClick(result.noteId)}
              >
                {/* 笔记标题 */}
                <div className="flex items-center mb-2">
                  <FileText size={14} className="mr-2 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" />
                  <span className="font-medium text-light-text dark:text-dark-text">
                    {result.title}
                  </span>
                </div>

                {/* 匹配的内容片段 */}
                {result.matches.length > 0 && (
                  <div className="space-y-1">
                    {result.matches.slice(0, 3).map((match, index) => (
                      <div key={index} className="text-xs">
                        <span className="text-light-text-secondary dark:text-dark-text-secondary mr-2">
                          {match.line}:
                        </span>
                        <span 
                          className="text-light-text dark:text-dark-text"
                          dangerouslySetInnerHTML={{
                            __html: match.highlight.replace(
                              /<mark>/g, 
                              '<span class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">'
                            ).replace(/<\/mark>/g, '</span>')
                          }}
                        />
                      </div>
                    ))}
                    {result.matches.length > 3 && (
                      <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        还有 {result.matches.length - 3} 个匹配...
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
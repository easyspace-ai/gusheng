import { FileText, ArrowLeft } from 'lucide-react'
import { useAppStore } from '../../stores'

export function BacklinksPanel() {
  const { notes, panes, activePaneId, openNoteInTabWithTitle } = useAppStore()

  // 获取当前活动笔记
  const getActiveNote = () => {
    const activePane = panes.find(pane => pane.id === activePaneId) || panes[0]
    if (!activePane || !activePane.activeTabId) return null
    
    const activeTab = activePane.tabs.find(tab => tab.id === activePane.activeTabId)
    if (!activeTab) return null
    
    return notes[activeTab.noteId]
  }

  const activeNote = getActiveNote()

  // 获取反向链接
  const getBacklinks = () => {
    if (!activeNote) return []
    
    return Object.values(notes)
      .filter(note => note.id !== activeNote.id && note.links.includes(activeNote.title))
      .map(note => ({
        ...note,
        // 查找包含链接的段落
        linkContexts: note.content
          .split('\n')
          .map((line, index) => ({
            line: index + 1,
            content: line,
            hasLink: line.includes(`[[${activeNote.title}]]`)
          }))
          .filter(context => context.hasLink)
      }))
  }

  const backlinks = getBacklinks()

  const handleNoteClick = (noteId: string) => {
    openNoteInTabWithTitle(noteId)
  }

  if (!activeNote) {
    return (
      <div className="flex items-center justify-center h-32 text-light-text-secondary dark:text-dark-text-secondary">
        <div className="text-center">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">请选择一个笔记</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 当前笔记信息 */}
      <div className="p-3 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center text-sm text-light-text dark:text-dark-text mb-2">
          <FileText size={14} className="mr-2" />
          <span className="font-medium truncate">{activeNote.title}</span>
        </div>
        <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
          {backlinks.length} 个反向链接
        </div>
      </div>

      {/* 反向链接列表 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {backlinks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-light-text-secondary dark:text-dark-text-secondary">
            <div className="text-center">
              <ArrowLeft size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-1">暂无反向链接</p>
              <p className="text-xs">其他笔记中提到此笔记时会显示在这里</p>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-3">
            {backlinks.map(note => (
              <BacklinkItem
                key={note.id}
                note={note}
                activeNoteTitle={activeNote.title}
                onClick={() => handleNoteClick(note.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface BacklinkItemProps {
  note: {
    id: string
    title: string
    content: string
    linkContexts: Array<{
      line: number
      content: string
      hasLink: boolean
    }>
  }
  activeNoteTitle: string
  onClick: () => void
}

function BacklinkItem({ note, activeNoteTitle, onClick }: BacklinkItemProps) {
  return (
    <div className="border border-light-border dark:border-dark-border rounded-lg p-3 hover:bg-light-hover dark:hover:bg-dark-hover cursor-pointer transition-colors">
      {/* 笔记标题 */}
      <div className="flex items-center mb-2" onClick={onClick}>
        <FileText size={14} className="mr-2 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" />
        <span className="font-medium text-light-text dark:text-dark-text">
          {note.title}
        </span>
      </div>

      {/* 链接上下文 */}
      <div className="space-y-1">
        {note.linkContexts.slice(0, 3).map((context, index) => (
          <div key={index} className="text-xs">
            <span className="text-light-text-secondary dark:text-dark-text-secondary mr-2">
              {context.line}:
            </span>
            <span 
              className="text-light-text dark:text-dark-text"
              dangerouslySetInnerHTML={{
                __html: context.content.replace(
                  new RegExp(`\\[\\[${activeNoteTitle}\\]\\]`, 'g'),
                  `<span class="bg-light-accent/20 dark:bg-dark-accent/20 text-light-accent dark:text-dark-accent px-1 py-0.5 rounded font-medium">[[${activeNoteTitle}]]</span>`
                )
              }}
            />
          </div>
        ))}
        {note.linkContexts.length > 3 && (
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
            还有 {note.linkContexts.length - 3} 个引用...
          </div>
        )}
      </div>
    </div>
  )
}
import React, { useEffect, useState, useCallback } from 'react'
import { Hash, FileText, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../stores'
import { listTags, filesForTag, type TagCount, type TagFileRef } from '@/api/tags'
import { connectWS, addFsListener } from '@/lib/ws'

export function TagsPanel() {
  const { selectFileInEditor } = useAppStore()
  const [tags, setTags] = useState<TagCount[]>([])
  const [expandedTag, setExpandedTag] = useState<string | null>(null)
  const [tagFiles, setTagFiles] = useState<Record<string, TagFileRef[]>>({})
  const [loading, setLoading] = useState(false)

  const loadTags = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listTags()
      setTags(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    connectWS()
    loadTags()
    const off = addFsListener(() => {
      // 文件系统变化后稍微防抖刷新标签
      const t = setTimeout(loadTags, 300)
      return () => clearTimeout(t)
    })
    return () => off()
  }, [loadTags])

  const toggleExpand = async (name: string) => {
    if (expandedTag === name) {
      setExpandedTag(null)
      return
    }
    setExpandedTag(name)
    if (!tagFiles[name]) {
      const files = await filesForTag(name)
      setTagFiles((prev) => ({ ...prev, [name]: files }))
    }
  }

  const handleNoteClick = (filePath: string) => {
    selectFileInEditor(filePath)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-muted-foreground">标签</span>
          <button className="p-1 rounded hover:bg-muted" onClick={loadTags} title="刷新标签">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {tags.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-light-text-secondary dark:text-dark-text-secondary">
            <div className="text-center">
              <Hash size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-1">暂无标签</p>
              <p className="text-xs">在笔记中使用 #标签名 来创建标签</p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            <div className="space-y-2">
              {tags.map(tag => (
                <TagItem
                  key={tag.name}
                  name={tag.name}
                  count={tag.count}
                  files={tagFiles[tag.name] || []}
                  expanded={expandedTag === tag.name}
                  onToggle={() => toggleExpand(tag.name)}
                  onFileClick={handleNoteClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface TagItemProps {
  name: string
  count: number
  files: TagFileRef[]
  expanded: boolean
  onToggle: () => void
  onFileClick: (filePath: string) => void
}

function TagItem({ name, count, files, expanded, onToggle, onFileClick }: TagItemProps) {
  return (
    <div className="border border-light-border dark:border-dark-border rounded-lg p-2">
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-light-hover dark:hover:bg-dark-hover p-1 rounded transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center">
          <Hash size={14} className="mr-2 text-light-accent dark:text-dark-accent" />
          <span className="text-sm font-medium text-light-text dark:text-dark-text">
            {name}
          </span>
        </div>
        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary bg-light-hover dark:bg-dark-hover px-1.5 py-0.5 rounded">
          {count}
        </span>
      </div>

      {expanded && (
        <div className="mt-2 ml-4 space-y-1">
          {files.map(file => (
            <div
              key={file.path}
              className="flex items-center p-1 rounded cursor-pointer hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
              onClick={() => onFileClick(file.path)}
            >
              <FileText size={12} className="mr-2 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" />
              <span className="text-xs text-light-text dark:text-dark-text truncate">
                {file.path}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">{file.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
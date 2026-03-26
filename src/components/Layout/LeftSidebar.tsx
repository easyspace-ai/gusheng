import { useAppStore } from '../../stores'
import { FileExplorer } from '../FileExplorer/FileExplorer'
import { SearchPanel } from '../Search/SearchPanel'
import { TagsPanel } from '../Tags/TagsPanel'
import { PluginsPanel } from '../Plugins/PluginsPanel'

export function LeftSidebar() {
  const { leftActivePanel } = useAppStore()

  const renderPanel = () => {
    switch (leftActivePanel) {
      case 'files':
        return <FileExplorer />
      case 'search':
        return <SearchPanel />
      case 'tags':
        return <TagsPanel />
      case 'plugins':
        return <PluginsPanel />
      default:
        return <FileExplorer />
    }
  }

  return (
    <div 
      className="bg-sidebar text-sidebar-foreground flex flex-col min-w-0 h-full"
    >
      {/* 面板标题 */}
      <div className="h-8 flex items-center px-3 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {leftActivePanel === 'files' && '文件'}
          {leftActivePanel === 'search' && '搜索'}
          {leftActivePanel === 'tags' && '标签'}
          {leftActivePanel === 'plugins' && '插件'}
        </span>
      </div>

      {/* 面板内容 */}
      <div className="flex-1 overflow-hidden">
        {renderPanel()}
      </div>

      {/* 大小由父级 ResizablePanel 控制 */}
    </div>
  )
}
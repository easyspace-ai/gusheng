import React, { useEffect, useState } from 'react'
import { Plus, Settings, FolderOpen, FolderX, Trash2, Edit3 } from 'lucide-react'
import { useNotebookStore, type Notebook } from '../../stores'
import { useFileTreeStore } from '../../stores/fileTreeStore'
import { createFolder as apiCreateFolder } from '../../api/fs'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { toast } from '../ui/use-toast'

interface NotebookManagerProps {
  className?: string
}

export const NotebookManager: React.FC<NotebookManagerProps> = ({ className }) => {
  const {
    notebooks,
    currentNotebook,
    loading,
    error,
    fetchNotebooks,
    createNotebook,
    renameNotebook,
    setNotebookIcon,
    openNotebook,
    closeNotebook,
    deleteNotebook,
    setCurrentNotebook,
    clearError
  } = useNotebookStore()
  const { setRootPath } = useFileTreeStore()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null)
  const [newNotebookName, setNewNotebookName] = useState('')
  const [newNotebookIcon, setNewNotebookIcon] = useState('📔')
  const [renameValue, setRenameValue] = useState('')

  // 加载笔记本列表
  useEffect(() => {
    fetchNotebooks()
  }, [fetchNotebooks])

  // 显示错误信息
  useEffect(() => {
    if (error) {
      toast({
        title: "错误",
        description: error,
        variant: "destructive",
      })
      clearError()
    }
  }, [error, clearError])

  const handleCreateNotebook = async () => {
    if (!newNotebookName.trim()) {
      toast({
        title: "错误",
        description: "请输入笔记本名称",
        variant: "destructive",
      })
      return
    }

    const notebook = await createNotebook(newNotebookName.trim(), newNotebookIcon)
    if (notebook) {
      toast({
        title: "成功",
        description: `笔记本 "${notebook.name}" 创建成功`,
      })
      setNewNotebookName('')
      setNewNotebookIcon('📔')
      setIsCreateDialogOpen(false)
    }
  }

  const handleRenameNotebook = async () => {
    if (!selectedNotebook || !renameValue.trim()) return

    await renameNotebook(selectedNotebook.id, renameValue.trim())
    toast({
      title: "成功",
      description: `笔记本重命名为 "${renameValue.trim()}"`,
    })
    setRenameValue('')
    setSelectedNotebook(null)
    setIsRenameDialogOpen(false)
  }

  const handleToggleNotebook = async (notebook: Notebook) => {
    if (notebook.closed) {
      await openNotebook(notebook.id)
      toast({
        title: "成功",
        description: `笔记本 "${notebook.name}" 已打开`,
      })
    } else {
      await closeNotebook(notebook.id)
      toast({
        title: "成功",
        description: `笔记本 "${notebook.name}" 已关闭`,
      })
    }
  }

  const ensureNotebookFolder = async (notebook: Notebook) => {
    const root = `/workspace/${notebook.name}`
    try {
      await apiCreateFolder(root)
    } catch (e) {
      // 已存在则忽略
    }
    setRootPath(root)
  }

  const handleDeleteNotebook = async (notebook: Notebook) => {
    if (window.confirm(`确定要删除笔记本 "${notebook.name}" 吗？此操作不可撤销。`)) {
      await deleteNotebook(notebook.id)
      toast({
        title: "成功",
        description: `笔记本 "${notebook.name}" 已删除`,
      })
    }
  }

  const openRenameDialog = (notebook: Notebook) => {
    setSelectedNotebook(notebook)
    setRenameValue(notebook.name)
    setIsRenameDialogOpen(true)
  }

  const commonIcons = ['📔', '📕', '📗', '📘', '📙', '📓', '📒', '🗂️', '📁', '📂']

  if (loading && notebooks.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">笔记本管理</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              新建笔记本
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新笔记本</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">笔记本名称</label>
                <Input
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  placeholder="输入笔记本名称"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateNotebook()}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">选择图标</label>
                <div className="flex flex-wrap gap-2">
                  {commonIcons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewNotebookIcon(icon)}
                      className={`p-2 text-lg rounded border hover:bg-muted ${
                        newNotebookIcon === icon ? 'bg-primary text-primary-foreground' : ''
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateNotebook} disabled={!newNotebookName.trim()}>
                  创建
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {notebooks.map((notebook) => (
          <Card
            key={notebook.id}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              currentNotebook?.id === notebook.id ? 'ring-2 ring-primary' : ''
            } ${notebook.closed ? 'opacity-60' : ''}`}
            onClick={async () => {
              setCurrentNotebook(notebook)
              await ensureNotebookFolder(notebook)
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{notebook.icon}</span>
                  <div>
                    <div className="font-medium">{notebook.name}</div>
                    <div className="text-xs text-muted-foreground">
                      更新于 {new Date(notebook.updated).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notebook.closed ? (
                    <Badge variant="secondary">已关闭</Badge>
                  ) : (
                    <Badge variant="default">已打开</Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openRenameDialog(notebook)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        重命名
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleNotebook(notebook)}>
                        {notebook.closed ? (
                          <>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            打开笔记本
                          </>
                        ) : (
                          <>
                            <FolderX className="h-4 w-4 mr-2" />
                            关闭笔记本
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteNotebook(notebook)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除笔记本
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {notebooks.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <div className="text-4xl mb-4">📔</div>
          <div>还没有笔记本</div>
          <div className="text-sm">点击上方按钮创建第一个笔记本</div>
        </div>
      )}

      {/* 重命名对话框 */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名笔记本</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">新名称</label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="输入新的笔记本名称"
                onKeyPress={(e) => e.key === 'Enter' && handleRenameNotebook()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRenameDialogOpen(false)
                  setSelectedNotebook(null)
                  setRenameValue('')
                }}
              >
                取消
              </Button>
              <Button onClick={handleRenameNotebook} disabled={!renameValue.trim()}>
                确定
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

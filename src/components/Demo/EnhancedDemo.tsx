import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw,
  Sparkles,
  Zap,
  MousePointer,
  Layers,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DemoFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  demo: () => void;
}

export function EnhancedDemo() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const demoFeatures: DemoFeature[] = [
    {
      id: 'file-tree',
      title: '智能文件树',
      description: '支持拖拽排序、实时动画、悬停高亮和右键菜单',
      icon: <FileText size={20} />,
      color: 'bg-blue-500',
      demo: () => {
        console.log('演示文件树功能');
        // 这里可以添加具体的演示逻辑
      }
    },
    {
      id: 'tab-system',
      title: '多标签页系统',
      description: '可拖拽排序、双击重命名、分屏编辑',
      icon: <Layers size={20} />,
      color: 'bg-green-500',
      demo: () => {
        console.log('演示标签页系统');
      }
    },
    {
      id: 'animations',
      title: '流畅动画',
      description: '所有交互都有平滑过渡，避免生硬切换',
      icon: <Zap size={20} />,
      color: 'bg-purple-500',
      demo: () => {
        console.log('演示动画效果');
      }
    },
    {
      id: 'interactions',
      title: '精细交互',
      description: '悬停高亮、点击反馈、拖拽预览',
      icon: <MousePointer size={20} />,
      color: 'bg-orange-500',
      demo: () => {
        console.log('演示交互效果');
      }
    }
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // 自动播放演示
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % demoFeatures.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, demoFeatures.length]);

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setIsAutoPlaying(false);
    setActiveDemo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="text-blue-600" size={32} />
            </motion.div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ReNote 增强版
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-6">
            像素级还原 Obsidian、Notion 和 VSCode 的交互体验
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              React + Tailwind
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Framer Motion
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              TypeScript
            </Badge>
          </div>
        </motion.div>

        {/* 控制面板 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center gap-4 mb-8"
        >
          <Button
            onClick={toggleAutoPlay}
            variant={isAutoPlaying ? "default" : "outline"}
            className="gap-2"
          >
            {isAutoPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isAutoPlaying ? '暂停演示' : '自动演示'}
          </Button>
          
          <Button onClick={resetDemo} variant="outline" className="gap-2">
            <RotateCcw size={16} />
            重置
          </Button>
        </motion.div>

        {/* 功能展示网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {demoFeatures.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative"
            >
              <Card 
                className={cn(
                  "cursor-pointer transition-all duration-300 hover:shadow-lg",
                  currentStep === index && "ring-2 ring-blue-500 shadow-lg",
                  activeDemo === feature.id && "ring-2 ring-green-500"
                )}
                onClick={() => {
                  setActiveDemo(feature.id);
                  feature.demo();
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                      feature.color
                    )}>
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>

                {/* 进度指示器 */}
                <AnimatePresence>
                  {currentStep === index && isAutoPlaying && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      exit={{ scaleX: 0 }}
                      transition={{ duration: 3, ease: "linear" }}
                      className="absolute bottom-0 left-0 h-1 bg-blue-500 origin-left"
                    />
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 特性列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          <h2 className="text-2xl font-bold text-center mb-8">核心特性</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-blue-600">📁 文件树增强</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• 平滑的折叠/展开动画</li>
                <li>• 悬停高亮和选中状态</li>
                <li>• 右键菜单（新建、重命名、删除）</li>
                <li>• 拖拽排序和层级调整</li>
                <li>• 实时位置提示线</li>
                <li>• 动态图标状态变化</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-600">📑 标签页系统</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• 多标签页支持</li>
                <li>• 拖拽排序标签</li>
                <li>• 双击重命名</li>
                <li>• 分屏编辑功能</li>
                <li>• 标签页固定</li>
                <li>• 平滑切换动画</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-purple-600">✨ 编辑器增强</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Markdown/富文本切换</li>
                <li>• 实时预览模式</li>
                <li>• 分屏编辑</li>
                <li>• 自动保存</li>
                <li>• 语法高亮</li>
                <li>• 双向链接支持</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-orange-600">🎯 交互优化</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• 所有操作都有过渡动画</li>
                <li>• 精细的悬停反馈</li>
                <li>• 拖拽预览效果</li>
                <li>• 键盘快捷键支持</li>
                <li>• 响应式设计</li>
                <li>• 无障碍访问</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* 底部信息 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12 text-gray-500"
        >
          <p>
            参考 <strong>Obsidian</strong> 的轻量流畅，<strong>Notion</strong> 的极简直观，<strong>VSCode</strong> 的专业化与可扩展性
          </p>
          <p className="mt-2 text-sm">
            像素级还原交互体验，注重细节，便于二次扩展插件化
          </p>
        </motion.div>
      </div>
    </div>
  );
}
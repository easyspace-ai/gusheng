/**
 * 未链接提及计算工具
 * 扫描所有笔记内容，找出提及但未链接的引用
 */

import { type Note } from '@/stores/notesStore';

export interface UnlinkedMention {
  noteId: string;        // 提及所在的笔记ID
  noteTitle: string;     // 提及所在的笔记标题
  context: string;       // 提及的上下文文本
  position: number;      // 提及在内容中的位置
  matchText: string;     // 匹配的文本
}

/**
 * 提取笔记中的所有双向链接
 */
function extractLinks(content: string): Set<string> {
  const links = new Set<string>();
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    // 移除链接中的别名（如果有）
    const linkText = match[1].split('|')[0].trim();
    links.add(linkText.toLowerCase());
  }
  
  return links;
}

/**
 * 检查文本中是否包含目标笔记的名称（但不是链接）
 */
function findUnlinkedMentions(
  content: string,
  targetNoteTitle: string,
  existingLinks: Set<string>
): UnlinkedMention[] {
  const mentions: UnlinkedMention[] = [];
  
  // 如果已经有链接到目标笔记，则不计算未链接提及
  if (existingLinks.has(targetNoteTitle.toLowerCase())) {
    return mentions;
  }
  
  // 创建搜索模式 - 匹配完整单词
  const searchPattern = new RegExp(`\\b${escapeRegExp(targetNoteTitle)}\\b`, 'gi');
  let match;
  
  while ((match = searchPattern.exec(content)) !== null) {
    // 检查是否在链接内部
    const beforeText = content.substring(Math.max(0, match.index - 2), match.index);
    const afterText = content.substring(match.index + match[0].length, Math.min(content.length, match.index + match[0].length + 2));
    
    // 跳过已经是链接的情况
    if (beforeText === '[[' && afterText.startsWith(']]')) {
      continue;
    }
    
    // 获取上下文（前后各50个字符）
    const contextStart = Math.max(0, match.index - 50);
    const contextEnd = Math.min(content.length, match.index + match[0].length + 50);
    const context = content.substring(contextStart, contextEnd);
    
    mentions.push({
      noteId: '',  // 将在外部设置
      noteTitle: '', // 将在外部设置
      context: context.trim(),
      position: match.index,
      matchText: match[0]
    });
  }
  
  return mentions;
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 计算所有笔记的未链接提及数量
 */
export function calculateUnlinkedMentions(notes: Record<string, Note>): Record<string, number> {
  const unlinkedCounts: Record<string, number> = {};
  
  // 初始化所有笔记的计数为0
  Object.keys(notes).forEach(noteId => {
    unlinkedCounts[noteId] = 0;
  });
  
  // 对每个笔记进行扫描
  Object.entries(notes).forEach(([scanningNoteId, scanningNote]) => {
    const existingLinks = extractLinks(scanningNote.content);
    
    // 检查是否提及了其他笔记
    Object.entries(notes).forEach(([targetNoteId, targetNote]) => {
      // 跳过自己
      if (scanningNoteId === targetNoteId) return;
      
      // 查找未链接提及
      const mentions = findUnlinkedMentions(
        scanningNote.content,
        targetNote.title,
        existingLinks
      );
      
      // 增加目标笔记的未链接提及计数
      if (mentions.length > 0) {
        unlinkedCounts[targetNoteId] += mentions.length;
      }
    });
  });
  
  return unlinkedCounts;
}

/**
 * 获取特定笔记的所有未链接提及详情
 */
export function getUnlinkedMentionsForNote(
  targetNoteId: string,
  notes: Record<string, Note>
): UnlinkedMention[] {
  const targetNote = notes[targetNoteId];
  if (!targetNote) return [];
  
  const allMentions: UnlinkedMention[] = [];
  
  // 扫描所有其他笔记
  Object.entries(notes).forEach(([scanningNoteId, scanningNote]) => {
    // 跳过自己
    if (scanningNoteId === targetNoteId) return;
    
    const existingLinks = extractLinks(scanningNote.content);
    const mentions = findUnlinkedMentions(
      scanningNote.content,
      targetNote.title,
      existingLinks
    );
    
    // 设置笔记信息并添加到结果
    mentions.forEach(mention => {
      mention.noteId = scanningNoteId;
      mention.noteTitle = scanningNote.title;
      allMentions.push(mention);
    });
  });
  
  return allMentions;
}

/**
 * 批量计算未链接提及（带缓存和增量更新）
 */
export class UnlinkedMentionsCalculator {
  private cache: Map<string, number> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  
  /**
   * 计算需要更新的笔记
   */
  private getNotesToUpdate(notes: Record<string, Note>): Set<string> {
    const toUpdate = new Set<string>();
    
    Object.entries(notes).forEach(([noteId, note]) => {
      const lastUpdate = this.lastUpdateTime.get(noteId);
      const noteUpdateTime = note.updatedAt.getTime();
      
      if (!lastUpdate || lastUpdate < noteUpdateTime) {
        toUpdate.add(noteId);
      }
    });
    
    return toUpdate;
  }
  
  /**
   * 批量计算未链接提及（支持增量更新）
   */
  calculate(notes: Record<string, Note>, forceFullUpdate = false): Record<string, number> {
    if (forceFullUpdate) {
      this.cache.clear();
      this.lastUpdateTime.clear();
    }
    
    const toUpdate = this.getNotesToUpdate(notes);
    
    // 如果有笔记需要更新，重新计算所有提及
    if (toUpdate.size > 0 || this.cache.size === 0) {
      const counts = calculateUnlinkedMentions(notes);
      
      // 更新缓存
      Object.entries(counts).forEach(([noteId, count]) => {
        this.cache.set(noteId, count);
      });
      
      // 更新时间戳
      Object.entries(notes).forEach(([noteId, note]) => {
        this.lastUpdateTime.set(noteId, note.updatedAt.getTime());
      });
    }
    
    // 返回缓存的结果
    const result: Record<string, number> = {};
    this.cache.forEach((count, noteId) => {
      result[noteId] = count;
    });
    
    return result;
  }
  
  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    this.lastUpdateTime.clear();
  }
}
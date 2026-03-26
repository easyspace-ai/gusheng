import { useEffect, useRef, useState } from 'react'
import { Share2, ZoomIn, ZoomOut, RotateCcw, Settings } from 'lucide-react'
import { useAppStore } from '../../stores'
import * as d3 from 'd3'

interface Node {
  id: string
  title: string
  group: number
  linkCount: number
}

interface Link {
  source: string
  target: string
}

export function GraphPanel() {
  const { notes, openNoteInTab } = useAppStore()
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  // 构建图数据
  const buildGraphData = () => {
    const nodes: Node[] = []
    const links: Link[] = []
    const linkCounts: Record<string, number> = {}

    // 计算每个笔记的链接数量
    Object.values(notes).forEach(note => {
      linkCounts[note.id] = note.links.length + note.backlinks.length
    })

    // 创建节点
    Object.values(notes).forEach(note => {
      nodes.push({
        id: note.id,
        title: note.title,
        group: Math.min(Math.floor(linkCounts[note.id] / 2) + 1, 5),
        linkCount: linkCounts[note.id]
      })
    })

    // 创建链接
    Object.values(notes).forEach(note => {
      note.links.forEach(linkedTitle => {
        const targetNote = Object.values(notes).find(n => n.title === linkedTitle)
        if (targetNote) {
          links.push({
            source: note.id,
            target: targetNote.id
          })
        }
      })
    })

    return { nodes, links }
  }

  const renderGraph = () => {
    const svg = d3.select(svgRef.current)
    const container = svg.select('.graph-container')
    
    if (container.empty()) {
      svg.append('g').attr('class', 'graph-container')
    }

    const { nodes, links } = buildGraphData()
    
    if (nodes.length === 0) return

    const width = 300
    const height = 400
    
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20))

    const g = svg.select('.graph-container')
    g.selectAll('*').remove()

    // 添加缩放和拖拽功能
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        setZoomLevel(event.transform.k)
      })

    svg.call(zoom as any)

    // 绘制链接
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('class', 'link')
      .style('stroke', '#999')
      .style('stroke-opacity', 0.6)
      .style('stroke-width', 1.5)

    // 绘制节点
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)

    // 节点圆圈
    node.append('circle')
      .attr('r', (d) => Math.max(8, Math.min(20, 8 + d.linkCount * 2)))
      .style('fill', (d) => {
        const colors = ['#007acc', '#00aa88', '#aa6600', '#aa0088', '#8800aa']
        return colors[d.group - 1] || colors[0]
      })
      .style('stroke', '#fff')
      .style('stroke-width', 2)

    // 节点标签
    node.append('text')
      .text((d) => d.title.length > 10 ? d.title.substring(0, 10) + '...' : d.title)
      .style('font-size', '10px')
      .style('text-anchor', 'middle')
      .style('fill', 'currentColor')
      .attr('dy', -25)
      .style('pointer-events', 'none')

    // 鼠标悬停效果
    node.on('mouseover', function(_, d) {
      d3.select(this).select('circle')
        .style('stroke-width', 4)
        .style('stroke', '#007acc')
      
      // 显示完整标题
      d3.select(this).append('title')
        .text(`${d.title} (${d.linkCount} 个连接)`)
    })
    .on('mouseout', function() {
      d3.select(this).select('circle')
        .style('stroke-width', 2)
        .style('stroke', '#fff')
      
      d3.select(this).select('title').remove()
    })

    // 双击打开笔记
    node.on('dblclick', function(_, d) {
      openNoteInTab(d.id)
    })

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: any) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }
  }

  useEffect(() => {
    renderGraph()
  }, [notes])

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom().scaleBy as any,
      1.5
    )
  }

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom().scaleBy as any,
      1 / 1.5
    )
  }

  const handleReset = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom().transform as any,
      d3.zoomIdentity
    )
    setZoomLevel(1)
  }

  const { nodes, links } = buildGraphData()

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="p-3 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Share2 size={14} className="mr-2" />
            <span className="text-sm font-medium text-light-text dark:text-dark-text">
              关系图
            </span>
          </div>
          <button className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors">
            <Settings size={14} />
          </button>
        </div>
        
        <div className="flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary mb-2">
          <span>{nodes.length} 个节点, {links.length} 个连接</span>
          <span>缩放: {Math.round(zoomLevel * 100)}%</span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
            title="放大"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
            title="缩小"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={handleReset}
            className="p-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
            title="重置视图"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* 图谱视图 */}
      <div className="flex-1 relative">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-light-text-secondary dark:text-dark-text-secondary">
            <div className="text-center">
              <Share2 size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-1">暂无关系图</p>
              <p className="text-xs">创建笔记和链接后会显示关系图</p>
            </div>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: 'transparent' }}
          />
        )}
      </div>

      {/* 图例 */}
      {nodes.length > 0 && (
        <div className="p-3 border-t border-light-border dark:border-dark-border text-xs text-light-text-secondary dark:text-dark-text-secondary">
          <div className="space-y-1">
            <div>• 双击节点打开笔记</div>
            <div>• 拖拽节点调整位置</div>
            <div>• 滚轮或手势缩放视图</div>
            <div>• 节点大小表示连接数量</div>
          </div>
        </div>
      )}
    </div>
  )
}
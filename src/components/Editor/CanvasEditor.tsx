import React, { useRef, useEffect, useState } from 'react';
import { FileItem } from './FileTree';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Palette, Square, Circle, Minus, Eraser, Save } from 'lucide-react';

interface CanvasEditorProps {
  file: FileItem;
  onSave: (file: FileItem, content: string) => void;
}

type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text';

const CanvasEditor: React.FC<CanvasEditorProps> = ({ file, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState([2]);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Load existing content
    if (file.content) {
      try {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = file.content;
      } catch (error) {
        console.error('Failed to load canvas content:', error);
      }
    } else {
      // Clear canvas with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [file.content]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPoint(pos);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = lineWidth[0];
    ctx.lineCap = 'round';
    ctx.strokeStyle = tool === 'eraser' ? 'white' : color;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);

    switch (tool) {
      case 'rectangle':
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth[0];
        ctx.strokeRect(
          startPoint.x,
          startPoint.y,
          pos.x - startPoint.x,
          pos.y - startPoint.y
        );
        break;
      case 'circle':
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth[0];
        const radius = Math.sqrt(
          Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2)
        );
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'line':
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth[0];
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        break;
    }

    // Auto-save after drawing
    setTimeout(saveCanvas, 100);
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL();
    onSave(file, dataURL);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas?.width || 0, canvas?.height || 0);
    saveCanvas();
  };

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={tool === 'pen' ? 'default' : 'outline'}
            onClick={() => setTool('pen')}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={tool === 'eraser' ? 'default' : 'outline'}
            onClick={() => setTool('eraser')}
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={tool === 'rectangle' ? 'default' : 'outline'}
            onClick={() => setTool('rectangle')}
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={tool === 'circle' ? 'default' : 'outline'}
            onClick={() => setTool('circle')}
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={tool === 'line' ? 'default' : 'outline'}
            onClick={() => setTool('line')}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {colors.map(c => (
            <button
              key={c}
              className="w-6 h-6 rounded border-2 border-border"
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-6 border border-border rounded"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">粗细:</span>
          <Slider
            value={lineWidth}
            onValueChange={setLineWidth}
            max={20}
            min={1}
            step={1}
            className="w-20"
          />
          <span className="text-sm w-6">{lineWidth[0]}</span>
        </div>

        <Button size="sm" onClick={clearCanvas} variant="outline">
          清空
        </Button>
        <Button size="sm" onClick={saveCanvas}>
          <Save className="h-4 w-4 mr-1" />
          保存
        </Button>
      </div>

      <div className="flex-1 p-2">
        <canvas
          ref={canvasRef}
          className="w-full h-full border border-border rounded bg-white cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  );
};

export default CanvasEditor;
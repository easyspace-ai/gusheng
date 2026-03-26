import React, { useState, useEffect } from 'react';
import { FileItem } from './FileTree';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';

interface DatabaseEditorProps {
  file: FileItem;
  onSave: (file: FileItem, content: string) => void;
}

interface DatabaseRow {
  id: string;
  [key: string]: any;
}

const DatabaseEditor: React.FC<DatabaseEditorProps> = ({ file, onSave }) => {
  const [columns, setColumns] = useState<string[]>(['ID', '名称', '类型']);
  const [rows, setRows] = useState<DatabaseRow[]>([]);
  const [newColumnName, setNewColumnName] = useState('');

  useEffect(() => {
    if (file.content) {
      try {
        const data = JSON.parse(file.content);
        setColumns(data.columns || ['ID', '名称', '类型']);
        setRows(data.rows || []);
      } catch (error) {
        console.error('Failed to parse database content:', error);
      }
    }
  }, [file.content]);

  const saveData = () => {
    const data = { columns, rows };
    onSave(file, JSON.stringify(data, null, 2));
  };

  const addColumn = () => {
    if (newColumnName.trim() && !columns.includes(newColumnName)) {
      setColumns([...columns, newColumnName]);
      setNewColumnName('');
      setTimeout(saveData, 100);
    }
  };

  const addRow = () => {
    const newRow: DatabaseRow = { id: Date.now().toString() };
    columns.forEach(col => {
      newRow[col] = '';
    });
    setRows([...rows, newRow]);
    setTimeout(saveData, 100);
  };

  const updateCell = (rowId: string, column: string, value: string) => {
    setRows(rows.map(row => 
      row.id === rowId ? { ...row, [column]: value } : row
    ));
    setTimeout(saveData, 100);
  };

  const deleteRow = (rowId: string) => {
    setRows(rows.filter(row => row.id !== rowId));
    setTimeout(saveData, 100);
  };

  return (
    <div className="h-full flex flex-col p-4 bg-background">
      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder="新列名称"
          value={newColumnName}
          onChange={(e) => setNewColumnName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addColumn()}
          className="w-48"
        />
        <Button onClick={addColumn} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          添加列
        </Button>
        <Button onClick={addRow} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          添加行
        </Button>
      </div>

      <div className="flex-1 overflow-auto border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead key={column}>{column}</TableHead>
              ))}
              <TableHead className="w-12">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.id}>
                {columns.map(column => (
                  <TableCell key={column}>
                    <Input
                      value={row[column] || ''}
                      onChange={(e) => updateCell(row.id, column, e.target.value)}
                      className="border-none p-1 h-8"
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteRow(row.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DatabaseEditor;
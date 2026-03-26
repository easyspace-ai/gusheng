import { TestLayout } from './components/Layout/TestLayout'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { ContextMenuProvider } from './components/ContextMenu/ContextMenuProvider'
import { DocumentManager } from './components/DocumentManager/DocumentManager'

function App() {
  return (
    <ContextMenuProvider>
      <div className="w-full h-full bg-background text-foreground overflow-hidden">
        <div className="flex h-full">
             <TestLayout />
         
          
        </div>
        <CommandPalette />
      </div>
    </ContextMenuProvider>
  )
}

export default App
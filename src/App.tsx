import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProLayout } from './components/Layout/ProLayout'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { ContextMenuProvider } from './components/ContextMenu/ContextMenuProvider'
import { PluginSystemProvider } from './components/Plugins/PluginSystemIntegration'

function App() {
  return (
    <PluginSystemProvider>
      <ContextMenuProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="*"
              element={
                <div className="w-full h-full overflow-hidden pro-selection">
                  <ProLayout />
                  <CommandPalette />
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </ContextMenuProvider>
    </PluginSystemProvider>
  )
}

export default App

import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
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
                <div className="w-full h-full bg-background text-foreground overflow-hidden">
                  <Layout />
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

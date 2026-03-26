import * as React from 'react'
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
  type PanelOnResize,
} from 'react-resizable-panels'

type ResizableProps = React.ComponentProps<typeof PanelGroup>

export function Resizable({ className, ...props }: ResizableProps) {
  return (
    <PanelGroup className={className} {...props} />
  )
}

export const ResizablePanel = React.forwardRef<
  ImperativePanelHandle,
  React.ComponentProps<typeof Panel>
>(({ className, ...props }, ref) => {
  return (
    <Panel ref={ref} className={className} {...props} />
  )
})

ResizablePanel.displayName = 'ResizablePanel'

export function ResizableHandle(
  { className, withHandle = false, ...props }: React.ComponentProps<typeof PanelResizeHandle> & { withHandle?: boolean }
) {
  return (
    <PanelResizeHandle
      className={[
        'relative flex items-center justify-center',
        'data-[resize-handle-state=drag]:bg-light-border',
        'dark:data-[resize-handle-state=drag]:bg-dark-border',
        'transition-colors',
        className || '',
      ].join(' ')}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-light-border dark:border-dark-border bg-light-hover dark:bg-dark-hover">
          <div className="h-2 w-0.5 bg-light-border dark:bg-dark-border" />
        </div>
      ) : null}
    </PanelResizeHandle>
  )
}

export type { PanelOnResize }


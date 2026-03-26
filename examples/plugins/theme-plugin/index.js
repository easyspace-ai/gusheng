// Custom Theme Plugin
class CustomThemePlugin {
  constructor(manifest) {
    this.id = manifest.id;
    this.manifest = manifest;
    this.themes = {
      'dark': {
        name: 'Dark Theme',
        colors: {
          primary: '#3b82f6',
          secondary: '#6b7280',
          accent: '#10b981',
          background: '#1f2937',
          surface: '#374151',
          text: '#f9fafb',
          textSecondary: '#d1d5db',
          border: '#4b5563',
          error: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981'
        }
      },
      'light': {
        name: 'Light Theme',
        colors: {
          primary: '#3b82f6',
          secondary: '#6b7280',
          accent: '#10b981',
          background: '#ffffff',
          surface: '#f9fafb',
          text: '#111827',
          textSecondary: '#6b7280',
          border: '#d1d5db',
          error: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981'
        }
      },
      'ocean': {
        name: 'Ocean Theme',
        colors: {
          primary: '#0ea5e9',
          secondary: '#64748b',
          accent: '#06b6d4',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f8fafc',
          textSecondary: '#cbd5e1',
          border: '#334155',
          error: '#ef4444',
          warning: '#f59e0b',
          success: '#22c55e'
        }
      }
    };
    this.currentTheme = 'light';
  }

  async onLoad(context) {
    this.context = context;
    this.logger = context.logger;
    
    this.logger.info('Custom Theme plugin loaded');
    
    // Load configuration
    this.loadConfiguration();
    
    // Apply stored theme
    this.applyStoredTheme();
    
    // Register theme panel
    this.addThemePanel();
  }

  async onUnload(context) {
    this.logger.info('Custom Theme plugin unloaded');
    
    // Reset to default theme
    this.removeCustomStyles();
  }

  // Command handlers
  openThemePanel() {
    this.logger.info('Opening theme panel');
    return {
      success: true,
      message: 'Theme panel opened',
      action: 'show-panel'
    };
  }

  toggleTheme() {
    const currentTheme = this.getConfig('currentTheme', 'light');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    this.applyTheme(newTheme);
    this.setConfig('currentTheme', newTheme);
    
    this.logger.info(`Theme toggled to: ${newTheme}`);
    return {
      success: true,
      message: `Switched to ${newTheme} theme`,
      theme: newTheme
    };
  }

  // Hook handlers
  applyStoredTheme() {
    const storedTheme = this.getConfig('currentTheme', 'light');
    this.applyTheme(storedTheme);
  }

  // Theme management methods
  applyTheme(themeName) {
    this.currentTheme = themeName;
    
    if (this.themes[themeName]) {
      this.applyThemeColors(this.themes[themeName].colors);
    } else {
      // Apply custom theme colors
      const customColors = this.getConfig('customColors', {});
      this.applyThemeColors(customColors);
    }
    
    // Add theme class to document
    document.documentElement.className = document.documentElement.className
      .replace(/theme-\w+/g, '') + ` theme-${themeName}`;
    
    this.logger.debug(`Applied theme: ${themeName}`);
  }

  applyThemeColors(colors) {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });
    
    // Apply some common derived colors
    root.style.setProperty('--theme-primary-hover', this.lightenColor(colors.primary, 10));
    root.style.setProperty('--theme-accent-hover', this.lightenColor(colors.accent, 10));
  }

  removeCustomStyles() {
    const root = document.documentElement;
    
    // Remove custom CSS properties
    Object.keys(this.themes.light.colors).forEach(key => {
      const cssVar = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.removeProperty(cssVar);
    });
    
    // Remove theme classes
    document.documentElement.className = document.documentElement.className
      .replace(/theme-\w+/g, '');
  }

  addThemePanel() {
    // Register theme panel with the UI system
    this.context.ui.addPanel({
      id: 'theme-panel',
      title: 'Theme Settings',
      icon: 'palette',
      position: 'right',
      component: this.createThemePanelComponent()
    });
  }

  createThemePanelComponent() {
    return () => {
      const [selectedTheme, setSelectedTheme] = React.useState(this.currentTheme);
      const [customColors, setCustomColors] = React.useState(
        this.getConfig('customColors', this.themes.light.colors)
      );

      const applyTheme = (themeName) => {
        setSelectedTheme(themeName);
        this.applyTheme(themeName);
        this.setConfig('currentTheme', themeName);
      };

      const updateCustomColor = (colorKey, value) => {
        const newColors = { ...customColors, [colorKey]: value };
        setCustomColors(newColors);
        this.setConfig('customColors', newColors);
        this.applyThemeColors(newColors);
      };

      const resetToDefaults = () => {
        setCustomColors(this.themes.light.colors);
        setSelectedTheme('light');
        this.applyTheme('light');
        this.setConfig('currentTheme', 'light');
        this.setConfig('customColors', this.themes.light.colors);
      };

      return React.createElement('div', {
        className: 'h-full flex flex-col bg-background',
      }, [
        React.createElement('div', {
          key: 'header',
          className: 'p-4 border-b border-border',
        }, [
          React.createElement('h2', {
            key: 'title',
            className: 'text-lg font-semibold flex items-center gap-2',
          }, [
            React.createElement('span', { key: 'icon' }, '🎨'),
            'Theme Settings'
          ])
        ]),

        React.createElement('div', {
          key: 'content',
          className: 'flex-1 p-4 overflow-y-auto',
        }, [
          // Theme selector
          React.createElement('div', {
            key: 'theme-selector',
            className: 'mb-6',
          }, [
            React.createElement('h3', {
              key: 'selector-title',
              className: 'text-sm font-medium mb-3',
            }, 'Choose Theme'),
            React.createElement('div', {
              key: 'theme-options',
              className: 'space-y-2',
            }, Object.entries(this.themes).map(([key, theme]) =>
              React.createElement('button', {
                key: key,
                onClick: () => applyTheme(key),
                className: `w-full p-3 border rounded-lg text-left transition-colors ${
                  selectedTheme === key 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border hover:border-primary/50'
                }`,
              }, [
                React.createElement('div', {
                  key: 'preview',
                  className: 'w-full h-6 rounded mb-2 flex overflow-hidden',
                }, [
                  React.createElement('div', {
                    key: 'color1',
                    className: 'flex-1',
                    style: { backgroundColor: theme.colors.primary },
                  }),
                  React.createElement('div', {
                    key: 'color2', 
                    className: 'flex-1',
                    style: { backgroundColor: theme.colors.accent },
                  }),
                  React.createElement('div', {
                    key: 'color3',
                    className: 'flex-1',
                    style: { backgroundColor: theme.colors.background },
                  })
                ]),
                React.createElement('div', {
                  key: 'name',
                  className: 'text-sm font-medium',
                }, theme.name)
              ])
            ))
          ]),

          // Quick toggle
          React.createElement('div', {
            key: 'quick-toggle',
            className: 'mb-6',
          }, [
            React.createElement('h3', {
              key: 'toggle-title',
              className: 'text-sm font-medium mb-3',
            }, 'Quick Toggle'),
            React.createElement('button', {
              key: 'toggle-btn',
              onClick: () => {
                const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
                applyTheme(newTheme);
              },
              className: 'w-full p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors',
            }, `Switch to ${this.currentTheme === 'dark' ? 'Light' : 'Dark'} Theme`)
          ]),

          // Custom colors section
          React.createElement('div', {
            key: 'custom-colors',
            className: 'mb-6',
          }, [
            React.createElement('h3', {
              key: 'colors-title',
              className: 'text-sm font-medium mb-3',
            }, 'Custom Colors'),
            React.createElement('div', {
              key: 'color-inputs',
              className: 'space-y-3',
            }, Object.entries(customColors).map(([key, value]) =>
              React.createElement('div', {
                key: key,
                className: 'flex items-center space-x-3',
              }, [
                React.createElement('label', {
                  key: 'label',
                  className: 'text-xs font-medium w-20 capitalize',
                }, key.replace(/([A-Z])/g, ' $1')),
                React.createElement('input', {
                  key: 'color-input',
                  type: 'color',
                  value: value,
                  onChange: (e) => updateCustomColor(key, e.target.value),
                  className: 'w-8 h-8 rounded border border-border',
                }),
                React.createElement('input', {
                  key: 'text-input',
                  type: 'text',
                  value: value,
                  onChange: (e) => updateCustomColor(key, e.target.value),
                  className: 'flex-1 px-2 py-1 text-xs border border-border rounded font-mono bg-background',
                })
              ])
            ))
          ]),

          // Reset button
          React.createElement('div', {
            key: 'reset-section',
            className: 'mt-auto',
          }, [
            React.createElement('button', {
              key: 'reset-btn',
              onClick: resetToDefaults,
              className: 'w-full p-3 text-sm border border-border rounded-lg hover:bg-muted transition-colors',
            }, 'Reset to Defaults')
          ])
        ])
      ]);
    };
  }

  // Utility methods
  lightenColor(color, percent) {
    // Simple color lightening utility
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  loadConfiguration() {
    const savedConfig = this.context.storage.get('config') || {};
    this.config = { ...this.manifest.config, ...savedConfig };
  }

  getConfig(key, defaultValue) {
    return this.config?.[key] ?? defaultValue;
  }

  setConfig(key, value) {
    if (!this.config) this.config = {};
    this.config[key] = value;
    this.context.storage.set('config', this.config);
  }
}

// Export plugin class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomThemePlugin;
} else {
  window.CustomThemePlugin = CustomThemePlugin;
}
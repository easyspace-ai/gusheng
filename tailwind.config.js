/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // New token colors (mapped to CSS variables)
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        panel: 'var(--panel)',
        sidebar: 'var(--sidebar)',
        'sidebar-foreground': 'var(--sidebar-foreground)',
        'sidebar-border': 'var(--sidebar-border)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        // Custom helpers for navigation and tabs
        'nav-hover': 'var(--nav-hover)',
        'tab-active': 'var(--tab-active)',
        'tab-inactive': 'var(--tab-inactive)',
        'tab-hover': 'var(--tab-hover)',
        'tab-border': 'var(--tab-border)',
        'tab-bar-background': 'var(--tab-bar-background)',
        
        // File tree colors
        'file-default': 'var(--file-default)',
        'file-hover': 'var(--file-hover)',
        'file-selected': 'var(--file-selected)',
        'folder-icon': 'var(--folder-icon)',
        'background-hover': 'var(--background-hover)',
        'background-selected': 'var(--background-selected)',
        
        // Interactive accent
        'interactive-accent': 'var(--interactive-accent)',
        'interactive-accent-hover': 'var(--interactive-accent-hover)'
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', 'monospace'],
        'editor': ['Inter', '-apple-system', 'sans-serif']
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      borderRadius: {
        'xs': '0.125rem',
      },
      boxShadow: {
        dropdown: 'var(--shadow-dropdown, 0 8px 24px rgba(0,0,0,0.15))'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
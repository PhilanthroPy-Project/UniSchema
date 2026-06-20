/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        system: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        apple: {
          ink: '#1d1d1f',
          parchment: '#f5f5f7',
          pearl: '#fafafc',
          hairline: '#e0e0e0',
          divider: '#f0f0f0',
          muted: '#7a7a7a',
          blue: '#0066cc',
          'blue-focus': '#0071e3',
          'blue-ios': '#007AFF',
          green: '#34C759',
          red: '#FF3B30',
          dot: '#E5E5EA',
        },
      },
      borderRadius: {
        'apple-sm': '8px',
        'apple-md': '11px',
        'apple-lg': '18px',
      },
    },
  },
  plugins: [],
}

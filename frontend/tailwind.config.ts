import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './app.vue',
    './error.vue',
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './composables/**/*.{js,ts}',
    './layouts/**/*.vue',
    './middleware/**/*.{js,ts}',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './stores/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        tropical: {
          coral: '#FF6B6B',
          orange: '#FF8E53',
          turquoise: '#4ECDC4',
          teal: '#44A08D',
          green: '#95E1D3',
          'green-dark': '#6BCB77',
          beige: '#F5E6D3',
          'warm-white': '#FFF8F0',
          charcoal: '#2C3E50',
          'charcoal-dark': '#34495E',
        },
      },
      backgroundImage: {
        'gradient-sunset': 'linear-gradient(to right, #FF6B6B, #FF8E53)',
        'gradient-ocean': 'linear-gradient(to right, #4ECDC4, #44A08D)',
        'gradient-tropical': 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #4ECDC4 100%)',
      },
    },
  },
}


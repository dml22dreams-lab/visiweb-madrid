/** Configuración de Tailwind para la plantilla de carta digital (demo).
 *  index.html sigue usando el CDN y no se ve afectado por este build. */
module.exports = {
  content: [
    './demo.html',
    './demo-app.js',
    './demo-data.js',
    './aviso-legal.html',
    './politica-privacidad.html',
    './politica-cookies.html'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif']
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
      }
    }
  },
  plugins: []
};

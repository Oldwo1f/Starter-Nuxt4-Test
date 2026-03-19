import { polyfill } from 'mobile-drag-drop'
import { scrollBehaviourDragImageTranslateOverride } from 'mobile-drag-drop/scroll-behaviour'
import 'mobile-drag-drop/default.css'

export default defineNuxtPlugin(() => {
  // Initialise le polyfill pour le drag & drop sur mobile/touch
  polyfill({
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
  })

  // Requis par le polyfill : un listener dragenter qui appelle preventDefault()
  // pour que le drop soit autorisé (cf. README mobile-drag-drop)
  document.addEventListener('dragenter', (e) => {
    e.preventDefault()
  })

  // iOS Safari 10+ : support des passive event listeners
  // Permet au polyfill de fonctionner correctement sur iOS
  if (typeof window !== 'undefined') {
    window.addEventListener('touchmove', () => {}, { passive: false })
  }
})

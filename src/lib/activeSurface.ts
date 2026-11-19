const exiting='[data-closing-sheet="true"], [data-surface-exiting="true"]'
/** Exit animations retain their DOM. Only a live surface may consume Telegram Back. */
export function activeDismissButton(){return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-loft-dismiss]')).filter(button=>!button.closest(exiting)).at(-1)}
export function settleExitingSurfaces(){document.querySelectorAll<HTMLElement>(exiting).forEach(surface=>{surface.style.visibility='hidden';surface.removeAttribute('data-surface-dialog')})}

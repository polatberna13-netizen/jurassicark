import { reactive } from 'vue'

const state = reactive({ items: [] })
let seed = 0

function push({ message, type = 'success', duration = 5000 }) {
  const id = ++seed
  state.items.push({ id, message, type })
  if (duration > 0) setTimeout(() => remove(id), duration)
  return id
}

function remove(id) {
  const i = state.items.findIndex(t => t.id === id)
  if (i !== -1) state.items.splice(i, 1)
}

export function useToast() {
  return {
    toasts: state.items,
    show: push,
    success: (message, duration) => push({ message, type: 'success', duration }),
    error: (message, duration) => push({ message, type: 'danger', duration }),
    info: (message, duration) => push({ message, type: 'info', duration }),
    remove,
  }
}

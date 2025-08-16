import { ref, computed, watch } from 'vue'

let initial = []
if (typeof localStorage !== 'undefined') {
  const raw = localStorage.getItem('cart:v1')
  if (raw) {
    try { initial = JSON.parse(raw) || [] } catch { initial = [] }
  }
}

const cart = ref(initial)

const save = () => {
  try { localStorage.setItem('cart:v1', JSON.stringify(cart.value)) } catch {}
}
watch(cart, save, { deep: true })

const add = (item, qty = 1) => {
  const id = item.itemId || item.id
  const price = Number(item.price ?? 0)
  if (!id || !Number.isFinite(qty) || qty <= 0) return

  const idx = cart.value.findIndex(x => x.itemId === id)
  if (idx >= 0) {
    cart.value[idx].qty += qty             
  } else {
    cart.value.push({
      itemId: id,
      name: item.name,
      price,
      image: item.image,
      type: item.type,
      qty
    })
  }
}

const decrement = (itemId, step = 1) => {
  if (!Number.isFinite(step) || step <= 0) return
  const idx = cart.value.findIndex(x => x.itemId === itemId)
  if (idx < 0) return
  cart.value[idx].qty -= step
  if (cart.value[idx].qty <= 0) cart.value.splice(idx, 1)
}

const setQty = (itemId, qty) => {
  if (!Number.isFinite(qty)) return
  if (qty <= 0) { remove(itemId); return }
  const idx = cart.value.findIndex(x => x.itemId === itemId)
  if (idx < 0) return
  cart.value[idx].qty = qty
}

const remove = (itemId) => { cart.value = cart.value.filter(x => x.itemId !== itemId) }
const clear = () => { cart.value = [] }

const count = computed(() => cart.value.reduce((a, x) => a + x.qty, 0))
const total = computed(() =>
  cart.value.reduce((a, x) => a + (Number(x.price) || 0) * x.qty, 0).toFixed(2)
)

export function useCart() {
  return { cart, add, decrement, setQty, remove, clear, count, total }
}

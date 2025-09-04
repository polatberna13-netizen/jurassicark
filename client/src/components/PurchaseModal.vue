<template>
  <transition name="fade">
    <div v-if="open" class="modal-backdrop" @click.self="close">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Cart">
        <button class="modal-close" @click="close" aria-label="Close">×</button>

        <h3 class="mb-3">Your Cart</h3>

        <div v-if="hasItems" class="cart-list">
          <div v-for="line in cart" :key="line.itemId" class="cart-row">
            <div class="col-info">
              <img v-if="line.image" :src="line.image" :alt="line.name" class="thumb" />
              <div class="meta">
                <div class="title-row">
                  <span class="name">{{ line.name }}</span>
                  
                  <label v-if="isDino(line)" class="hl-toggle">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      :checked="!!highLevel[line.itemId]"
                      @change="setHighLevel(line.itemId, $event.target.checked)"
                    />
                    <span>High level</span>
                  </label>

                  <span v-if="isBundleLine(line)" class="badge bundle-badge">Bundle</span>
                </div>

                <!-- Extra field & blueprint -->
                <div v-if="needsExtra(line)" class="extras">
                  <input
                    :id="`extra-${line.itemId}`"
                    class="form-control form-control-sm extras-input"
                    :placeholder="extraPlaceholder(line)"
                    :value="extraInfo[line.itemId] || ''"
                    @input="setExtra(line.itemId, $event.target.value)"
                    required
                  />

                  <label v-if="isBlueprintItem(line)" class="bp-toggle">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      :checked="!!blueprint[line.itemId]"
                      @change="setBlueprint(line.itemId, $event.target.checked)"
                    />
                    <span>Blueprint</span>
                  </label>
                </div>

                <p
                  v-if="needsExtra(line) && !(extraInfo[line.itemId] || '').trim()"
                  class="small text-warning mt-1"
                >
                  {{ extraLabel(line) }} is required.
                </p>
              </div>
            </div>

            <div class="col-price">
              <div class="each">€ {{ unitPrice(line).toFixed(2) }} each</div>
              <div class="line-total">€ {{ lineTotal(line).toFixed(2) }}</div>
            </div>

            <div class="col-qty">
              <div class="input-group quantity-input">
                <button type="button" class="button" @click="dec(line.itemId)">−</button>
                <input
                  :value="line.qty"
                  @input="onQtyInput(line.itemId, $event.target.value)"
                  type="number"
                  min="1"
                  step="1"
                  class="form-control text-center"
                  required
                />
                <button type="button" class="button" @click="inc(line)">+</button>
              </div>
            </div>

            <div class="col-del">
              <button class="btn btn-sm btn-outline-danger delete" @click="removeItem(line.itemId)" aria-label="Remove">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>

          <!-- User ID -->
          <div class="d-flex justify-content-end mt-3 pe-3 gap-2 align-items-center">
            <input v-model.trim="userId" type="text" placeholder="Enter your user name" class="form-control"
              style="max-width: 260px" required />
          </div>
          <p v-if="!userId" class="small mt-1 pe-3">User name is required to continue.</p>

          <hr class="my-3" />

          <!-- Totals -->
          <div class="d-flex justify-content-between align-items-center pe-3">
            <button class="button secondary" @click="clear()">Clear cart</button>
            <div class="text-end">
              <div class="small text-muted">Subtotal ({{ count }})</div>
              <div>€ {{ subtotal.toFixed(2) }}</div>

              <template v-if="discountAmount > 0">
                <div class="small text-muted mt-1">
                  Discount
                  <span class="ms-1 badge bg-success-subtle text-success border border-success"
                        style="font-size:.75rem">
                    Bundle discount
                  </span>
                </div>
                <div>− € {{ discountAmount.toFixed(2) }}</div>
              </template>

              <div class="fw-bold fs-5 mt-1">Total € {{ adjustedTotal }}</div>
              <div v-if="belowMin" class="small text-warning mt-1">
                Minimum order total is €{{ MIN_TOTAL_EUR.toFixed(2) }}.
              </div>
            </div>
          </div>

          <!-- Checkout -->
          <div class="d-flex justify-content-end mt-3 pe-3">
            <button class="button" @click="checkout" :disabled="pp.loading || !hasItems || !userId || belowMin">
              {{ pp.loading ? "Opening PayPal..." : "Checkout" }}
            </button>
          </div>
        </div>

        <p v-if="pp.error" class="alert alert-danger mt-2">{{ pp.error }}</p>
        <p v-if="pp.success" class="alert alert-success mt-2">{{ pp.success }}</p>
      </div>
    </div>
  </transition>

  <!-- PayPal overlay -->
  <div v-if="pp.show" class="pp-overlay">
    <div class="pp-card">
      <h4 class="mb-2">Complete your payment</h4>
      <div id="paypal-container"></div>
      <div class="d-flex justify-content-end mt-3">
        <button class="button secondary" @click="cancelPayPal" :disabled="pp.loading">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, nextTick, ref } from "vue"
import { useCart } from "../stores/useCart"

const userId = ref("")
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:3000" : "")
const MIN_TOTAL_EUR = Number(import.meta.env.VITE_MIN_ORDER_EUR ?? 2)

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(["update:open", "close"])

const { cart, add, decrement, remove, clear, count } = useCart()
const hasItems = computed(() => cart.value.length > 0)

const close = () => { emit("update:open", false); emit("close") }
const inc = (line) => add(line, 1)
const dec = (itemId) => decrement(itemId, 1)
const removeItem = (itemId) => remove(itemId)

const onQtyInput = (itemId, raw) => {
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  if (n <= 0) { remove(itemId); return }
  const current = cart.value.find(x => x.itemId === itemId)?.qty ?? 0
  const diff = n - current
  if (diff > 0) add({ itemId }, diff)
  else if (diff < 0) decrement(itemId, Math.abs(diff))
}

/* ---- Special fields ---- */
const EXTRA_IDS = { ChibiPet: "Chibi", skin: "Skin", Mastercraft: "Item name", MastercraftArmorSet: "Item name" }
const BLUEPRINT_IDS = new Set(["Mastercraft", "MastercraftArmorSet"])
const HIGH_LEVEL_MULTIPLIER = 2, BLUEPRINT_MULTIPLIER = 2

const extraInfo = reactive({})
const blueprint = reactive({})
const highLevel = reactive({})

const needsExtra = (line) => Object.prototype.hasOwnProperty.call(EXTRA_IDS, line.itemId)
const extraLabel = (line) => EXTRA_IDS[line.itemId]
const extraPlaceholder = (line) =>
  line.itemId === "ChibiPet" ? "Which Chibi?" :
  line.itemId === "skin" ? "Which Skin?" : "Item name"
const setExtra = (id, val) => { extraInfo[id] = val }

const isBlueprintItem = (line) => BLUEPRINT_IDS.has(line.itemId)
const setBlueprint = (id, val) => { blueprint[id] = !!val }
const isBlueprintApplied = (line) => isBlueprintItem(line) && !!blueprint[line.itemId]

const DINO_TYPES = ["Aquatic","Fantasy Creature","Flyer","Herbivore","Insect","Land Predator","Mammal Predator","Wyvern"]
const isDino = (line) => DINO_TYPES.includes(line.type)
const setHighLevel = (id, val) => { highLevel[id] = !!val }

/* ---- Pricing ---- */
const unitPrice = (line) => {
  const base = Number(line.price || 0)
  let mult = 1
  if (isDino(line) && highLevel[line.itemId]) mult *= HIGH_LEVEL_MULTIPLIER
  if (isBlueprintApplied(line)) mult *= BLUEPRINT_MULTIPLIER
  return base * mult
}
const lineTotal = (line) => unitPrice(line) * line.qty

/* ---- Discounts, totals ---- */
const getDiscountRate = (line) => {
  let rate = Number(line?.bundle?.discountRate)
  if (!Number.isFinite(rate)) rate = Number(line?.discountRate)
  if (!Number.isFinite(rate) && (line?.itemId === "starter-kit" || line?.type === "Bundle")) rate = 0.20
  return (Number.isFinite(rate) && rate > 0 && rate <= 1) ? rate : 0
}
const lineDiscount = (line) => {
  if (!isBundleLine(line)) return 0
  const rate = getDiscountRate(line)
  if (!rate) return 0
  return unitPrice(line) * line.qty * rate
}
const subtotal = computed(() => cart.value.reduce((s, line) => s + lineTotal(line), 0))
const discountAmount = computed(() => cart.value.reduce((s, line) => s + lineDiscount(line), 0))
const adjustedTotal = computed(() => (Math.round((subtotal.value - discountAmount.value) * 100) / 100).toFixed(2))
const belowMin = computed(() => Number(adjustedTotal.value) + 1e-9 < MIN_TOTAL_EUR)

const isBundleLine = (line) => line?.type === "Bundle" || !!line?.bundle || line?.itemId === "starter-kit"

/* ---- PayPal integration ---- */
const pp = reactive({ show: false, loading: false, error: "", success: "" })
let buttonsInstance = null

async function loadSdkIfNeeded() {
  if (window.paypal) return
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID
  if (!clientId) throw new Error("Missing VITE_PAYPAL_CLIENT_ID")
  const s = document.createElement("script")
  s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR&intent=capture&components=buttons&enable-funding=card`
  await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error("Failed to load PayPal SDK")); document.head.appendChild(s) })
}

async function renderButtons() {
  const host = document.getElementById("paypal-container")
  if (!host) return
  host.innerHTML = ""

  buttonsInstance = window.paypal.Buttons({
    createOrder: async () => {
      const items = cart.value.map(line => {
        const isHL = isDino(line) && !!highLevel[line.itemId]
        const extra = needsExtra(line) ? (extraInfo[line.itemId] || "").trim() : ""
        const isBP = isBlueprintApplied(line)

        const nameWithFlags = line.name + (isBP ? " (Blueprint)" : "")

        const parts = []
        if (isHL) parts.push("[High Level]")
        if (extra) parts.push(`[${extraLabel(line)}: ${extra}]`)
        if (isBP) parts.push("[Blueprint]")

        const description = `${line.type} #${line.itemId} ${parts.join(" ")}`.trim()

        return {
          name: nameWithFlags,
          sku: String(line.itemId),
          quantity: String(line.qty),
          unit_amount: { currency_code: "EUR", value: unitPrice(line).toFixed(2) },
          description
        }
      })

      const discountVal = Number(discountAmount.value.toFixed(2))
      if (discountVal > 0) {
        items.push({
          name: "Bundle discount",
          sku: "DISCOUNT",
          quantity: "1",
          unit_amount: { currency_code: "EUR", value: (-discountVal).toFixed(2) },
          description: "Applied to bundles"
        })
      }

      const amount = Number(adjustedTotal.value)
      const resp = await fetch(`${API_BASE}/api/paypal/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: "EUR", userId: userId.value, items })
      })
      const j = await resp.json()
      if (!resp.ok || !j?.id) throw new Error(j?.error || "Create order failed")
      return j.id
    },
    onApprove: async (data) => {
      const resp = await fetch(`${API_BASE}/api/paypal/orders/${data.orderID}/capture`, { method: "POST" })
      const j = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const desc = j?.details?.[0]?.description
        throw new Error(desc || j?.error || "Capture failed")
      }
      pp.show = false
      clear()
      pp.success = "Payment successful. Your order has been confirmed and will be delivered within 24 hours. If you experience any issues, please contact us via Discord."
      setTimeout(() => { if (pp.success) pp.success = ""; close() }, 5000)
    },
    onCancel: () => {
      pp.show = false
      pp.error = "Payment was cancelled. Please try again."
      setTimeout(() => { if (pp.error) pp.error = "" }, 5000)
    },
    onError: (err) => {
      pp.show = false
      pp.error = err?.message || "Something went wrong. Please try again."
      setTimeout(() => { if (pp.error) pp.error = "" }, 5000)
    },
    style: { shape: "rect", label: "pay", layout: "vertical" }
  })

  await buttonsInstance.render("#paypal-container")
}

async function checkout() {
  try {
    pp.error = ""; pp.success = ""; pp.loading = true
    if (!hasItems.value) throw new Error("Your cart is empty")
    if (belowMin.value) throw new Error(`Minimum order total is €${MIN_TOTAL_EUR.toFixed(2)}`)

    // validate required Item name
    const missingExtras = cart.value.filter(l => needsExtra(l) && !(extraInfo[l.itemId] || "").trim())
    if (missingExtras.length) {
      const names = missingExtras.map((l) => l.name).join(", ")
      throw new Error(`Please provide Item name for: ${names}`)
    }

    await loadSdkIfNeeded()
    pp.show = true
    await nextTick()
    await renderButtons()
  } catch (e) {
    pp.error = String(e?.message || e)
    pp.show = false
  } finally {
    pp.loading = false
  }
}

function cancelPayPal() {
  pp.show = false
  pp.error = "Payment cancelled. Please try again."
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity .15s ease
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  backdrop-filter: blur(2px);
  background: rgba(0, 0, 0, .4);
  display: grid;
  place-items: center;
  z-index: 1050
}

.modal-card {
  background: #1b2838;
  color: #c6d4df;
  border-radius: 14px;
  padding: 1.25rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, .35);
  position: relative;
  max-height: 500px;
  display: flex;
  flex-direction: column
}

.modal-close {
  position: absolute;
  top: .5rem;
  right: .6rem;
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer
}

.modal-close:hover {
  color: #e5e7eb
}

.cart-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-bottom: .25rem
}

.cart-row {
  display: grid;
  grid-template-columns: 1fr 120px 160px auto;
  gap: 14px;
  align-items: center;
  padding: .5rem 1rem .5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, .06)
}

.cart-row:last-child {
  border-bottom: none
}

.col-info {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
  align-items: start
}

.thumb {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
  background: rgba(255, 255, 255, .05);
  padding: 6px
}

.meta {
  min-width: 0
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap
}

.name {
  font-weight: 600;
  line-height: 1.2
}

.bundle-badge {
  background: rgba(0, 200, 120, .15);
  color: #9ae6b4;
  border: 1px solid rgba(0, 200, 120, .35);
  font-size: .75rem;
  padding: 0 .35rem;
  border-radius: .5rem;
}

.extras {
  margin-top: 6px;
  display: grid;
  grid-template-columns: auto minmax(160px, 1fr);
  gap: 8px;
  align-items: center;
  max-width: 420px
}

.extras-input {
  min-width: 0
}

.col-price {
  text-align: right;
  font-size: .9rem
}

.col-price .each {
  opacity: .9
}

.col-price .line-total {
  font-weight: 600
}

.quantity-input {
  width: 160px
}

.quantity-input input {
  border: 3px solid #000
}

.col-del {
  display: flex;
  justify-content: flex-end
}

.hl-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  font-size: .9rem;
  opacity: .95
}

.hl-toggle .form-check-input {
  width: 1rem;
  height: 1rem
}

.bp-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  font-size: .9rem;
  opacity: .95;
}

.bp-toggle .form-check-input {
  width: 1rem;
  height: 1rem
}

.alert {
  padding: .5rem .75rem;
  border-radius: 8px;
  margin-right: .75rem
}

.alert-success {
  background: rgba(16, 185, 129, .15);
  color: #10b981
}

.alert-danger {
  background: rgba(239, 68, 68, .15);
  color: #ef4444
}

.pp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  display: grid;
  place-items: center;
  z-index: 2000
}

.pp-card {
  width: min(440px, 92vw);
  background: #fff;
  color: #111;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, .35)
}

@media (max-width: 680px) {
  .cart-row {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "info info"
      "price qty"
      ". del";
  }

  .col-info {
    grid-area: info
  }

  .col-price {
    grid-area: price;
    text-align: left
  }

  .col-qty {
    grid-area: qty
  }

  .col-del {
    grid-area: del;
    justify-content: flex-start;
    margin-top: 6px
  }
}
</style>

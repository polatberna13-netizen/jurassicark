<template>
  <div class="bundle-card">
    <div class="bundle-header">
      <h2 class="title m-0">Boss Fight Kit</h2>
      <p class="subtitle m-0">Includes {{ safeItems.length }} items</p>
    </div>

    <!-- One-row gallery: image with name/type/qty/price underneath -->
    <div class="bundle-grid">
      <div v-for="it in safeItems" :key="it.itemId" class="bundle-item">
        <img :src="it.image" :alt="it.name" />
        <div class="bundle-info">
          <span class="name">
            <template v-if="it.itemId === 'MedicalBrew'">
              25 × {{ it.name }}
            </template>
            <template v-else>
              {{ it.name }}
            </template>
          </span>
          <span class="type">{{ it.type }}</span>
          <span v-if="it.qty && it.qty > 1" class="qty">×{{ it.qty }}</span>
          <span class="price">{{ displayPrice(it.price) }}€</span>
        </div>
      </div>
    </div>

    <div class="bundle-footer">
      <div class="totals">
        <span class="total-label">Total</span>
        <span class="total-orig">{{ originalTotal }}€</span>
        <strong class="total-disc">{{ discountedTotal }}€</strong>
        <span class="badge small">−{{ (DISCOUNT_RATE * 100).toFixed(0) }}%</span>
      </div>

      <button class="button add-btn" @click="addBundle">
        <i class="bi bi-basket2-fill"></i> Add bundle to cart
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCart } from '../stores/useCart'
import { useToast } from '../composables/useToast'

const props = defineProps({
  items: { type: Array, default: () => [] }
})

const { add } = useCart()
const { success } = useToast()

const DISCOUNT_RATE = 0.20
const PRICE_PRECISION = 2

const toNumber = (v) => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}
const round2 = (n) => Math.round(n * 100) / 100
const formatMoney = (n) => round2(n).toFixed(PRICE_PRECISION)
const displayPrice = (v) => formatMoney(toNumber(v))

const safeItems = computed(() =>
  (props.items || []).map(i => ({ ...i, qty: Math.max(1, Number(i.qty ?? 1)) }))
)

const originalTotal = computed(() => {
  const sum = safeItems.value.reduce((acc, it) => acc + toNumber(it.price) * it.qty, 0)
  return formatMoney(sum)
})

const discountedTotal = computed(() => {
  const sum = safeItems.value.reduce((acc, it) => acc + toNumber(it.price) * it.qty, 0)
  const discounted = sum * (1 - DISCOUNT_RATE)
  return formatMoney(discounted)
})

const addBundle = () => {
  if (!safeItems.value.length) return

  const originalSum = Number(originalTotal.value)

  add({
    itemId: 'boss-fight-kit',
    name: 'Boss Fight Kit',
    type: 'Bundle',
    image: safeItems.value[0]?.image || '',
    price: originalSum, 
    bundle: {
      discountRate: DISCOUNT_RATE,
      items: safeItems.value.map(i => ({
        itemId: i.itemId,
        name: i.name,
        qty: i.qty,                  
        price: toNumber(i.price)
      }))
    }
  }, 1)

  success('Added Boss Fight Kit to cart')
}
</script>

<style scoped>
.bundle-card {
  border-radius: 12px;
  padding: 1rem;
  margin: 1.25rem 0 2rem;
  color: #c7d5e0;
  background: linear-gradient(135deg, rgba(27, 40, 56, 0.7) 0%, rgba(38, 56, 76, 0.7) 100%);
  box-shadow: 0 4px 18px rgba(0,0,0,0.25);
}

.bundle-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: .5rem;
  margin-bottom: 1rem;
}
.subtitle { opacity: .75; font-size: .95rem; }

.bundle-grid {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.bundle-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 120px;
}
.bundle-item img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-bottom: .5rem;
}
.bundle-info .name { font-weight: 600; display: block; }
.bundle-info .type { font-size: .85rem; opacity: .7; display: block; }
.bundle-info .qty  { font-size: .85rem; opacity: .85; display: block; }
.bundle-info .price { display: block; font-variant-numeric: tabular-nums; }

.bundle-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.totals {
  display: inline-flex;
  align-items: baseline;
  gap: .5rem;
}
.total-label { opacity: .8; }
.total-orig { text-decoration: line-through; opacity: .65; }
.total-disc { font-weight: 800; }
.badge.small {
  display: inline-block;
  padding: 0 .35rem;
  border-radius: .5rem;
  font-size: .7rem;
  background: rgba(0, 200, 120, .15);
  color: #9ae6b4;
  border: 1px solid rgba(0, 200, 120, .35);
}
.add-btn { white-space: nowrap; }
</style>

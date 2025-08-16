<template>
  <div class="card">
    <img :src="item.image" :alt="item.name" class="item-image" />
    <h2 class="item-name title text-start">{{ item.name }}</h2>

    <p class="item-description text-start">{{ item.description }}</p>

    <div class="item-details">
      <p><strong>Item ID:</strong> {{ item.itemId }}</p>
      <p><strong>Price:</strong> {{ displayPrice }}€</p>
      <p><strong>Type:</strong> <span class="type-tag">{{ item.type }}</span></p>
    </div>

    <div>
      <div class="input-group quantity-input">
        <button type="button" class="button" @click="dec">−</button>
        <input v-model.number="qty" type="number" min="1" step="1" class="form-control text-center" required />
        <button type="button" class="button" @click="inc">+</button>
      </div>

      <button class="button card-button" @click="addToCart">
        <i class="bi bi-cart-plus"></i> Add to cart
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from '../composables/useToast'

const props = defineProps({ item: Object })
const emit = defineEmits(['add-to-cart'])
const { success } = useToast()

const qty = ref(1)
const priceNum = computed(() => Number(props.item?.price ?? 0))
const displayPrice = computed(() => (Number.isFinite(priceNum.value) ? priceNum.value : 0))

const inc = () => { qty.value += 1 }
const dec = () => { if (qty.value > 1) qty.value -= 1 }

const addToCart = () => {
  if (qty.value < 1) return
  emit('add-to-cart', { item: props.item, qty: qty.value })
  success(`Added ${qty.value} × ${props.item.name} to cart`)
  qty.value = 1
}
</script>

<style scoped>
.card {
  max-width: 400px;
  height: 100%;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  background: linear-gradient(135deg, rgba(97, 100, 101, 0.3) 0%, rgba(226, 244, 255, 0.3) 100%);
  color: #8f98a0;
  position: relative;
}

.card-button {
  position: absolute;
  bottom: -20px;
  right: 1rem;
}

.item-image {
  width: 100px;
  height: 100px;
  margin: 0 auto 1rem;
  display: block;
}

.item-name {
  margin-bottom: 0.5rem;
}

.item-description {
  margin-bottom: 1rem;
}

.item-details {
  text-align: left;
  display: inline-block;
  margin-top: 0.5rem;
}

.item-details p {
  margin: 0.25rem 0;
}

.type-tag {
  background-color: #000;
  color: white;
  padding: 2px 6px;
}

.quantity-input {
  position: absolute;
  bottom: -20px;
  left: 1rem;
}

.quantity-input.input-group {
  width: fit-content;
}

.quantity-input input {
  width: 80px;
  border: 3px solid #000;
}
</style>

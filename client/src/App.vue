<template>
  <div>
    <Header></Header>
    <div class="container pb-5">
      <div class="d-flex justify-content-between sub-header">
        <div></div>
        <div class="d-flex justify-content-center align-items-center gap-3">
          <button class="tag" @click="scrollToSection('engrams-section')">View Engrams</button>
          <button class="tag" @click="scrollToSection('items-section')">View Items</button>
          <button class="tag" @click="scrollToSection('dinos-section')">View Dinosaurs</button>
        </div>
        <button class="cart position-relative" @click="openCart = true">
          <i class="bi bi-cart-fill"></i>
          <span v-if="count > 0" class="position-absolute badge rounded-pill bg-danger">
            {{ count }}
          </span>
        </button>
      </div>

      <section class="mb-4">
        <BundleCard title="Starter Kit" :items="starterKitDinos" />
      </section>

      <section class="mb-4">
        <BundleCardBoss :items="bossFightKitItems" />
      </section>

      <section class="mb-4">
        <BundleCardTribute :items="tributeArtifactItems" />
      </section>

      <section id="engrams-section" class="mb-5">
        <NavBar title="Engrams" :categories="engramCategories" :activeCategory="selectedEngramCategory"
          searchPlaceholder="Search engrams" @categorySelected="filterEngramsByCategory" @search="searchEngrams"
          @showAll="resetEngramsFilters" />
        <div class="row g-4">
          <div v-if="filteredEngrams.length > 0" class="col-lg-4 col-md-6 mb-4" v-for="engram in filteredEngrams"
            :key="engram.id">
            <ItemCard :item="formatEngram(engram)" @add-to-cart="onAddToCart" />
          </div>
          <div v-else>No engram found!</div>
        </div>
      </section>

      <section id="items-section" class="mb-5">
        <NavBar title="Items" :categories="itemCategories" :activeCategory="selectedItemCategory"
          searchPlaceholder="Search items" @categorySelected="filterItemsByCategory" @search="searchItems"
          @showAll="resetItemsFilters" />
        <div class="row g-4">
          <div v-if="filteredItems.length > 0" class="col-lg-4 col-md-6 mb-4" v-for="item in filteredItems"
            :key="item.className">
            <ItemCard :item="formatItem(item)" @add-to-cart="onAddToCart" />
          </div>
          <div v-else>No item found!</div>
        </div>
      </section>

      <section id="dinos-section" class="mb-5">
        <NavBar title="Dinosaurs" :categories="dinoCategories" :activeCategory="selectedDinoCategory"
          searchPlaceholder="Search dinosaurs" @categorySelected="filterDinosByCategory" @search="searchDinos"
          @showAll="resetDinosFilters" />
        <div class="row g-4">
          <div v-if="filteredDinos.length > 0" class="col-lg-4 col-md-6 mb-4" v-for="dino in filteredDinos"
            :key="dino.id">
            <ItemCard :item="formatDino(dino)" @add-to-cart="onAddToCart" />
          </div>
          <div v-else>No dinosaurs found!</div>
        </div>
      </section>

      <button v-show="showScrollTop" class="button position-fixed bottom-0 end-0 m-4 rounded-circle rounded"
        @click="scrollToTop">
        <i class="bi bi-arrow-up"></i>
      </button>
    </div>

    <PurchaseModal v-model:open="openCart" />
    <Toaster />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Header from './components/Header.vue'
import ItemCard from './components/ItemCard.vue'
import NavBar from './components/NavBar.vue'
import PurchaseModal from './components/PurchaseModal.vue'
import Toaster from './components/Toaster.vue'
import itemsData from './data/items.json'
import dinosData from './data/dinos.json'
import engramsData from './data/engrams.json'
import { useCart } from './stores/useCart'
import BundleCard from './components/BundleCard.vue'
import BundleCardBoss from './components/BundleCardBoss.vue'
import BundleCardTribute from './components/BundleCardTribute.vue'

const { add, count } = useCart()

const items = ref([])
const engrams = ref([])
const dinos = ref([])
const showScrollTop = ref(false)
const openCart = ref(false)

const engramCategories = ['Armor', 'Structure', 'Saddle', 'Tool', 'Weapon']
const itemCategories = ['Ammo', 'Armor', 'Artifact', 'Cosmetic', 'Consumable', 'Resource', 'Structure', 'Saddle', 'Tool', 'Vehicle', 'Weapon']
const dinoCategories = ['Aquatic', 'Fantasy Creature', 'Flyer', 'Herbivore', 'Insect', 'Land Predator', 'Mammal Predator', 'Wyvern']

const selectedEngramCategory = ref(null)
const selectedItemCategory = ref(null)
const selectedDinoCategory = ref(null)
const searchEngramQuery = ref('')
const searchItemQuery = ref('')
const searchDinoQuery = ref('')

onMounted(() => {
  items.value = itemsData
  engrams.value = engramsData
  dinos.value = dinosData
  window.addEventListener('scroll', () => {
    showScrollTop.value = window.scrollY > 300
  })
})

const filteredEngrams = computed(() => {
  return engrams.value
    .filter(engram =>
      (!selectedEngramCategory.value || engram.type === selectedEngramCategory.value) &&
      engram.name.toLowerCase().includes(searchEngramQuery.value.toLowerCase())
    )
    .sort((a, b) => a.type.localeCompare(b.type))
})

const filteredItems = computed(() => {
  return items.value
    .filter(item =>
      (!selectedItemCategory.value || item.type === selectedItemCategory.value) &&
      item.name.toLowerCase().includes(searchItemQuery.value.toLowerCase())
    )
    .sort((a, b) => a.type.localeCompare(b.type))
})

const filteredDinos = computed(() => {
  return dinos.value
    .filter(dino =>
      (!selectedDinoCategory.value || dino.type === selectedDinoCategory.value) &&
      dino.name.toLowerCase().includes(searchDinoQuery.value.toLowerCase())
    )
    .sort((a, b) => a.type.localeCompare(b.type))
})

const filterEngramsByCategory = (category) => { selectedEngramCategory.value = category }
const filterItemsByCategory = (category) => { selectedItemCategory.value = category }
const filterDinosByCategory = (category) => { selectedDinoCategory.value = category }

const searchEngrams = (query) => { searchEngramQuery.value = query }
const searchItems = (query) => { searchItemQuery.value = query }
const searchDinos = (query) => { searchDinoQuery.value = query }

const resetEngramsFilters = () => { selectedEngramCategory.value = null; searchEngramQuery.value = '' }
const resetItemsFilters = () => { selectedItemCategory.value = null; searchItemQuery.value = '' }
const resetDinosFilters = () => { selectedDinoCategory.value = null; searchDinoQuery.value = '' }

const scrollToSection = (id) => {
  const section = document.getElementById(id)
  if (section) section.scrollIntoView({ behavior: 'smooth' })
}
const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }) }

const formatEngram = (engram) => ({
  image: engram.image,
  name: engram.name,
  description: engram.description,
  itemId: engram.id,
  type: engram.type,
  price: engram.price ?? null
})

const formatItem = (item) => ({
  image: item.image,
  name: item.name,
  description: item.description,
  itemId: item.id,
  className: item.className,
  type: item.type,
  price: item.price ?? null
})
const formatDino = (dino) => ({
  image: dino.image,
  name: dino.name,
  description: dino.description,
  itemId: dino.id,
  className: dino.className,
  type: dino.type,
  price: dino.price ?? null
})

const starterKitDinos = computed(() => {
  const wanted = new Set(['Raptor', 'Argentavis', 'Triceratops'])
  return dinos.value.filter(d => wanted.has(d.name)).map(formatDino)
})

const bossFightKitItems = computed(() => {
  const wanted = new Set([
    'Pump-Action Shotgun',
    'Riot Boots',
    'Riot Chestpiece',
    'Riot Gauntlets',
    'Riot Helmet',
    'Riot Leggings',
    'Medical Brew',
    'Simple Shotgun Ammo'
  ])
  return items.value
    .filter(i => wanted.has(i.name))
    .map(i => {
      const f = formatItem(i)
      if (f.name === 'Simple Shotgun Ammo') return { ...f, qty: 100 }
      return f
    })
})

const tributeArtifactItems = computed(() =>
  items.value
    .filter(i => i.type === 'Artifact')
    .map(formatItem)
)

const onAddToCart = ({ item, qty }) => {
  add(item, qty)
}
</script>

<style scoped>
.sub-header {
  position: sticky;
  top: 92px;
  background: #1b2838;
  z-index: 100;
  padding: 1rem;
  height: 100px;
}

.rounded {
  padding: 0;
  height: 50px;
  width: 50px;
}

button.cart {
  font-size: 28px;
  background: transparent;
  color: #c7d5e0;
  border: none;
  padding: 0;
}

.cart .badge {
  font-size: 11px;
  width: 16px;
  height: 16px;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  top: 13px;
  right: -10px;
}
</style>

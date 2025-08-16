<template>
  <div class="nav">
    <span
      class="nav-title cursor-pointer"
      :class="{ active: !activeCategory }"
      @click="onTitleClick"
      role="button"
      tabindex="0"
      @keydown.enter="onTitleClick"
      @keydown.space.prevent="onTitleClick"
      aria-label="Show all"
      :title="`Show all ${title.toLowerCase()}`"
    >
      {{ title }}
    </span>

    <div>
      <span
        v-for="(cat, idx) in categories"
        :key="idx"
        class="nav-title p-1"
        :class="{ active: activeCategory === cat }"
        @click="$emit('categorySelected', cat)"
        role="button"
        tabindex="0"
        @keydown.enter="$emit('categorySelected', cat)"
        @keydown.space.prevent="$emit('categorySelected', cat)"
      >
        {{ cat }}
      </span>
    </div>

    <div class="search-container">
      <input
        type="text"
        :placeholder="searchPlaceholder"
        v-model="searchQuery"
        @input="$emit('search', searchQuery)"
      />
      <button type="submit" @click="$emit('search', searchQuery)" aria-label="Search">
        <i class="bi bi-search"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  title: String,
  categories: Array,
  searchPlaceholder: {
    type: String,
    default: 'Search...'
  },
  activeCategory: String
})

const emit = defineEmits(['categorySelected', 'search', 'showAll'])
const searchQuery = ref('')

const onTitleClick = () => {
  searchQuery.value = ''
  emit('showAll')
  emit('search', '')
}
</script>
<style scoped>
.nav {
  background: linear-gradient(
    90deg,
    rgba(62, 103, 150, 0.919) 11.38%,
    rgba(58, 120, 177, 0.8) 25.23%,
    rgb(15, 33, 110) 100%
  );
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.4);
  display: inline;
  height: 36px;
  display: flex;
  line-height: 34px;
  text-shadow: 0px 2px 3px rgba(0, 0, 0, 0.3);
  padding-right: 10px;
  padding-left: 10px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-title {
  line-height: 34px;
  font-weight: bold;
  cursor: pointer;
}

.nav-title.active {
  color: #e5e5e5;
}

.search-container {
  display: flex;
  align-items: center;
  position: relative;
}

.search-container input {
  background-color: #316282;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.3);
  box-shadow: 1px 1px 0px rgba(255, 255, 255, 0.2);
  font-style: italic;
  font-size: 13px;
  margin-bottom: 0px;
  outline: none;
  height: 30px;
  padding: 0px 6px;
}

.search-container input::placeholder {
  color: #0e1c25;
}

.search-container button {
  background-color: #66aad3;
  border: none;
  border-radius: 2px;
  position: absolute;
  right: 6px;
  height: 26px;
  width: 26px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.search-container {
  display: flex;
  align-items: center;
}
.search-container input {
  margin-right: 5px;
}
</style>
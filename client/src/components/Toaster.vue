<template>
    <div class="toaster position-fixed top-0 end-0 p-3" style="z-index:9999; pointer-events:none;">
        <TransitionGroup name="toast" tag="div">
            <div v-for="t in toasts" :key="t.id" class="mb-2" style="pointer-events:auto;">
                <div :class="['rounded-3 shadow d-flex align-items-center gap-2 px-3 py-2', variant(t.type)]">
                    <i v-if="t.type === 'success'" class="bi bi-check-circle"></i>
                    <i v-else-if="t.type === 'danger'" class="bi bi-x-circle"></i>
                    <i v-else class="bi bi-info-circle"></i>
                    <span class="small">{{ t.message }}</span>
                    <button class="btn btn-sm btn-link text-white ms-auto p-0" @click="remove(t.id)" aria-label="Close">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
        </TransitionGroup>
    </div>
</template>

<script setup>
import { useToast } from '../composables/useToast' 
const { toasts, remove } = useToast()

const variant = (type) => {
    switch (type) {
        case 'success': return 'bg-success text-white'
        case 'danger': return 'bg-danger text-white'
        case 'info': return 'bg-primary text-white'
        default: return 'bg-dark text-white'
    }
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
    transition: all .2s ease;
}

.toast-enter-from {
    opacity: 0;
    transform: translateY(-6px);
}

.toast-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}
</style>

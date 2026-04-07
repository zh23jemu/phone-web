<template>
    <div class="my-service bg-white mx-[20rpx] mt-[20rpx] rounded-lg p-[30rpx]">
        <div
            v-if="content.title"
            class="title font-medium text-lg"
        >
            <div>{{ content.title }}</div>
        </div>
        <div v-if="content.style == 1" class="grid grid-cols-4 gap-x-9 gap-y-7">
            <div
                v-for="(item, index) in showList"
                :key="index"
                class="flex flex-col items-center pt-[40rpx]"
                @click="handleClick(item.link)"
            >
                <u-image width="52" height="52" :src="getImageUrl(item.image)" alt="" />
                <div class="mt-[22rpx] text-sm">{{ item.name }}</div>
            </div>
        </div>
        <div v-if="content.style == 2">
            <div
                v-for="(item, index) in showList"
                :key="index"
                class="flex items-center border-light border-solid border-0 border-b h-[100rpx] px-[24rpx]"
                @click="handleClick(item.link)"
            >
                <u-image width="48" height="48" :src="getImageUrl(item.image)" alt="" />
                <div class="ml-[20rpx] flex-1 text-sm">{{ item.name }}</div>
                <div class="text-muted">
                    <u-icon name="arrow-right" />
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { useAppStore } from '@/stores/app'
import { navigateTo } from '@/utils/util'
import { computed } from 'vue'

const props = defineProps({
    content: {
        type: Object,
        default: () => ({})
    },
    styles: {
        type: Object,
        default: () => ({})
    }
})
const { getImageUrl } = useAppStore()
const handleClick = (link: any) => {
    console.log('Clicked link:', link)
    if (typeof link === 'string') {
        console.log('Using string link navigation')
        uni.navigateTo({
            url: link,
            fail: (err) => {
                console.error('Navigation failed:', err)
            }
        })
    } else if (link && typeof link === 'object') {
        console.log('Using object link navigation')
        // 检查对象中的 path 属性
        const path = link.path || ''
        console.log('Object path:', path)
        console.log('Object type:', link.type)

        // 如果是商店类型，直接使用 uni.navigateTo
        if (link.type === 'shop') {
            console.log('Using uni.navigateTo for shop type')
            const url = path || '/pages/shop/shop'
            if (!url) {
                console.error('Invalid shop URL')
                return
            }
            uni.navigateTo({
                url,
                fail: (err) => {
                    console.error('Navigation failed:', err)
                    // 如果导航失败，尝试使用默认路径
                    if (url !== '/pages/shop/shop') {
                        uni.navigateTo({
                            url: '/pages/shop/shop',
                            fail: (err2) => {
                                console.error('Default shop navigation failed:', err2)
                            }
                        })
                    }
                }
            })
            return
        }

        // 使用 navigateTo 进行导航
        console.log('Using navigateTo for regular page')
        navigateTo(link)
    } else {
        console.error('Invalid link format:', link)
    }
}

const showList = computed(() => {
    const defaultList = [
        {
            name: '呼叫记录',
            image: '/static/images/user/default_avatar.png',
            link: '/pages/call_records/call_records',
            is_show: '1'
        },
        {
            name: '号码库',
            image: '/static/images/user/default_avatar.png',
            link: '/pages/phone_database/phone_database',
            is_show: '1'
        }
    ];
    return [...defaultList, ...(props.content.data?.filter((item: any) => item.is_show == '1') || [])];
})
</script>

<style lang="scss"></style>

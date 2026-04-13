<template>
    <view class="miui-batch-page">
        <!-- 顶部导航栏 -->
        <view class="miui-batch-header">
            <text class="miui-batch-close" @click="closePage">×</text>
            <view class="miui-batch-title-section">
                <view class="miui-batch-title">
                    {{ selectedCount > 0 ? '已选择 ' + selectedCount + ' 个' : '未选择' }}
                </view>
            </view>
        </view>
        <!-- 列表区域 -->
        <scroll-view class="miui-batch-list" scroll-y="true" @scrolltolower="loadMoreItems">
            <view class="miui-batch-item" v-for="item in items" :key="item.id" @click="toggleSelectItem(item)">
                <!-- 左侧区域：包含两行信息 -->
                <view class="miui-batch-item-left">
                    <!-- 第一行：状态图标 + 号码 -->
                    <view class="miui-batch-line-top">
                        <image class="miui-batch-call-status-icon" :src="getStatusIcon(item.status)" />
                        <view class="miui-batch-number">{{ item.number }}</view>
                    </view>
                    <!-- 第二行：占位图标 + HD图标 + 归属地 -->
                    <view class="miui-batch-line-bottom">
                        <image class="miui-batch-placeholder-icon" src="/static/icons/default.png" />
                        <image class="miui-batch-hd-icon" src="/static/icons/hd.png" />
                        <text class="miui-batch-location-text">{{ item.location }}</text>
                    </view>
                </view>
                <!-- 右侧：时间+勾选框 -->
                <view class="miui-batch-item-right">
                    <text class="miui-batch-time">{{ item.time }}</text>
                    <checkbox :checked="selectedItems.some(selectedItem => selectedItem.id === item.id)" @tap.stop="toggleSelectItem(item)" color="#1976ff" />
                </view>
            </view>
            <!-- 加载更多提示 -->
            <view v-if="isLoading" class="miui-batch-loading">加载中...</view>
            <view v-if="!hasMore && items.length > 0" class="miui-batch-nomore">没有更多记录了</view>
        </scroll-view>
        <!-- 底部操作栏 -->
        <view class="miui-batch-footer">
            <view class="miui-batch-footer-content">
                <view class="miui-batch-footer-btn delete" :class="{ 'disabled': selectedCount === 0 }" @click="deleteSelectedItems">
                    <image class="miui-batch-footer-icon" src="/static/icons/delete.png" />
                    <text>删除</text>
                </view>
                <view class="miui-batch-footer-btn" @click="toggleSelectAll">
                    <image class="miui-batch-footer-icon" :src="isAllSelected ? '/static/icons/selected.png' : '/static/icons/all_select.png'" />
                    <text>{{ selectAllButtonText }}</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            items: [],
            selectedItems: [],
            userId: uni.getStorageSync('userId') || 6,
            isLoading: false,
            currentPage: 1,
            hasMore: true,
            pageSize: 50  // 每页加载50条数据
        };
    },
    computed: {
        selectedCount() {
            return this.selectedItems.length;
        },
        isAllSelected() {
            return this.items.length > 0 && this.selectedItems.length === this.items.length;
        },
        selectAllButtonText() {
            return this.isAllSelected ? '取消全选' : '全选';
        }
    },
    methods: {
        async loadItems(isLoadMore = false) {
            if (this.isLoading || (!isLoadMore && !this.hasMore)) return;
            
            this.isLoading = true;
            try {
                const response = await uni.request({
                    url: 'http://127.0.0.1:9097/api/call-records',
                    method: 'GET',
                    data: {
                        userId: this.userId,
                        page: isLoadMore ? this.currentPage + 1 : 1,
                        pageSize: this.pageSize
                    }
                });

                console.log('Call records response:', response.data);

                if (response.data.code === 0) {
                    const newRecords = response.data.data.list.map(record => {
                        console.log('Processing record:', {
                            call_id: record.call_id,
                            type: typeof record.call_id
                        });
                        return {
                            id: record.call_id,  // 保持原始格式，不转换为字符串
                            number: record.contact_name || record.dialed_number,
                            status: this.mapCallStatus(record.status),
                            location: record.contact_name ? record.dialed_number : (record.location || '未知'),
                            time: this.formatTime(record.start_time)
                        };
                    });

                    if (isLoadMore) {
                        this.items = [...this.items, ...newRecords];
                        this.currentPage++;
                    } else {
                        this.items = newRecords;
                        this.currentPage = 1;
                    }

                    this.hasMore = newRecords.length === this.pageSize;
                } else {
                    uni.showToast({
                        title: '获取通话记录失败',
                        icon: 'none'
                    });
                }
            } catch (error) {
                console.error('获取通话记录失败:', error);
                uni.showToast({
                    title: '获取通话记录失败',
                    icon: 'none'
                });
            } finally {
                this.isLoading = false;
            }
        },

        loadMoreItems() {
            if (!this.isLoading && this.hasMore) {
                this.loadItems(true);
            }
        },

        formatTime(timestamp) {
            const now = Math.floor(Date.now() / 1000);
            const diff = now - timestamp;
            
            if (diff < 60) return '刚刚';
            if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
            if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
            
            const date = new Date(timestamp * 1000);
            return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        },

        mapCallStatus(status) {
            const statusMap = {
                'ringing': 'incoming',
                'connected': 'outgoing',
                'completed': 'off',
                'failed': 'failed',
                'no_answer': 'missed',
                'canceled': 'canceled',
                'disconnected': 'disconnected'
            };
            return statusMap[status] || 'off';
        },

        getStatusIcon(status) {
            switch (status) {
                case 'outgoing': return '/static/icons/phone-outgoing.png';
                case 'incoming': return '/static/icons/phone-incoming.png';
                case 'missed': return '/static/icons/phone-missed.png';
                default: return '/static/icons/phone-outgoing.png';
            }
        },

        toggleSelectItem(item) {
            const index = this.selectedItems.findIndex(i => i.id === item.id);
            if (index > -1) {
                this.selectedItems.splice(index, 1);
            } else {
                this.selectedItems.push(item);
            }
        },

        toggleSelectAll() {
            if (this.isAllSelected) {
                this.selectedItems = [];
            } else {
                this.selectedItems = [...this.items];
            }
        },

        async deleteSelectedItems() {
            if (this.selectedItems.length === 0) {
                uni.showToast({
                    title: '请选择要删除的记录',
                    icon: 'none'
                });
                return;
            }

            try {
                uni.showLoading({
                    title: '删除中...',
                    mask: true
                });

                // 准备要删除的记录ID
                const callIds = this.selectedItems.map(item => {
                    console.log('Preparing to delete record:', {
                        id: item.id,
                        type: typeof item.id,
                        number: item.number
                    });
                    return item.id;
                });

                console.log('Sending delete request with IDs:', callIds);

                const response = await uni.request({
                    url: 'http://127.0.0.1:9097/api/delete-call-record',
                    method: 'POST',
                    data: {
                        callId: callIds
                    }
                });

                console.log('Delete response:', {
                    statusCode: response.statusCode,
                    data: response.data,
                    headers: response.header
                });

                if (response.data.code === 0) {
                    uni.showToast({
                        title: '删除成功',
                        icon: 'success'
                    });
                    // 从列表中移除已删除的记录
                    this.items = this.items.filter(item => !this.selectedItems.includes(item));
                    this.selectedItems = [];
                    // 如果列表为空，尝试加载更多
                    if (this.items.length === 0) {
                        this.loadItems();
                    }
                } else {
                    throw new Error(response.data.msg || '删除失败');
                }
            } catch (error) {
                console.error('删除记录失败:', error);
                uni.showToast({
                    title: error.message || '删除失败',
                    icon: 'none',
                    duration: 2000
                });
            } finally {
                uni.hideLoading();
            }
        },

        closePage() {
            uni.navigateBack();
        }
    },
    onLoad() {
        this.loadItems();
    }
};
</script>

<style scoped>
.miui-batch-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #fff;
}
.miui-batch-header {
    position: fixed;
    top: 0rpx;
    left: 0;
    right: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    height: 185rpx;
    border-bottom: 2rpx solid #ccc;
    padding: 0 24rpx;
    background: #fff;
}
.miui-batch-close {
    font-size: 100rpx;
    color: #666;
    width: 80rpx;
    text-align: left;
    font-weight: 400;
    margin-top: 65rpx;
}
.miui-batch-title-section {
    flex: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
}
.miui-batch-title {
    font-size: 40rpx;
    font-weight: bold;
    color: #222;
    letter-spacing: 4rpx;
    margin-top: 65rpx;
}
.miui-batch-list {
    flex: 1;
    background: #fff;
    padding-bottom: 0rpx;
    padding-top: 0rpx;
    position: absolute;
    top: 185rpx;
    bottom: 110rpx;
    left: 0;
    right: 0;
    height: auto; /* Allow absolute positioning to control height */
    overflow-y: auto;
}
.miui-batch-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx 24rpx 32rpx 24rpx;
    border-bottom: 2rpx solid #ccc;
}
.miui-batch-item-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex: 1;
}
.miui-batch-line-top,
.miui-batch-line-bottom {
    display: flex;
    align-items: center;
}
.miui-batch-line-top {
    margin-bottom: 4rpx;
}
.miui-batch-call-status-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 38rpx;
}
.miui-batch-info {
    display: flex;
    flex-direction: column;
}
.miui-batch-number {
    font-size: 34rpx;
    color: #222;
    font-weight: 500;
}
.miui-batch-location-text {
    font-size: 24rpx;
    color: #999;
}
.miui-batch-placeholder-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 38rpx;
    opacity: 0;
}
.miui-batch-hd-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 8rpx;
}
.miui-batch-item-right {
    display: flex;
    align-items: center;
    min-width: 160rpx;
    justify-content: flex-end;
}
.miui-batch-time {
    font-size: 28rpx;
    color: #999;
    margin-right: 20rpx;
}
.miui-batch-loading,
.miui-batch-nomore {
    text-align: center;
    color: #999;
    font-size: 26rpx;
    padding: 24rpx 0;
}
.miui-batch-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 110rpx;
    background: #fff;
    border-top: 1rpx solid #eee;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    z-index: 100;
}
.miui-batch-footer-content {
    display: flex;
    align-items: center;
    justify-content: space-around;
    width: 100%;
    max-width: 500rpx;
    padding: 0 48rpx;
}
.miui-batch-footer-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 24rpx;
    color: #666;
}
.miui-batch-footer-btn.delete {
    color: #ff3b30;
    margin-right: 160rpx;
}
.miui-batch-footer-btn.disabled {
    opacity: 0.5;
}
.miui-batch-footer-icon {
    width: 48rpx;
    height: 48rpx;
    margin-bottom: 4rpx;
}
</style> 

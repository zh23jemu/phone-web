<template>
  <view class="contacts-page">
    <!-- 顶部内容，复用拨号页样式 -->
    <view class="miui-fixed-header" @touchmove.stop.prevent>
      <view class="miui-header-top">
        <view class="miui-title">联系人</view>
      </view>
    </view>
    <!-- 中间内容 -->
    <view class="contacts-empty">
      <image src="/static/icons/lxr.png" class="contacts-empty-icon" />
      <view class="contacts-empty-text">您还没有任何联系人</view>
    </view>
    <view v-for="contact in contacts" :key="contact.id">
      <text>{{ contact.name }} - {{ contact.phone }}</text>
    </view>
  </view>
</template>

<script>
export default {
    data() {
        return {
            contacts: []
        };
    },
    onLoad() {
        this.fetchContacts();
    },
    methods: {
        async fetchContacts() {
            try {
                const response = await uni.request({
                    url: `http://106.53.30.150:9097/api/contacts`,
                    method: 'GET'
                });

                if (response.data.code === 0) {
                    this.contacts = response.data.data;
                } else {
                    // uni.showToast({
                    //     title: '获取联系人失败',
                    //     icon: 'none'
                    // });
                }
            } catch (error) {
                console.error('获取联系人失败:', error);
                // uni.showToast({
                //     title: '获取联系人失败',
                //     icon: 'none'
                // });
            }
        }
    }
};
</script>

<style scoped>
.contacts-page {
  min-height: 100vh;
  background: #fff;
}
.miui-fixed-header {
  position: relative;
  z-index: 2;
}
.miui-more-btn {
  position: absolute;
  top: 40rpx;
  right: 40rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 20;
  padding: 20rpx 0rpx 0;
}
.miui-dot {
  width: 8rpx;
  height: 8rpx;
  background: #888;
  border-radius: 50%;
  margin: 3rpx 0;
}
.miui-header-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 200rpx 30rpx 0;
}
.miui-title {
  font-size: 60rpx;
  font-weight: bold;
  color: #222;
  letter-spacing: 4rpx;
  margin-left: 40rpx;
  margin-bottom: 75rpx;
}
.miui-tabbar {
  display: flex;
  flex-direction: row;
  justify-content: center;
}
.miui-tab {
  font-size: 32rpx;
  color: #888;
  margin-right: 48rpx;
  padding-bottom: 8rpx;
  position: relative;
}
.miui-tab.active {
  color: #1976ff;
  font-weight: bold;
}
.miui-tab.active::after {
  content: '';
  display: block;
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 6rpx;
  background: #1976ff;
  border-radius: 3rpx;
}
.contacts-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 300rpx;
}
.contacts-empty-icon {
  width: 180rpx;
  height: 180rpx;
  margin-bottom: 32rpx;
  opacity: 0.8;
}
.contacts-empty-text {
  color: #888;
  font-size: 36rpx;
  text-align: center;
}
</style> 
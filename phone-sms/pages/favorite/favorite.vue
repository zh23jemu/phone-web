<template>
  <view class="contacts-page">
    <!-- 顶部内容，复用拨号页样式 -->
    <view class="miui-fixed-header" @touchmove.stop.prevent>
      <view class="miui-header-top">
        <view class="miui-title">收藏</view>
      </view>
    </view>
    <!-- 中间内容 -->
    <view class="contacts-empty">
      <image src="/static/icons/sc.png" class="contacts-empty-icon" />
      <view class="contacts-empty-text">没有收藏</view>
    </view>
  </view>
</template>

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
<template>
  <view class="new-message-container">
    <!-- 顶部栏 -->
    <view class="header">
      <image class="back-icon" src="/static/icons/back1.png" @click="goBack"></image>
      <view class="title">新建信息</view>
      <image class="contact-icon" src="/static/icon/people.png"></image>
    </view>

    <!-- 收件人输入框 -->
    <view class="recipient-area">
      <text class="recipient-label">收件人:</text>
      <input class="recipient-input" type="text" placeholder="" v-model="phone" />
      <image class="add-contact-icon" src="/static/icons/people.png"></image>
    </view>

    <!-- 消息内容输入区 (底部) -->
    <!-- 底部输入栏 -->
    <view class="chat-footer">
      <!-- <view class="chat-plus">+</view> -->
	  <image class="chat-plus" src="/static/icons/add2.png"></image>
      <view class="chat-input-area">
        <input class="chat-input" placeholder="短信" v-model="message" />
      </view>
	  <image class="chat-send" src="/static/icons/send.png" @click="sendMessage"></image>
      <!-- <view class="chat-send">&#8593;</view> -->
    </view>

  </view>
</template>

<script>
export default {
  name: "NewMessagePage",
  data() {
    return {
      phone: '',
      message: '',
      userId: uni.getStorageSync('userId') || 6
    }
  },
  methods: {
    async sendMessage() {
      if (!this.phone.trim() || !this.message.trim()) {
        uni.showToast({
          title: '请输入手机号和消息内容',
          icon: 'none'
        })
        return
      }

      try {
        const response = await uni.request({
          url: 'http://127.0.0.1:9097/api/send-message',
          method: 'POST',
          data: {
            senderId: this.userId,
            receiverPhone: this.phone.trim(),
            content: this.message.trim()
          }
        })

        if (response.data.code === 0) {
          uni.showToast({
            title: '发送成功',
            icon: 'none'
          })
          // 返回上一页
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } else {
          uni.showToast({
            title: response.data.msg || '发送失败',
            icon: 'none'
          })
        }
      } catch (error) {
		console.log(error)
        console.error('Failed to send message:', error)
        uni.showToast({
          title: '发送失败',
          icon: 'none'
        })
      }
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.new-message-container {
  background-color: #f5f6f7; /* 页面背景色 */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 20rpx;
  background-color: #f5f6f7; /* 顶部栏背景色 */
  height: 120rpx; /* 顶部栏高度 */
  margin-top: 50rpx; /* 留出状态栏空间 */
}

.back-icon {
  width: 60rpx;
  height: 60rpx;
  margin-right: 20rpx;
}

.title {
  /* flex: 1; */
  text-align: left;
  font-size: 36rpx;
  font-weight: bold;
  margin-right: 300rpx;
}

.contact-icon {
  width: 50rpx;
  height: 50rpx;
  margin-left: 20rpx;
}

.recipient-area {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 30rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;
  border-radius: 40rpx;
  margin: -20rpx 24rpx 0 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
}

.recipient-label {
  font-size: 32rpx;
  color: #333;
  margin-right: 10rpx;
}

.recipient-input {
  flex: 1;
  font-size: 32rpx;
  color: #222;
}

.add-contact-icon {
  width: 40rpx;
  height: 40rpx;
  margin-left: 20rpx;
  /* border: 2rpx solid red; */ /* 移除红色边框 */
}

/* 底部输入栏样式 */
.chat-footer {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx 32rpx 20rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
  margin-top: auto; /* 将输入区域推到底部 */
}
.chat-plus {
  height: 50rpx;
  width: 50rpx;
  font-size: 48rpx;
  color: #4CD964;
  margin-right: 20rpx;
}
.chat-input-area {
  flex: 1;
  background: #f5f6f7;
  border-radius: 40rpx; /* 更大的圆角 */
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8rpx 24rpx;
  margin-right: 20rpx;
}
.chat-input {
  
  border: none;
  background: transparent;
  font-size: 36rpx;
  width: 100%;
  outline: none;
  padding: 0; /* 移除默认内边距 */
  line-height: 1.4; /* 调整行高 */
}
.chat-send {
  height: 60rpx;
  width: 60rpx;
  font-size: 48rpx;
  color: #4CD964; /* 发送按钮颜色 */
}
</style> 

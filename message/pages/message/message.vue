<template>
  <view class="container" @click="resetAllItems">
    <!-- 顶部栏 -->
    <view class="header">
      <view>
        <view class="title">信息</view>
      </view>
      <view class="header-right">
        <image class="add-btn" src="/static/icons/add1.png" @click="navigateToAddMessagePage"></image>
        <image class="more-btn" src="/static/icons/more.png" @click.stop="showMenu"></image>
      </view>
    </view>

    <!-- 消息列表 -->
    <view class="msg-list">
      <view v-for="(conversation, index) in conversations" 
            :key="index" 
            class="msg-item-wrapper" >
        <view class="msg-item"
              @click="navigateToChat(conversation)"
              @touchstart="touchStart"
              @touchmove="touchMove"
              @touchend="touchEnd"
              :style="{ transform: `translateX(${conversation.offsetX || 0}px)` }"
              :data-index="index">
          <image class="avatar" :src="conversation.avatar" mode="aspectFill"></image>
          <view class="msg-content">
            <view class="msg-phone">{{ conversation.display_name }}</view>
            <view class="msg-date">{{ formatDate(conversation.lastMessageTime) }}</view>
            <view class="msg-text">{{ conversation.lastMessage }}</view>
          </view>
        </view>
        <view class="msg-delete-btn" @click="deleteConversation(conversation.phone)">删除</view>
      </view>
    </view>

    <!-- 弹出菜单 -->
    <view class="menu-popup" v-if="isMenuVisible" @click="hideMenu">
      <view class="menu-content" @click.stop>
        <view class="menu-item" v-for="(item, index) in menuItems" :key="index" @click="handleMenuClick(item)">
          {{ item }}
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: "MessagePage",
  data() {
    return {
      isMenuVisible: false,
      menuItems: ['全部已读', '删除全部', '设置'],
      conversations: [],
      userId: uni.getStorageSync('userId') || 6,
      isLoading: false,
      startX: 0,
      currentX: 0,
    }
  },
  onLoad() {
    this.fetchConversations()
  },
  onShow() {
    // 每次页面显示时刷新会话列表
    this.fetchConversations()
  },
  methods: {
    async fetchConversations() {
      this.isLoading = true
      try {
        const response = await uni.request({
          url: 'http://106.53.30.150:9097/api/conversations',
          method: 'GET',
          data: {
            userId: this.userId
          }
        })

        if (response.data.code === 0) {
          console.log('Raw conversations data:', response.data.data);
          this.conversations = response.data.data.map(conv => {
            const displayName = conv.display_name || conv.phone;
            const avatar = this.getCarrierAvatar(displayName);
            console.log('Processing conversation:', {
              phone: conv.phone,
              displayName: displayName,
              avatar: avatar
            });
            return {
              phone: conv.phone,
              lastMessage: conv.last_message,
              lastMessageTime: conv.last_message_time * 1000,
              unreadCount: conv.unread_count,
              display_name: displayName,
              avatar: avatar,
              offsetX: 0
            };
          });
          console.log('Processed conversations:', this.conversations);
        } else {
          uni.showToast({
            title: response.data.msg || '获取会话列表失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
        uni.showToast({
          title: '获取会话列表失败',
          icon: 'none'
        })
      } finally {
        this.isLoading = false
      }
    },
    navigateToAddMessagePage() {
      uni.navigateTo({
        url: '/pages/message/new-message'
      })
    },
    navigateToChat(conversation) {
      if (conversation.offsetX === 0) {
          uni.navigateTo({
            url: `/pages/message/chat?phone=${conversation.phone}&displayName=${encodeURIComponent(conversation.display_name)}`
          })
      }
    },
    showMenu() {
      this.isMenuVisible = true
    },
    hideMenu() {
      this.isMenuVisible = false
    },
    async handleMenuClick(item) {
      if (item === '删除全部') {
        this.resetAllItems();

        const phones = this.conversations.map(conv => conv.phone)
        if (phones.length === 0) {
          uni.showToast({
            title: '没有可删除的会话',
            icon: 'none'
          })
          return
        }

        try {
          const response = await uni.request({
            url: 'http://106.53.30.150:9097/api/delete-conversations',
            method: 'POST',
            data: {
              userId: this.userId,
              phones: phones
            }
          })

          if (response.data.code === 0) {
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
            this.conversations = []
          } else {
            uni.showToast({
              title: response.data.msg || '删除失败',
              icon: 'none'
            })
          }
        } catch (error) {
          console.error('Failed to delete conversations:', error)
          uni.showToast({
            title: '删除失败',
            icon: 'none'
          })
        }
      }
      this.hideMenu()
    },
    formatDate(timestamp) {
      if (!timestamp) return ''
      const now = new Date()
      const messageDate = new Date(timestamp)
      
      // 如果是今天的消息，显示时间
      if (messageDate.toDateString() === now.toDateString()) {
        return `${messageDate.getHours().toString().padStart(2, '0')}:${messageDate.getMinutes().toString().padStart(2, '0')}`
      }
      
      // 如果是昨天的消息，显示"昨天"
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      if (messageDate.toDateString() === yesterday.toDateString()) {
        return '昨天'
      }
      
      // 其他情况显示月/日
      return `${(messageDate.getMonth() + 1).toString().padStart(2, '0')}/${messageDate.getDate().toString().padStart(2, '0')}`
    },

    touchStart(e) {
        this.startX = e.touches[0].clientX;
        this.resetAllItems();
    },

    touchMove(e) {
        const currentX = e.touches[0].clientX;
        const diff = currentX - this.startX;
        const index = e.currentTarget.dataset.index;

        if (diff < 0) {
            const deleteButtonWidth = uni.upx2px(150);
            this.conversations[index].offsetX = Math.max(diff, -deleteButtonWidth);
        } else {
            this.conversations[index].offsetX = 0;
        }
    },

    touchEnd(e) {
        const index = e.currentTarget.dataset.index;
        const deleteButtonWidth = uni.upx2px(150);

        if (this.conversations[index].offsetX < -deleteButtonWidth / 2) {
             this.conversations[index].offsetX = -deleteButtonWidth;
        } else {
            this.conversations[index].offsetX = 0;
        }
    },

    resetAllItems() {
        this.conversations.forEach(item => {
            item.offsetX = 0;
        });
    },

    async deleteConversation(phone) {
        try {
            console.log('Deleting conversation with phone:', phone);
            const response = await uni.request({
                url: 'http://106.53.30.150:9097/api/delete-conversation',
                method: 'POST',
                data: {
                    userId: this.userId,
                    phone: phone
                }
            });

            console.log('Delete conversation response:', response);

            if (response.data.code === 0) {
                uni.showToast({
                    title: '删除成功',
                    icon: 'none'
                });
                this.conversations = this.conversations.filter(conv => conv.phone !== phone);
            } else {
                 uni.showToast({
                    title: response.data.msg || '删除失败',
                    icon: 'none'
                });
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            uni.showToast({
                title: '删除失败',
                icon: 'none'
            });
        } finally {
            this.resetAllItems();
        }
    },
    // 添加判断运营商客服号码的方法
    getCarrierAvatar(phone) {
      console.log('getCarrierAvatar called with:', phone);
      // 判断是否为运营商客服号码
      switch(phone) {
        case '中国电信': // 电信客服
          console.log('Matched 中国电信');
          return '/static/icons/10000.png';
        case '中国联通': // 联通客服
          console.log('Matched 中国联通');
          return '/static/icons/10010.png';
        case '中国移动': // 移动客服
          console.log('Matched 中国移动');
          return '/static/icons/10086.png';
        default:
          console.log('No match, using default avatar');
          return '/static/icons/avatar1.png';
      }
    },
  }
}
</script>

<style scoped>
.container {
  background: #fff;
  min-height: 100vh;
  position: relative;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 32rpx 32rpx 0 32rpx;
  background: #fafafa;
}
.title {
  font-size: 47rpx;
  font-weight: bold;
  margin-top: 150rpx;
  margin-bottom: 45rpx;
  margin-left: 20rpx;
  letter-spacing: 16rpx;
  line-height: 1;
}
.header-right {
  display: flex;
  align-items: center;
  margin-top: 67rpx;
}
.add-btn {
  height: 50rpx;
  width: 50rpx;
  margin-right: 24rpx;
}
.more-btn {
	height: 40rpx;
	width: 40rpx;
}
.msg-list {
  margin-top: 40rpx;
}
.msg-item-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.msg-item {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 32rpx;
  transition: transform 0.3s ease;
  position: relative;
  z-index: 2;
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #fff;
  margin-right: 32rpx;
  flex-shrink: 0;
}
.msg-content {
  flex: 1;
  border-bottom: 2rpx solid #8f8f8f;
}
.msg-phone {
  font-size: 32rpx;
  font-family: monospace;
  margin-left: 20rpx;
  color: #222;
}
.msg-text {
  color: #aaa;
  margin-top: 8rpx;
  margin-left: 20rpx;
  font-size: 28rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;
  word-break: break-all;
}
.msg-date {
  float: right;
  color: #aaa;
  font-size: 28rpx;
  margin-bottom: 16rpx;
}

.msg-delete-btn {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 150rpx;
    background: #ff3b30;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    z-index: 1;
}

.menu-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding-top: 80rpx;
}

.menu-content {
  background-color: #fff;
  border-radius: 0;
  width: 50%;
  margin-right: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.menu-item {
  padding: 30rpx 40rpx;
  font-size: 32rpx;
  color: #333;
  text-align: left;
  padding-left: 40rpx;
}

.menu-item:active {
  background-color: #f5f5f5;
}
</style>
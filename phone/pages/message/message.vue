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
          <image class="avatar" :src="conversation.avatar || '/static/icons/avatar1.png'" mode="aspectFill"></image>
          <view class="msg-content">
            <view class="msg-phone">{{ conversation.display_name || conversation.phone }}</view>
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
import { phoneApi } from '@/utils/api';
import { fixGarbledText } from '@/utils/text';

const CP1252_BYTE_MAP = {
  0x20AC: 0x80,
  0x201A: 0x82,
  0x0192: 0x83,
  0x201E: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02C6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8A,
  0x2039: 0x8B,
  0x0152: 0x8C,
  0x017D: 0x8E,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201C: 0x93,
  0x201D: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02DC: 0x98,
  0x2122: 0x99,
  0x0161: 0x9A,
  0x203A: 0x9B,
  0x0153: 0x9C,
  0x017E: 0x9E,
  0x0178: 0x9F
}

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
    decodeUtf8Bytes(bytes) {
      let result = ''
      for (let i = 0; i < bytes.length; i += 1) {
        const byte1 = bytes[i]
        if (byte1 < 0x80) {
          result += String.fromCharCode(byte1)
          continue
        }
        if ((byte1 & 0xe0) === 0xc0 && i + 1 < bytes.length) {
          const byte2 = bytes[i + 1]
          result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f))
          i += 1
          continue
        }
        if ((byte1 & 0xf0) === 0xe0 && i + 2 < bytes.length) {
          const byte2 = bytes[i + 1]
          const byte3 = bytes[i + 2]
          result += String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f))
          i += 2
          continue
        }
        if ((byte1 & 0xf8) === 0xf0 && i + 3 < bytes.length) {
          const byte2 = bytes[i + 1]
          const byte3 = bytes[i + 2]
          const byte4 = bytes[i + 3]
          const codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f)
          result += String.fromCodePoint(codePoint)
          i += 3
          continue
        }
        throw new Error(`invalid-utf8-byte:${byte1}`)
      }
      return result
    },
    fixGarbledText(text) {
      if (typeof text !== 'string' || !text) {
        return text
      }
      try {
        const bytes = Array.from(text).map(char => {
          const code = char.charCodeAt(0)
          if (code <= 0xff) {
            return code
          }
          if (CP1252_BYTE_MAP[code] !== undefined) {
            return CP1252_BYTE_MAP[code]
          }
          throw new Error(`unsupported-char:${code}`)
        })
        const decoded = this.decodeUtf8Bytes(bytes)
        return decoded || text
      } catch (error) {
        return text
      }
    },
    async fetchConversations() {
      this.isLoading = true
      try {
        const response = await uni.request({
          url: phoneApi('/api/conversations'),
          method: 'GET',
          data: {
            userId: this.userId
          }
        })

        if (response.data.code === 0) {
          this.conversations = response.data.data.map(conv => ({
            phone: conv.phone,
            lastMessage: conv.last_message,
            lastMessageTime: conv.last_message_time * 1000, // 转换为毫秒
            unreadCount: conv.unread_count,
            displayName: fixGarbledText(conv.display_name),
            offsetX: 0
          }))
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
            url: `/pages/message/chat?phone=${conversation.phone}&displayName=${encodeURIComponent(conversation.displayName)}`
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
            url: phoneApi('/api/delete-conversations'),
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
                url: phoneApi('/api/delete-conversation'),
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
    }
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
  background: #eee;
  margin-right: 32rpx;
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

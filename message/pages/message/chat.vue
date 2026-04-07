<template>
  <view class="chat-container">
    <!-- 顶部栏 -->
    <view class="chat-header">
      <image class="chat-back" src="/static/icons/back1.png" @click="goBack"></image>
      <image class="chat-avatar" :src="avatar" mode="aspectFill"></image>
      <view class="chat-phone">{{ displayName }}</view>
      <image class="chat-menu" src="/static/icons/more.png" @click="showMenu"></image>
    </view>

    <!-- 弹出菜单 -->
    <view class="menu-popup" v-if="isMenuVisible" @click="hideMenu">
      <view class="menu-content" @click.stop>
        <view class="menu-item" v-for="(item, index) in menuItems" :key="index" @click="handleMenuClick(item)">
          {{ item }}
        </view>
      </view>
    </view>

    <!-- 确认删除弹窗 -->
    <view class="confirm-dialog" v-if="isConfirmVisible" @click="hideConfirm">
      <view class="confirm-content" @click.stop>
        <view class="confirm-title">是否删除全部信息？</view>
        <view class="confirm-buttons">
          <view class="confirm-button cancel" @click="hideConfirm">取消</view>
          <view class="confirm-button confirm" @click="handleDelete">确定</view>
        </view>
      </view>
    </view>

    <!-- 聊天内容区 -->
    <scroll-view class="chat-body"
                scroll-y="true"
                :scroll-top="scrollTop"
                @scrolltoupper="loadMoreMessages"
                 scroll-with-animation>
      <!-- 消息列表 -->
      <view v-for="message in messages" :key="message.id" class="chat-item" :class="{'chat-item-left': !message.ismy, 'chat-item-right': message.ismy}">
        <!-- 左侧气泡（对方消息）和时间 -->
        <view v-if="!message.ismy" class="other-message-group">
           <view class="chat-bubble">
             {{ message.text }}
           </view>
           <!-- 对方消息时间，与气泡左对齐 -->
            <view class="chat-bubble other time">
              {{ formatMessageTime(message.time) }}
            </view>
        </view>
        
        <!-- 右侧气泡（自己消息）和时间 -->
        <view v-else class="self-message-group">
           <view class="chat-bubble self">
             {{ message.text }}
           </view>
           <!-- 自己的消息时间，与气泡右对齐 -->
            <view class="chat-bubble self time">
              {{ formatMessageTime(message.time) }}
            </view>
        </view>
      </view>
      <!-- 加载提示 -->
       <view v-if="isLoading" class="loading-more-text">加载中...</view>
    </scroll-view>

    <!-- 底部输入栏 -->
    <view class="chat-footer">
      <image class="chat-plus" src="/static/icons/add2.png"></image>
      <view class="chat-input-area">
        <input class="chat-input"
               v-model="inputMessage"
               placeholder="短信"
               @confirm="sendMessage"
               confirm-type="send"/>
      </view>
      <image class="chat-send"
             src="/static/icons/send.png"
             @click="sendMessage"
             v-if="inputMessage.trim()"></image>
    </view>
  </view>
</template>

<script>
export default {
  name: "ChatPage",
  data() {
    return {
      phone: '',
      displayName: '',
      avatar: '/static/icons/avatar1.png',
      isMenuVisible: false,
      isConfirmVisible: false,
      menuItems: ['删除', '我的收藏', '应急报警', '骚扰拦截', '全部已读', '设置'],
      inputMessage: '',
      scrollTop: 0,
      messages: [],
      userId: uni.getStorageSync('userId') || 6,
      page: 1,
      pageSize: 20,
      total: 0,
      isLoading: false,
      hasMore: true
    };
  },
  onLoad(options) {
    if (options.phone) {
      this.phone = options.phone;
      this.displayName = options.displayName ? decodeURIComponent(options.displayName) : options.phone;
      this.avatar = this.getCarrierAvatar(this.displayName);
      console.log('Chat page loaded with:', { phone: this.phone, displayName: this.displayName });
      this.fetchMessages();
    }
  },
  methods: {
    async fetchMessages(isLoadMore = false) {
      if (this.isLoading || (!isLoadMore && !this.hasMore)) return;

      this.isLoading = true;
      try {
        const cleanedPhone = this.phone.replace(/\s/g, '');
        console.log('Fetching messages with params:', { userId: this.userId, phone: cleanedPhone, page: this.page, pageSize: this.pageSize });
        const response = await uni.request({
          url: 'http://106.53.30.150:9097/api/messages',
          method: 'GET',
          data: {
            userId: this.userId,
            phone: cleanedPhone,
            page: this.page,
            pageSize: this.pageSize
          }
        });

        if (response.data.code === 0) {
          console.log('Fetch messages successful, raw response:', response.data.data.list);
          const { list, total } = response.data.data;
          this.total = total;

          const formattedMessages = list.map(msg => ({
            id: msg.id,
            text: msg.content,
            time: msg.created_at * 1000,
            ismy: msg.ismy === 1
          })).reverse();

          this.messages = isLoadMore ? [...formattedMessages, ...this.messages] : formattedMessages;

          this.hasMore = this.messages.length < total;
          if (this.hasMore) {
            this.page++;
          }

          if (!isLoadMore) {
            this.$nextTick(() => {
               this.scrollToBottom();
            });
          }
        } else {
          uni.showToast({
            title: response.data.msg || '获取消息失败',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        uni.showToast({
          title: '获取消息失败',
          icon: 'none'
        });
      } finally {
        this.isLoading = false;
      }
    },
    async sendMessage() {
      if (!this.inputMessage.trim()) return;

      try {
        const messageData = {
          senderId: this.userId,
          receiverPhone: this.phone,
          content: this.inputMessage.trim(),
          ismy: true
        };
        console.log('Sending message data to backend:', messageData);

        const response = await uni.request({
          url: 'http://106.53.30.150:9097/api/send-message',
          method: 'POST',
          data: messageData
        });

        if (response.data.code === 0) {
          const newMessage = {
            id: response.data.data.messageId,
            text: this.inputMessage.trim(),
            time: Date.now(),
            ismy: true
          };

          this.messages.push(newMessage);
          this.inputMessage = '';

          this.$nextTick(() => {
            this.scrollToBottom();
          });
        } else {
          uni.showToast({
            title: response.data.msg || '发送失败',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        uni.showToast({
          title: '发送失败',
          icon: 'none'
        });
      }
    },
    async handleDelete() {
      try {
        const response = await uni.request({
          url: 'http://106.53.30.150:9097/api/delete-conversation',
          method: 'POST',
          data: {
            userId: this.userId,
            phone: this.phone
          }
        });

        if (response.data.code === 0) {
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
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
      }
      this.hideConfirm();
    },
    goBack() {
      uni.navigateBack();
    },
    showMenu() {
      this.isMenuVisible = true;
    },
    hideMenu() {
      this.isMenuVisible = false;
    },
    handleMenuClick(item) {
      if (item === '删除') {
        this.showConfirm();
      }
      this.hideMenu();
    },
    showConfirm() {
      this.isConfirmVisible = true;
    },
    hideConfirm() {
      this.isConfirmVisible = false;
    },
    scrollToBottom() {
      this.$nextTick(() => {
         const query = uni.createSelectorQuery().in(this);
         if (this.messages.length > 0) {
             const lastMessageId = this.messages[this.messages.length - 1].id;
             query.select(`#item-${lastMessageId}`).boundingClientRect(rect => {
                  if (rect) {
                       query.select('.chat-body').boundingClientRect(chatBodyRect => {
                            if(chatBodyRect) {
                                this.scrollTop = chatBodyRect.height + 1000;
                            }
                       }).exec();
                  }
             }).exec();
         } else {
             this.scrollTop = 0;
         }
      });
    },
    loadMoreMessages() {
      if (this.hasMore && !this.isLoading) {
        this.fetchMessages(true);
      }
    },
    formatMessageTime(timestamp) {
      if (!timestamp) return '';
      const now = new Date();
      const messageDate = new Date(timestamp);

      const year = messageDate.getFullYear();
      const month = (messageDate.getMonth() + 1).toString().padStart(2, '0');
      const day = messageDate.getDate().toString().padStart(2, '0');
      const hours = messageDate.getHours().toString().padStart(2, '0');
      const minutes = messageDate.getMinutes().toString().padStart(2, '0');

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      if (messageDate >= today) {
        return `今天 ${hours}:${minutes}`;
      } else if (messageDate >= yesterday) {
        return `昨天 ${hours}:${minutes}`;
      } else {
        return `${year}/${month}/${day} ${hours}:${minutes}`;
      }
    },
    async checkContactAndDisplay(number) {
      console.log('checkContactAndDisplay: Processing number:', number);
      const cleanedNumber = number.replace(/\s/g, '');
      if (!cleanedNumber || !this.userId) {
          console.log('checkContactAndDisplay: Invalid number or userId. Using phone number as display.');
          this.displayName = this.phone; // 使用电话号码作为显示名称
          return;
      }
      try {
          const apiUrl = `http://106.53.30.150:9097/api/contact`;
          console.log('checkContactAndDisplay: Calling API:', apiUrl, 'with phone:', cleanedNumber, 'and userId:', this.userId);
          const res = await uni.request({
              url: apiUrl,
              method: 'POST',
              data: {
                  phone: cleanedNumber,
                  userId: this.userId
              }
          });
          console.log('checkContactAndDisplay: API response:', res);

          if (res.statusCode === 200 && res.data && res.data.code === 0 && res.data.data && res.data.data.name) {
              // 只有在成功获取到联系人名字时才更新显示名称
              console.log('checkContactAndDisplay: Contact found. Updating displayName.');
              this.displayName = res.data.data.name;
          } else {
              // 如果没有找到联系人，使用电话号码作为显示名称
              console.log('checkContactAndDisplay: Contact not found. Using phone number as display.');
              this.displayName = this.phone;
          }
      } catch (error) {
          console.error('checkContactAndDisplay: Failed to check contact API:', error);
          // API 调用失败时，使用电话号码作为显示名称
          this.displayName = this.phone;
      }
    },
    // 添加判断运营商客服号码的方法
    getCarrierAvatar(phone) {
      // 判断是否为运营商客服号码
      switch(phone) {
        case '中国电信': // 电信客服
          return '/static/icons/10000.png';
        case '中国联通': // 联通客服
          return '/static/icons/10010.png';
        case '中国移动': // 移动客服
          return '/static/icons/10086.png';
        default:
          return '/static/icons/avatar1.png';
      }
    }
  }
};
</script>

<style scoped>
.chat-container {
  background: #f5f6f7;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.chat-header {
  display: flex;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99;
  padding: 74rpx 20rpx 24rpx 20rpx;
  background: #f5f6f7;
  font-size: 32rpx;
}
.chat-back {
  height: 60rpx;
  width: 60rpx;
  margin-right: 20rpx;
}
.chat-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #eee;
  margin-left: 20rpx;
  margin-right: 20rpx;
}
.chat-phone {
  font-size: 36rpx;
  font-family: monospace;
  margin-left: 10rpx;
  color: #222;
  flex: 1;
}
.chat-menu {
  height: 50rpx;
  width: 50rpx;
  font-size: 48rpx;
  margin-left: 20rpx;
  color: #333;
}

/* 消息列表 */
.chat-body {
  position: absolute;
  top: 180rpx;
  bottom: 120rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  overflow-y: auto;
}

/* 每条消息项 */
.chat-item {
  display: flex;
  padding: 20rpx 40rpx;
}

.chat-item-left {
  justify-content: flex-start;
}

.chat-item-right {
  justify-content: flex-end;
}

/* 对方消息气泡和时间组合容器 */
.other-message-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

/* 自己的消息气泡和时间组合容器 */
.self-message-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

/* 聊天气泡基础样式 */
.chat-bubble {
  border-radius: 16rpx;
  padding: 20rpx 32rpx;
  font-size: 40rpx;
  color: #222;
  max-width: 100%;
  word-break: break-word;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

/* 对方消息气泡 */
.other-message-group .chat-bubble {
  background: #fff;
}

/* 自己的消息气泡 */
.chat-bubble.self {
  background: #e6f4ea;
}

/* 对方消息时间戳 */
.chat-bubble.other.time {
  background: none;
  color: #aaa;
  font-size: 24rpx;
  box-shadow: none;
  padding: 0;
  margin-top: 8rpx;
  min-width: unset;
  text-align: left;
}

/* 自己的消息时间戳 */
.chat-bubble.self.time {
  background: none;
  color: #aaa;
  font-size: 24rpx;
  box-shadow: none;
  padding: 0;
  margin-top: 8rpx;
  min-width: unset;
}

/* 加载更多/没有更多提示文本样式 */
.loading-more-text {
  text-align: center;
  color: #999;
  font-size: 28rpx;
  padding: 20rpx 0;
}

/* 底部输入栏 */
.chat-footer {
  display: flex;
  align-items: center;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  padding: 16rpx 20rpx 0rpx 0rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
  z-index: 100;
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
  border-radius: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8rpx 24rpx;
  margin-right: 0rpx;
}
.chat-input {
  border: none;
  background: transparent;
  font-size: 36rpx;
  width: 95%;
  outline: none;
  padding: 0;
  line-height: 1.4;
}
.chat-send {
  height: 60rpx;
  width: 60rpx;
  opacity: 0.8;
}

.chat-send:active {
  opacity: 0.6;
}

/* 弹出菜单样式 */
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

/* 确认弹窗样式 */
.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.confirm-content {
  background-color: #fff;
  border-radius: 0;
  width: 500rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}

.confirm-title {
  font-size: 32rpx;
  color: #333;
  text-align: left;
  margin-bottom: 40rpx;
}

.confirm-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 30rpx;
}

.confirm-button {
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 0;
  font-size: 32rpx;
  background: none;
  border: none;
  box-shadow: none;
  color: #007aff;
  padding: 0;
}

.confirm-button.cancel {
  color: #40E0D0;
  background: none;
}

.confirm-button.confirm {
  color: #40E0D0;
  background: none;
}
</style> 
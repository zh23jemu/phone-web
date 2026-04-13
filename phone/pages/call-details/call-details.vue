<template>
  <view class="call-history-page">
    <!-- 顶部紫色背景区域 -->
    <view class="top-purple-bg"></view>

    <!-- 顶部居中头像 -->
    <view class="top-centered-info">
        <image class="large-avatar" :src="currentAvatarUrl" mode="aspectFill"></image>
    </view>

    <!-- 主要内容容器 -->
    <view class="main-content-area">
      <!-- 信息卡片分组 -->
      <view class="info-card-group">
          <!-- 大电话号码 -->
          <view class="large-phone-number">{{ callRecords.length > 0 ? callRecords[0].display_name : number.replace(/\s/g, '') }}</view>
          <!-- 联系人信息卡片 -->
          <view class="contact-card">
              <view class="phone-and-location">
                  <view class="phone-number-small">{{ number.replace(/\s/g, '') }}</view>
                  <view class="location-with-pinyin" v-if="!isContact">
                      <text class="location-text">{{ location }}</text>
                  </view>
              </view>
              <view class="action-icons">
                  <image class="icon" src="/static/icons/phone1.png" @click="dialNumber(number)"></image>
                  <image class="icon" src="/static/icons/video1.png"></image>
                  <image class="icon" src="/static/icons/message.png" @click="navigateToChat"></image>
              </view>
          </view>
      </view>

      <!-- 通话记录板块 -->
      <view class="call-history-section">
        <!-- 通话记录头部 -->
        <view class="history-section-header">
            <view class="section-title">
                <text class="title-text">通话记录</text>
            </view>
            <view class="clear-button" @click="clearCallRecords">
                <text class="clear-text">清空</text>
            </view>
        </view>

        <!-- 加载状态 -->
        <view v-if="isLoading" class="loading-state">
            <text>加载中...</text>
        </view>

        <!-- 错误状态 -->
        <view v-else-if="error" class="error-state">
            <text>{{ error }}</text>
        </view>

        <!-- 通话记录列表 -->
        <view v-else class="call-records-list">
            <view v-for="(record, index) in callRecords" :key="index" class="call-record-item">
                <view class="left-section">
                    <view class="record-datetime">
                        <text class="date-time-text">{{ formatTime(record.start_time) }}</text>
                    </view>
                    <view class="phone-with-icon">
                        <image class="phone-icon" :src="getStatusIcon(record.status)" mode="widthFix"></image>
                        <text class="record-phone-number">{{ record.display_name }}</text>
                    </view>
                </view>
                <view class="right-section">
                    <text class="status-text" :class="{ 'missed': record.status === 'missed' || record.status === 'no_answer' }">{{ getStatusText(record) }}</text>
                </view>
            </view>
        </view>
      </view>
    </view>

    <!-- 添加自定义确认弹窗 -->
    <view v-if="showConfirmModal" class="custom-modal-mask" @click="cancelClear">
      <view class="custom-modal-box" @click.stop>
        <view class="custom-modal-title">确认清空</view>
        <view class="custom-modal-content">确定要清空该号码的所有通话记录吗？</view>
        <view class="custom-modal-footer">
          <view class="custom-modal-btn cancel" @click="cancelClear">取消</view>
          <view class="custom-modal-btn confirm" @click="confirmClear">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CallHistoryPage',
  data() {
    return {
      callRecords: [],
      isLoading: false,
      error: null,
      number: '',
      location: '',
      userId: uni.getStorageSync('userId') || 6,
      showConfirmModal: false, // 添加控制自定义弹窗显示的变量
      isContact: false, // Add flag to indicate if the number is a contact
      currentAvatarUrl: '/static/icons/avatar1.png', // 新增：当前头像URL，默认为通用头像
    };
  },
   // 为了模拟截图顶部返回按钮和状态栏，可能需要自定义导航栏样式，这里先留空
   onNavigationBarButtonTap(e) {
   	// 返回按钮逻辑
   },
   onLoad(options) {
       console.log('call-details onLoad options:', options);
       // Create audio context
       this.audioContext = uni.createInnerAudioContext();
       if (options.number) {
           console.log('Received number in call-details:', decodeURIComponent(options.number));
           this.number = decodeURIComponent(options.number);
           this.number = this.formatPhoneNumber(this.number);
           // 根据号码设置头像
           this.currentAvatarUrl = this.getAvatarUrl(this.number.replace(/\s/g, ''));
           // 获取通话记录
           this.fetchCallRecordsByNumber();
       }
   },
   // 添加页面显示时的刷新逻辑
   onShow() {
       // 如果已经有号码，则刷新通话记录
       if (this.number) {
           this.fetchCallRecordsByNumber();
       }
   },
   methods: {
       formatPhoneNumber(number) {
           // 移除所有空格
           const cleaned = number.replace(/\s/g, '');
           // 按照 3-4-4 格式添加空格
           const match = cleaned.match(/^(\d{3})(\d{0,4})(\d{0,4})$/);
           if (match) {
               const parts = match.slice(1).filter(Boolean);
               return parts.join(' ');
           }
           return number;
       },
       async fetchCallRecordsByNumber() {
           this.isLoading = true;
           this.error = null;
           try {
               const response = await uni.request({
                   url: 'http://127.0.0.1:9097/api/call-records',
                   method: 'GET',
                   data: {
                       number: this.number.replace(/\s/g, ''),
                       userId: this.userId
                   }
               });

               console.log('Call records by number response:', response.data);

               if (response.data.code === 0 && response.data.data && response.data.data.list) {
                   this.callRecords = response.data.data.list;
                   // 获取第一条记录的归属地信息
                   if (this.callRecords.length > 0) {
                       this.location = this.callRecords[0].location || '未知位置';
                       // Check if contact_name exists to determine if it's a contact
                       this.isContact = this.callRecords[0].contact_name !== null;
                       // 获取到记录后，根据实际号码再次设置头像
                       this.currentAvatarUrl = this.getAvatarUrl(this.callRecords[0].display_name.replace(/\s/g, ''));
                   } else {
                       this.isContact = false; // No records, not a contact in this context
                       this.currentAvatarUrl = this.getAvatarUrl(this.number.replace(/\s/g, '')); // 如果没有记录，使用传入的号码决定头像
                   }
               } else {
                   this.error = response.data.msg || '未找到该号码的通话记录';
                   this.callRecords = [];
                   this.location = '';
                   this.isContact = false; // Error fetching, assume not a contact or unknown
                   this.currentAvatarUrl = this.getAvatarUrl(this.number.replace(/\s/g, '')); // 如果出错，使用传入的号码决定头像
               }
           } catch (e) {
               console.error('Failed to fetch call records by number:', e);
               this.error = '加载通话记录失败';
               this.callRecords = [];
           } finally {
               this.isLoading = false;
           }
       },
       formatTime(timestamp) {
           if (!timestamp) return '未知时间';
           const date = new Date(timestamp * 1000);
           const month = date.getMonth() + 1;
           const day = date.getDate();
           const hours = String(date.getHours()).padStart(2, '0');
           const minutes = String(date.getMinutes()).padStart(2, '0');
           return `${month}月${day}日 ${hours}:${minutes}`;
       },
       getStatusIcon(status) {
           switch (status) {
               case 'missed': return '/static/icons/phone-missed.png';
               case 'incoming': return '/static/icons/phone-incoming.png';
               case 'canceled': return '/static/icons/phone-missed.png';
               case 'weijie': return '/static/icons/phone-missed.png';
               case 'guaduan': return '/static/icons/phone-missed.png';
               case 'outgoing': return '/static/icons/phone-outgoing.png';
               case 'off': return '/static/icons/phone-off.png';
               case 'completed': return '/static/icons/phone-outgoing.png';
               default: return '/static/icons/default.png';
           }
       },
       formatDuration(startTime, endTime) {
           if (!startTime || !endTime) return '';
           const duration = endTime - startTime;
           const minutes = Math.floor(duration / 60);
           const seconds = duration % 60;
           return `${minutes}分${seconds}秒`;
       },
       getStatusText(record) {
           const statusMap = {
               'ringing': '正在响铃',
               'connected': '已接通',
               'completed': '',
               'failed': '失败',
               'no_answer': '未接',
               'canceled': '未接通',
               'disconnected': '已断开',
               'missed': '未接',
               'incoming': '来电',
               'outgoing': '去电',
               'off': '已挂断',
               'weijie': '未接通',
               'guaduan': '已挂断',
           };

           const status = statusMap[record.status] || '未知状态';
           
           // 如果是已完成的通话，只显示通话时长
           if (record.status === 'completed' && record.start_time && record.end_time) {
               return this.formatDuration(record.start_time, record.end_time);
           }
           
           return status;
       },
       dialNumber(number) {
           console.log('Dialing number:', number);
           // Remove all spaces from the number before encoding
           const cleanNumber = number.replace(/\s/g, '');
           // Navigate to the calling page, passing the number and current location
           uni.navigateTo({
               url: `/pages/call/calling?number=${encodeURIComponent(cleanNumber)}&location=${encodeURIComponent(this.location)}`
           });
       },
       clearCallRecords() {
           this.showConfirmModal = true;
       },
       cancelClear() {
           this.showConfirmModal = false;
       },
       async confirmClear() {
           try {
               const callIds = this.callRecords.map(record => record.call_id);
               
               const response = await uni.request({
                   url: 'http://127.0.0.1:9097/api/delete-call-record',
                   method: 'POST',
                   data: {
                       callId: callIds,
                       userId: this.userId
                   }
               });

               console.log(response);
               if (response.data.code === 0) {
                   uni.showToast({
                       title: '清空成功',
                       icon: 'none'
                   });
                   this.callRecords = [];
               } else {
                   uni.showToast({
                       title: response.data.msg || '清空失败',
                       icon: 'none'
                   });
               }
           } catch (error) {
               console.error('Failed to clear call records:', error);
               uni.showToast({
                   title: '清空失败',
                   icon: 'none'
               });
           } finally {
               this.showConfirmModal = false;
           }
       },
       navigateToChat() {
           // 跳转到聊天页面，并传递号码和位置信息
           const cleanNumber = this.number.replace(/\s/g, '');
		   const displayNumber = this.number.replace(/\s/g, '');
           uni.navigateTo({
               url: `/pages/message/chat?phone=${encodeURIComponent(cleanNumber)}&displayName=${encodeURIComponent(this.number.replace(/\s/g, ''))}`
           });
       },
       // 新增方法：根据号码获取头像URL
       getAvatarUrl(number) {
           const cleanedNumber = number.replace(/\s/g, '');
           switch (cleanedNumber) {
               case '中国电信':
                   return '/static/icons/10000.png';
               case '中国联通':
                   return '/static/icons/10010.png';
               case '中国移动':
                   return '/static/icons/10086.png';
               default:
                   return '/static/icons/avatar1.png'; // 默认头像
           }
       }
   }
}
</script>

<style scoped>
.call-history-page {
  background-color: #ffffff; /* 页面整体背景色为白色 */
  min-height: 100vh;
  position: relative;
  padding-bottom: 40rpx;
  /* 移除 flex 布局，使用 block 流 */
  display: block;
  flex-direction: initial;
}

.top-purple-bg {
  background-color: #e7e1d1; 
  height: 29vh; /* 占页面高度的29% */
  width: 100%;
  /* 移除绝对定位和 flexbox 控制 */
  position: static;
  top: auto;
  left: auto;
  z-index: auto;
}

.main-content-area {
    /* position: relative; */ /* 移除相对定位 */
    z-index: 1; /* 确保在紫色背景上方 */
    /* 移除 margin-top，使其紧随紫色背景下方 */
    margin-top: 0;
    display: flex; /* 设置为 flex 容器 */
    flex-direction: column; /* 子元素纵向排列 */
    align-items: center; /* 使内部内容水平居中 */
    background-color: #ffffff; /* 设置主内容区域背景为白色 */
    border-top-left-radius: 40rpx;
    border-top-right-radius: 40rpx;
    /* 调整 padding-top，为悬浮的头像留出空间 */
    padding-top: 120rpx; /* 为头像下方部分留出空间 */
    flex-grow: 1;
}

/* 顶部居中头像 */
.top-centered-info {
    /* 恢复绝对定位以悬浮 */
    position: absolute;
    top: calc(29vh - 80rpx); /* 垂直居中在 29vh 交界处 */
    left: 50%; /* 水平居中 */
    transform: translateX(-50%); /* 精确水平居中 */
    z-index: 2; /* 确保在所有背景和内容上方 */
    /* 移除 flex 布局相关样式 */
    display: block;
    flex-direction: initial;
    align-items: initial;
    margin-bottom: 0; /* 移除 margin-bottom */
}

.large-avatar {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    background-color: #ddd;
    margin-bottom: 0; /* 移除头像下方的间距 */
    border: 6rpx solid rgba(255, 255, 255, 0.5); /* 图片上的白色边框 */
}

.large-phone-number {
    font-size: 48rpx;
    font-family: monospace;
    color: #333;
    /* 在 info-card-group 中居中 */
    text-align: center;
    margin-bottom: 20rpx; /* 与下方卡片的间距 */
}

/* 信息卡片分组 */
.info-card-group {
    width: 690rpx; /* 与卡片宽度一致 */
    /* background-color: #fff; */ /* 背景色由 main-content-area 提供 */
    border-radius: 20rpx; /* 圆角 */
    /* margin: 0 auto; */ /* 由 main-content-area 的 align-items 居中 */
    padding: 30rpx; /* 内边距 */
    display: flex;
    flex-direction: column;
    align-items: center; /* 使内部元素（号码和卡片）居中 */
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); /* 阴影 */
    margin-bottom: 40rpx; /* 与下方头部间距 */
    margin-top: 0; /* 确保没有额外的顶部间距 */
}

/* 联系人信息卡片 */
.contact-card {
    background-color: #fff; /* 保持白色背景 */
    border-radius: 20rpx;
    width: 100%; /* 在 info-card-group 中占满宽度 */
    /* margin: 0 auto; */ /* 在 info-card-group 中由父元素居中 */
    padding: 0; /* 内边距移至 info-card-group */
    display: flex;
    justify-content: space-between;
    align-items: center;
    /* box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); */ /* 阴影移至 info-card-group */
    /* margin-bottom: 40rpx; */ /* 间距移至 info-card-group */
}

.phone-and-location {
    display: flex;
    flex-direction: column;
}

.phone-number-small {
    font-size: 36rpx;
    font-family: monospace;
    color: #333;
    margin-bottom: 8rpx;
}

.location-with-pinyin {
    display: flex;
    flex-direction: column;
    font-size: 28rpx;
    color: #666;
}

.action-icons {
	
    display: flex;
    align-items: center;
}

.icon {
    width: 50rpx;
    height: 50rpx;
    margin-left: 30rpx; /* 调整图标间距 */
}

/* 通话记录头部 */
.history-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
   /* padding: 0 30rpx; /* 移除，由父级控制 */
   /* margin: 0 30rpx 30rpx 30rpx; *//* 调整外边距 */ 
	padding: 0 0rpx; /* 移除，由父级控制 */
	margin: 0 30rpx 30rpx 30rpx; /* 调整外边距 */
    /* border-bottom: 1rpx solid #eee; */ /* 移除分隔线 */
    padding-bottom: 0rpx;
    width: 100%; /* 移除，由父级控制 */
    box-sizing: border-box; /* 移除，由父级控制 */
}

.section-title,
.clear-button {
    display: flex;
    flex-direction: column;
}

.section-title {
    align-items: flex-start;
    padding-left: 0; /* 确保与通话时间对齐 */
}

.clear-button {
    align-items: flex-end;
    padding-right: 0; /* 确保与状态文本对齐 */
}

.title-text,
.clear-text {
    font-size: 32rpx;
    color: #333;
}

.title-text{
	margin-right: 100rpx;
}

	


.clear-text {
    color: #007aff; /* 蓝色 */
	margin-right: 59rpx;
}


/* 通话记录列表 */
.call-records-list {
  padding: 0 30rpx; /* 移除，由父级控制 */
  /* background-color: #ffffff; */ /* 移除列表区域背景为白色 */
  width: 100%; /* 移除，由父级控制 */
  box-sizing: border-box; /* 移除，由父级控制 */
}

.call-record-item {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 0;
  /* border-bottom: 1rpx solid #eee; */ /* 移除分隔线 */
}

.left-section {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.record-datetime {
    font-size: 28rpx;
    color: #666;
    margin-bottom: 8rpx;
}

.phone-with-icon {
    display: flex;
    align-items: center;
}

.phone-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 8rpx;
}

.record-phone-number {
    font-size: 32rpx;
    color: #333;
}

.right-section {
    display: flex;
    align-items: center;
}

.status-text {
    font-size: 32rpx;
    color: #999;  /* 默认灰色 */
}

/* 未接来电显示红色 */
.call-record-item .status-text.missed {
    color: #ff3b30;  /* iOS red color */
}

/* 新的通话记录板块容器 */
.call-history-section {
    width: 100%;
    box-sizing: border-box;
    padding: 0 30rpx; /* 添加共享内边距 */
    /* 根据需要添加背景、边距、圆角等样式 */
}

/* 自定义弹窗样式 */
.custom-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-modal-box {
  width: 80%;
  background: #fff;
  border-radius: 0;
  overflow: hidden;
}

.custom-modal-title {
  padding: 20rpx 30rpx;
  font-size: 32rpx;
  font-weight: bold;
  text-align: center;
  border-bottom: 1rpx solid #eee;
}

.custom-modal-content {
  padding: 30rpx;
  font-size: 28rpx;
  color: #333;
  text-align: center;
}

.custom-modal-footer {
  display: flex;
  border-top: 1rpx solid #eee;
}

.custom-modal-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  font-size: 32rpx;
}

.custom-modal-btn.cancel {
  color: #666;
  border-right: 1rpx solid #eee;
}

.custom-modal-btn.confirm {
  color: #007aff;
}
</style>

<style>
/* 全局样式，用于修改弹窗样式 */
.uni-modal,
.uni-modal *,
.uni-modal__mask,
.uni-modal__wrapper,
.uni-modal__box,
.uni-modal__header,
.uni-modal__body,
.uni-modal__footer,
.uni-modal__button,
.uni-modal__button-text,
.uni-modal__content,
.uni-modal__dialog,
.uni-modal__title,
.uni-modal__bd,
.uni-modal__ft,
.uni-modal__btn,
.uni-modal__btn_primary,
.uni-modal__btn_default {
    border-radius: 0 !important;
    -webkit-border-radius: 0 !important;
    -moz-border-radius: 0 !important;
}

/* 确保弹窗内容区域也是方的 */
.uni-modal__box {
    border-radius: 0 !important;
    -webkit-border-radius: 0 !important;
    -moz-border-radius: 0 !important;
    overflow: hidden !important;
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
}

/* 确保按钮也是方的 */
.uni-modal__button {
    border-radius: 0 !important;
    -webkit-border-radius: 0 !important;
    -moz-border-radius: 0 !important;
    overflow: hidden !important;
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
}

/* 确保遮罩层也是方的 */
.uni-modal__mask {
    border-radius: 0 !important;
    -webkit-border-radius: 0 !important;
    -moz-border-radius: 0 !important;
    overflow: hidden !important;
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
}

/* 添加更高优先级的选择器 */
:root .uni-modal,
:root .uni-modal *,
:root .uni-modal__mask,
:root .uni-modal__wrapper,
:root .uni-modal__box,
:root .uni-modal__header,
:root .uni-modal__body,
:root .uni-modal__footer,
:root .uni-modal__button,
:root .uni-modal__button-text,
:root .uni-modal__content,
:root .uni-modal__dialog,
:root .uni-modal__title,
:root .uni-modal__bd,
:root .uni-modal__ft,
:root .uni-modal__btn,
:root .uni-modal__btn_primary,
:root .uni-modal__btn_default {
    border-radius: 0 !important;
    -webkit-border-radius: 0 !important;
    -moz-border-radius: 0 !important;
}
</style> 

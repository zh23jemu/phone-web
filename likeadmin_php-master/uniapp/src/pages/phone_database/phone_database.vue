<template>
  <view class="number-library-page">
    <!-- 顶部灰色区域，包含蓝色卡片和搜索栏 -->
    <view class="top-area">
      <view class="top-blue-card">
        <view class="card-title">测试号码库</view>
        <!-- 控制添加按钮的显示 -->
        <view class="add-btn" @click="openAddMarkModal" v-if="isAuthorized">去添加</view>
      </view>
      <view class="search-bar">
        <image class="search-icon" src="/static/icons/serve.png"></image>
        <!-- 修改 placeholder 提示输入授权码 -->
        <input class="search-input" :placeholder="isAuthorized ? '请输入号码进行过滤' : '请输入授权码加载数据'" v-model="searchQuery" />
        <view class="search-btn" @click="handleSearch">搜索</view>
      </view>
    </view>

    <!-- 控制号码列表的显示 -->
    <view class="number-list" v-if="isAuthorized">
      <view class="number-item" v-for="(item, idx) in numbers" :key="idx">{{ item.dialed_number }}</view>
    </view>

    <!-- 控制底部加载更多的显示 -->
    <view class="load-more" @click="onReachBottom" v-if="isAuthorized && numbers.length < total && !loading">点击加载更多</view>

    <!-- 添加标记号码弹窗 -->
    <view class="mark-modal" v-if="showAddMarkModal">
        <view class="modal-content">
            <view class="modal-title">新增测试号码</view>
            <view class="input-area">
                <input class="modal-input" v-model="newMarkNumber" placeholder="请输入手机号码" />
            </view>
            <view class="mark-options">
                <view class="option-item" v-for="option in addMarkOptions" :key="option.value" @click="newMarkType = option.value">
                    <view class="radio-icon" :class="{ 'checked': newMarkType === option.value }"></view>
                    <text>{{ option.label }}</text>
                </view>
            </view>
            <view class="modal-actions">
                <view class="action-btn cancel" @click="closeAddMarkModal">取消</view>
                <view class="action-btn confirm" @click="confirmAddMark">确认</view>
            </view>
        </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'NumberLibraryPage',
  data() {
    return {
      numbers: [], // Change to empty array initially
      searchQuery: '', // Add search query data property
      page: 1, // Current page number
      pageSize: 20, // Items per page
      total: 0, // Total number of marked numbers
      loading: false, // Loading state for pagination
      showAddMarkModal: false,
      newMarkNumber: '',
      newMarkType: '',
      userId: 6, // 初始化为 null，将从用户中心获取
      addMarkOptions: [
        { value: 'normal', label: '一般' },
        { value: 'transfer', label: '转移' },
        { value: 'internal', label: '内部' },
      ],
      isAuthorized: false, // 添加授权状态变量
      authorizedTimestamp: null, // 添加授权时间戳变量
    }
  },
  onLoad() {
    // 获取用户信息
    this.getUserInfo();
    // 移除页面加载时自动获取数据的逻辑
    // this.fetchMarkedNumbers(); 

    // 页面加载时检查本地存储的授权时间戳
    this.checkAuthorizationStatus();
  },
  methods: {
    async getUserInfo() {
      try {
        const res = await uni.request({
          url: 'http://106.53.30.150:2025/api/user/center',
          method: 'GET',
          header: {
            token: uni.getStorageSync('token') // 从本地存储获取 token
          }
        });
        
        if (res.data && res.data.code === 0 && res.data.data) {
          this.userId = res.data.data.id;
          console.log('Got user ID:', this.userId);
          
          // 获取到用户ID后，获取标记号码列表
          this.fetchMarkedNumbers();
        } else {
          console.error('Failed to get user info:', res.data);
          uni.showToast({
            title: '获取用户信息失败',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('Error getting user info:', error);
        uni.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    },
    async fetchMarkedNumbers(append = false) {
      if (this.loading) return; // Prevent duplicate requests

      this.loading = true;
      try {
        console.log('Fetching marked numbers from URL:', `http://106.53.30.150:9097/api/marked-numbers?page=${this.page}&pageSize=${this.pageSize}${this.searchQuery ? `&query=${this.searchQuery}` : ''}`);
        const res = await uni.request({
          url: `http://106.53.30.150:9097/api/marked-numbers?page=${this.page}&pageSize=${this.pageSize}${this.searchQuery ? `&query=${this.searchQuery}` : ''}`,
          method: 'GET',
          timeout: 10000, // Set timeout to 10 seconds
        });

        console.log('Fetch marked numbers response received:', res);
        // Add logging for response data
        console.log('Response data (res.data):', res.data);

        if (res.statusCode === 200 && res.data && res.data.code === 0) {
          const data = res.data.data;
          // Add logging for data.list
          console.log('Data list (data.list):', data.list, 'Length:', data.list ? data.list.length : 0);

          if (append) {
            this.numbers = this.numbers.concat(data.list);
          } else {
            this.numbers = data.list;
          }
          this.total = data.total;

          // Add logging for this.numbers after assignment
          console.log('this.numbers after assignment:', this.numbers, 'Length:', this.numbers.length);

          // Optional: Check if more data is available based on total and current numbers.length
        } else {
          uni.showToast({
            title: res.data?.msg || '获取标记号码失败',
            icon: 'none'
          });
        }
      } catch (error) {
        console.error('Failed to fetch marked numbers:', error);
        uni.showToast({
          title: '网络错误',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },
    handleSearch() {
      // 修改搜索逻辑以实现授权码功能
      const authCode = '9426546';
      if (!this.isAuthorized) {
        if (this.searchQuery === authCode) {
          this.isAuthorized = true;
          // 授权成功时记录时间戳并保存
          const now = Math.floor(Date.now() / 1000); // 获取当前Unix时间戳（秒）
          this.authorizedTimestamp = now;
          uni.setStorageSync('authorizedTimestamp', now); // 保存到本地存储

          this.searchQuery = ''; // 清空授权码输入框
          this.page = 1; // Reset page to 1 on authorization
          this.numbers = []; // Clear existing data
          this.fetchMarkedNumbers(); // Fetch all data after authorization
        } else {
          uni.showToast({
            title: '请输入正确的授权码',
            icon: 'none'
          });
        }
      } else {
        // 如果已授权，执行正常的搜索过滤
        this.page = 1; // Reset page to 1 on new search
        this.numbers = []; // Clear existing data
        this.fetchMarkedNumbers(); // Fetch data with search query
      }
    },
    // Optional: Implement load more
    onReachBottom() {
      if (this.numbers.length < this.total && !this.loading) {
        this.page++;
        this.fetchMarkedNumbers(true); // Pass true to append data
      }
    },
     navigateToAddTask() {
         // TODO: Navigate to the add task page
         uni.navigateTo({
             url: '/pages/phone_database/add_marked_number' // Assuming a page for adding marked numbers
         });
     },
     openAddMarkModal() {
       this.showAddMarkModal = true;
       // Optional: Reset input fields when opening
       this.newMarkNumber = '';
       this.newMarkType = 'normal'; // Default selection
     },
     closeAddMarkModal() {
       this.showAddMarkModal = false;
     },
     async confirmAddMark() {
       // 在添加数据前检查授权状态
       if (!this.isAuthorized) {
         uni.showToast({
           title: '未授权，无法添加数据',
           icon: 'none'
         });
         return;
       }

       if (!this.newMarkNumber || !this.newMarkType) {
         uni.showToast({ title: '请填写号码并选择标记类型', icon: 'none' });
         return;
       }

       try {
         const res = await uni.request({
           url: 'http://106.53.30.150:9097/api/mark-number', // 后端添加标记号码接口
           method: 'POST',
           data: {
             number: this.newMarkNumber,
             markType: this.newMarkType,
             userId: this.userId, // 假设用户ID可以在这里获取到
           }
         });

         console.log('Add marked number response:', res);

         if (res.statusCode === 200 && res.data && res.data.code === 0) {
           uni.showToast({ title: '添加成功', icon: 'success' });
           this.closeAddMarkModal(); // 关闭弹窗
           this.fetchMarkedNumbers(); // 刷新列表
           this.newMarkNumber = ''; // 清空输入框
           this.newMarkType = ''; // 重置选择
         } else {
           uni.showToast({
             title: res.data?.msg || '添加失败',
             icon: 'none'
           });
         }
       } catch (error) {
         console.error('Failed to add marked number:', error);
         uni.showToast({
           title: '网络错误或服务器无响应',
           icon: 'none'
         });
       }
     },
     // 添加检查授权状态的方法
     checkAuthorizationStatus() {
       const storedTimestamp = uni.getStorageSync('authorizedTimestamp');
       if (storedTimestamp) {
         const now = Math.floor(Date.now() / 1000); // 获取当前Unix时间戳（秒）
         const oneDayInSeconds = 24 * 60 * 60;
         const timeDifference = now - storedTimestamp;

         if (timeDifference < oneDayInSeconds) {
           // 授权未过期，直接授权并加载数据
           this.isAuthorized = true;
           this.authorizedTimestamp = storedTimestamp; // 恢复时间戳
           console.log('Authorization valid. Loading data...');
           // 获取到用户ID后（假设getUserInfo已完成），加载数据
           // 这里需要确保 userId 已经被获取，可以考虑在 getUserInfo 的成功回调中调用 fetchMarkedNumbers
           // 或者等待 userId 准备好后再加载数据
            // 由于 getUserInfo 是异步的，我们不能确定它在 checkAuthorizationStatus 执行时是否已完成
            // 一个简单的处理是在 getUserInfo 成功后，如果已授权，则加载数据
            // 但更可靠的方式是等待 userId 可用，或者将加载数据的逻辑移到 getUserInfo 成功后

            // 暂时先直接调用 fetchMarkedNumbers，假设 userId 已可用或会异步更新
            // TODO: 优化getUserInfo和fetchMarkedNumbers的调用顺序，确保userId可用
             if (this.userId !== null) {
                 this.fetchMarkedNumbers();
             } else {
                 // 如果 userId 尚未加载，等待其加载完成后再尝试加载数据
                 const unsubscribe = this.$watch('userId', (newUserId) => {
                     if (newUserId !== null) {
                         this.fetchMarkedNumbers();
                         unsubscribe(); // 停止监听
                     }
                 });
             }

         } else {
           // 授权已过期
           this.isAuthorized = false;
           this.authorizedTimestamp = null;
           uni.removeStorageSync('authorizedTimestamp'); // 移除过期的时间戳
           console.log('Authorization expired.');
         }
       } else {
         // 没有存储的时间戳，未授权
         this.isAuthorized = false;
         this.authorizedTimestamp = null;
         console.log('No authorization timestamp found.');
       }
     }
     // End add check authorization status method
  }
}
</script>

<style scoped>
.number-library-page {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  margin-top: 0rpx;
}
.top-area {
  background: #ffffff;
  padding-bottom: 0rpx;
  padding-top: 0rpx;
}
.top-blue-card {
  background: #4d8cff;
  border-radius: 32rpx;
  margin: 40rpx 24rpx 24rpx 24rpx;
  height: 180rpx;
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 36rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}
.card-title {
  color: #fff;
  font-size: 36rpx;
  font-weight: 500;
}
.add-btn {
  background: #ffffff;
  color: #333;
  font-size: 28rpx;
  border-radius: 40rpx;
  padding: 12rpx 36rpx;
  font-weight: 400;
}
.search-bar {
  background: #f0f0f0;
  margin: 0 24rpx 24rpx 24rpx;
  padding: 0 24rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  border-radius: 40rpx;
  position: relative;
}
.search-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 16rpx;
}
.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #333;
  font-size: 30rpx;
  outline: none;
}
.search-btn {
  color: #4d8cff;
  font-size: 28rpx;
  margin-left: 16rpx;
}
.number-list {
  flex: 1;
  background: #ffffff;
  padding: 0 24rpx;
  margin-top: 0;
}
.number-item {
  color: #333;
  font-size: 34rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #eee;
}
.load-more {
  background: #f0f0f0;
  color: #555;
  text-align: center;
  font-size: 28rpx;
  padding: 24rpx 0;
  letter-spacing: 4rpx;
  border-radius: 0 0 24rpx 24rpx;
  margin-bottom: 50rpx;
}
.mark-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
}
.modal-content {
  background-color: #fff;
  padding: 40rpx;
  border-radius: 24rpx;
  width: 80%;
  max-width: 600rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  z-index: 1002;
  position: relative;
}
.modal-title {
  font-size: 36rpx;
  font-weight: 500;
  margin-bottom: 40rpx;
  text-align: center;
  color: #333;
}
.input-area {
  margin-bottom: 40rpx;
}
.modal-input {
  width: 100%;
  padding: 24rpx;
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  font-size: 32rpx;
  box-sizing: border-box;
  z-index: 1003;
  position: relative;
  height: 80rpx;
}
.mark-options {
  margin-bottom: 40rpx;
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 20rpx;
  flex-wrap: wrap;
}
.option-item {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  border-radius: 8rpx;
  background: #f8f8f8;
  cursor: pointer;
  flex-grow: 1;
  flex-shrink: 0;
  flex-basis: 0;
  justify-content: center;
}
.option-item text {
  font-size: 28rpx;
  color: #333;
  margin-left: 12rpx;
  white-space: nowrap;
}
.radio-icon {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 2rpx solid #999;
  margin-right: 12rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}
.radio-icon.checked {
  border-color: #4d8cff;
  background-color: #4d8cff;
}
.radio-icon.checked::after {
  content: '';
  width: 16rpx;
  height: 16rpx;
  background-color: #fff;
  border-radius: 50%;
}
.modal-actions {
  display: flex;
  justify-content: center;
  gap: 40rpx;
  margin-top: 20rpx;
}
.action-btn {
  padding: 20rpx 60rpx;
  border-radius: 40rpx;
  font-size: 32rpx;
  font-weight: 500;
  text-align: center;
  min-width: 160rpx;
}
.confirm {
  background-color: #4d8cff;
  color: #fff;
}
.cancel {
  background-color: #f5f5f5;
  color: #666;
}
</style> 
<template>
  <view class="login-container">
    <text class="title">账号登录</text>
    
    <input class="input" v-model="account" placeholder="账号" />

    <input class="input" v-if="scene === 1" v-model="password" type="password" placeholder="密码" />
    <input class="input" v-if="scene === 2" v-model="code" placeholder="验证码" />

    <button class="login-button" @click="login">登录</button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      account: '',
      terminal: 1, // Default terminal to 1 (微信小程序)
      terminalIndex: 0,
      scene: 1, // Default scene to 1 (账号/手机号登录)
      sceneIndex: 0,
      password: '',
      code: ''
    };
  },
  methods: {
    bindPickerChange(e) {
      this.terminalIndex = e.detail.value;
      this.terminal = this.terminals[this.terminalIndex].value;
    },
    bindScenePickerChange(e) {
      this.sceneIndex = e.detail.value;
      this.scene = this.scenes[this.sceneIndex].value;
    },
    async login() {
      if (!this.account) {
        uni.showToast({ title: '请输入账号', icon: 'none' });
        return;
      }
      if (this.scene === 1 && !this.password) {
        uni.showToast({ title: '请输入密码', icon: 'none' });
        return;
      }
      if (this.scene === 2 && !this.code) {
        uni.showToast({ title: '请输入验证码', icon: 'none' });
        return;
      }

      try {
        const response = await uni.request({
          url: 'http://106.53.30.150:2025/api/login/account',
          method: 'POST',
          data: {
            account: this.account,
            terminal: 3,
			password: this.password,
            scene: 1
          }
        });

        console.log('Login response:', response);

        if (response.statusCode === 200 && response.data && response.data.code === 1) {
          uni.showToast({ title: '登录成功', icon: 'success' });
          
          const token = response.data.data.token;
          uni.setStorageSync('authToken', token);

          // 调用 /api/user/center 获取用户信息，特别是 userId
          this.getUserInfo(token);
          
        } else {
          uni.showToast({ title: response.data?.msg || '登录失败', icon: 'none' });
        }

      } catch (error) {
        console.error('Login failed:', error);
        uni.showToast({ title: '网络错误', icon: 'none' });
      }
    },
    getUserInfo(token) {
      uni.request({
        url: 'http://106.53.30.150:2025/api/user/center',
        method: 'GET',
        header: {
          'token': token // 在 header 中携带 token
        },
        success: (res) => {
          console.log('User info response:', res);
          if (res.statusCode === 200 && res.data && res.data.code === 1) {
            const userId = res.data.data.id;
            uni.setStorageSync('userId', userId);
            console.log('Stored userId:', userId);

            // 登录成功并获取 userId 后跳转到主页
            uni.reLaunch({
              url: '/pages/message/message'
            });

          } else {
            uni.showToast({ title: res.data?.msg || '获取用户信息失败', icon: 'none' });
            // 获取用户信息失败也跳转，或者根据需求处理
             uni.reLaunch({
               url: '/pages/message/message'
             });
          }
        },
        fail: (err) => {
          console.error('Failed to get user info:', err);
          uni.showToast({ title: '获取用户信息网络错误', icon: 'none' });
           // 获取用户信息失败也跳转，或者根据需求处理
           uni.reLaunch({
             url: '/pages/message/message'
           });
        }
      });
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  padding: 40rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 40rpx;
  text-align: center;
  margin-top: 60rpx;
}

.input,
.picker-input {
  border: 1px solid #ccc;
  padding: 20rpx;
  margin-bottom: 30rpx;
  border-radius: 8rpx;
  font-size: 32rpx;
}

.login-button {
  background-color: #007aff;
  width: 320rpx;
  height: 100rpx;
  color: white;
  padding: 20rpx;
  border-radius: 80rpx;
  font-size: 36rpx;
}
</style> 
<template>
    <view class="call-bg">
      <image :src="imgUrl" class="bg-img" mode="aspectFill" />
      <view class="debug-bg-source">{{ wallpaperDebugText }}</view>
      <view class="call-content">
        <!-- 顶部信息区域 -->
        <view class="call-info">
          <view class="call-number">{{ number }}</view>
          <view class="call-location">
            <text class="hanzi">{{ location }}</text>
            <text class="status" v-if="isPlayingRingtone">对方已振铃</text>
          </view>
        </view>

        <!-- 按钮网格区域 -->
        <view class="button-grid">
          <view class="grid-row">
            <view class="action-item">
              <image src="/static/icons/xx.png" class="call-xx" mode="aspectFit"></image>
              <text class="action-text">短信</text>
            </view>
            <view class="action-item">
              <image src="/static/icons/nz.png" class="call-nz" mode="aspectFit"></image>
              <text class="action-text">提醒</text>
            </view>
          </view>
          <view class="grid-row">
            <view class="call-end-btn" @click="endCall">
              <image src="/static/icons/end-call.png" class="end-icon" mode="aspectFit" />
            </view>
            <view class="miui-action-dial" @click="dial">
              <image src="/static/icons/call-icon.svg" class="miui-icon-call" mode="aspectFit" />
            </view>
          </view>
        </view>
      </view>
    </view>
  </template>
  
<script>
	// `u7746-wallpaper` 仅支持 App-Android，H5 下回退默认背景。
	// #ifdef APP-PLUS
	import u7746wallpaper from '@/uni_modules/u7746-wallpaper';
	// #endif
	import { phoneApi } from '@/utils/api';
	export default {
		data() {
			return {
				imgUrl: '',
				wallpaperDebugText: '背景来源：未初始化',
				number: '186 8828 2571',
				location: '广东佛山 联通',
				status: '',
				ringtoneContext: null,
				endCallContext: null,
				endCallMusicList: [
					'/static/audio/end-call1.mp3',
					'/static/audio/end-call2.mp3'
				],
				ringtoneList: [
					'/static/audio/ringtone1.mp3',
					'/static/audio/ringtone2.mp3',
					'/static/audio/ringtone3.mp3',
					'/static/audio/ringtone4.mp3',
					'/static/audio/ringtone5.mp3',
					'/static/audio/ringtone6.mp3',
					'/static/audio/ringtone7.mp3',
					'/static/audio/ringtone8.mp3',
					'/static/audio/ringtone9.mp3',
					'/static/audio/ringtone10.mp3',
					'/static/audio/ringtone11.mp3',
					'/static/audio/ringtone12.mp3',
					'/static/audio/ringtone13.mp3',
					'/static/audio/ringtone14.mp3',
					'/static/audio/ringtone15.mp3',
					'/static/audio/ringtone16.mp3',
					'/static/audio/ringtone17.mp3',
					'/static/audio/ringtone18.mp3',
					'/static/audio/ringtone19.mp3',
					'/static/audio/ringtone20.mp3'
				],
				currentRingtone: null,
				selectedRingtone: null,
				buttons: [
				  { 
				    icon: '/static/icons/record.png', 
				    activeIcon: '/static/icons/action-record.png',
				    text: '录音',
				    isActive: false
				  },
				  { 
				    icon: '/static/icons/wait.png', 
				    activeIcon: '/static/icons/action-wait.png',
				    text: '等待',
				    isActive: false
				  },
				  { icon: '/static/icons/add.png', text: '添加通话' },
				  { icon: '/static/icons/video.png', text: '视频通话' },
				  { 
				    icon: '/static/icons/mute.png', 
				    activeIcon: '/static/icons/action-mute.png',
				    text: '静音',
				    isActive: false
				  },
				  { icon: '/static/icons/contact.png', text: '联系人' },
				  { 
				    icon: '/static/icons/keypad.png', 
				    activeIcon: '/static/icons/keypad.png',
				    text: '',
				    isActive: false
				  },
				  { 
				    icon: '/static/icons/speaker.png', 
				    activeIcon: '/static/icons/action-speaker.png',
				    text: '',
				    isActive: false
				  }
				],
				showKeypad: false,
				keys: [
				  [{ main: '1', sub: '' }, { main: '2', sub: 'ABC' }, { main: '3', sub: 'DEF' }],
				  [{ main: '4', sub: 'GHI' }, { main: '5', sub: 'JKL' }, { main: '6', sub: 'MNO' }],
				  [{ main: '7', sub: 'PQRS' }, { main: '8', sub: 'TUV' }, { main: '9', sub: 'WXYZ' }],
				  [{ main: '*', sub: '' }, { main: '0', sub: '+' }, { main: '#', sub: '' }]
				],
				keypadInput: '',
				audioContext: null,
				callDuration: 0,
				durationTimer: null,
				callId: '',
				userId: uni.getStorageSync('userId') || 6, // 从本地存储获取 userId，如果不存在则使用默认值 6
				pollTimer: null, // 添加轮询定时器
				ringtonePollTimer: null,
				lastRingtoneUpdateTime: 0,
				isPlayingRingtone: false,
		  }
		},
		onLoad(options) {
		    // Create audio context
		    this.audioContext = uni.createInnerAudioContext();
		    this.audioContext.onEnded(() => {
		      // Optionally reset or handle end of playback
		    });
		    this.audioContext.onError((res) => {
		      console.error('Audio Error:', res.errMsg);
		    });

		    // Create end call music context
		    this.endCallContext = uni.createInnerAudioContext();
		    this.endCallContext.onError((res) => {
		      console.error('End Call Music Error:', res.errMsg);
		    });

		    // Read number and location from navigation options
		    if (options.number) {
		      this.number = decodeURIComponent(options.number);
		      this.number = this.formatPhoneNumber(this.number);
		      // 检查号码是否在通讯录中
		      this.checkContactAndDisplay(this.number);
		    }
		    if (options.location) {
		      this.location = decodeURIComponent(options.location);
		    }
		    if (options.callId) {
		      this.callId = options.callId;
		      this.status = '正在等待接听...';
		      // 开始轮询通话状态
		      this.startPolling();
		    }
		    if (options.dialerUserId) {
		      this.userId = options.dialerUserId;
		    }

		    // Existing logic to get background image
		    this.imgUrl = '/static/images/bg.jpg';
		    this.wallpaperDebugText = '背景来源：默认背景';
		    // #ifdef APP-PLUS
		    const ret = u7746wallpaper.getBackground('test.png');
		    console.log(ret);
		    if (ret.code === "1") {
		      this.imgUrl = ret.msg;
		      this.wallpaperDebugText = `背景来源：系统壁纸 code=${ret.code}`;
		    } else {
		      this.wallpaperDebugText = `背景来源：默认背景 code=${ret.code || 'unknown'}`;
		    }
		    // #endif

		    // 只有在没有 callId 的情况下才发送拨号请求
		    if (!options.callId) {
		        this.sendDialRequest();
		    }
		    
		    // 开始轮询铃声状态（只用于更新状态显示）
		    this.startRingtonePolling();
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
    
			startDurationTimer() {
				this.durationTimer = setInterval(() => {
					this.callDuration++;
					this.updateCallStatus();
				}, 1000);
			},
			
			updateCallStatus() {
				if (this.callDuration > 0) {
					const minutes = Math.floor(this.callDuration / 60);
					const seconds = this.callDuration % 60;
					this.status = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
				}
			},
			
		  toggleButton(index) {
		    if (this.buttons[index].activeIcon) {
		      this.buttons[index].isActive = !this.buttons[index].isActive;
          if (index === 6) {
            this.showKeypad = !this.showKeypad;
          }
		    }
		  },
		  pressKey(key) {
			this.keypadInput += key;

			// Play key sound
			if (this.audioContext) {
			  let soundSrc = '';
			  switch(key) {
				case '0': soundSrc = '/static/audio/dtmf-0.mp3'; break; // Replace with actual path
				case '1': soundSrc = '/static/audio/dtmf-1.mp3'; break; // Replace with actual path
				case '2': soundSrc = '/static/audio/dtmf-2.mp3'; break; // Replace with actual path
				case '3': soundSrc = '/static/audio/dtmf-3.mp3'; break; // Replace with actual path
				case '4': soundSrc = '/static/audio/dtmf-4.mp3'; break; // Replace with actual path
				case '5': soundSrc = '/static/audio/dtmf-5.mp3'; break; // Replace with actual path
				case '6': soundSrc = '/static/audio/dtmf-6.mp3'; break; // Replace with actual path
				case '7': soundSrc = '/static/audio/dtmf-7.mp3'; break; // Replace with actual path
				case '8': soundSrc = '/static/audio/dtmf-8.mp3'; break; // Replace with actual path
				case '9': soundSrc = '/static/audio/dtmf-9.mp3'; break; // Replace with actual path
				case '*': soundSrc = '/static/audio/dtmf-star.mp3'; break; // Replace with actual path
				case '#': soundSrc = '/static/audio/dtmf-hash.mp3'; break; // Replace with actual path
			  }
			  if (soundSrc) {
				this.audioContext.src = soundSrc;
				this.audioContext.play();
			  }
			}
		  },
		  deleteLastDigit() {
			if (this.keypadInput.length > 0) {
			  this.keypadInput = this.keypadInput.slice(0, -1);
			}
		  },
		  // 发送拨号请求
		  async sendDialRequest() {
			  if (!this.number) {
				  uni.showToast({ title: '号码不能为空', icon: 'none' });
				  return;
			  }
		  
			  this.status = '正在拨号...';
		  
			  try {
				  const res = await uni.request({
					  url: phoneApi('/api/dial'),
					  method: 'POST',
					  data: {
						  number: this.number.replace(/\s/g, ''),
						  dialerUserId: this.userId,
						  targetUserId: this.userId, // 这里可以根据需要修改目标用户ID
						  location: this.location // 添加归属地信息
					  }
				  });
				  console.log(this.location)
				  console.log('Dial request response:', res);
		  
				  if (res.statusCode === 200 && res.data && res.data.code === 0) {
					  this.callId = res.data.data?.callId;
					  this.status = '正在等待对方接听...';
					  
					  // 开始轮询通话状态
					  this.startPolling();
				  } else {
					  this.status = '拨号失败';
					  uni.showToast({
						  title: res.data?.msg || '拨号失败',
						  icon: 'none'
					  });
					  setTimeout(() => {
						  uni.navigateBack();
					  }, 2000);
				  }
			  } catch (error) {
				  console.error('Dial request failed:', error);
				  this.status = '拨号失败';
				  uni.showToast({
					  title: '网络错误',
					  icon: 'none'
				  });
				  setTimeout(() => {
					  uni.navigateBack();
				  }, 2000);
			  }
		  },
		  
		  // 开始轮询通话状态
		  startPolling() {
			  // 每3秒查询一次通话状态
			  this.pollTimer = setInterval(() => {
				  this.checkCallStatus();
			  }, 3000);
		  },
		  
		  // 停止轮询
		  stopPolling() {
			  if (this.pollTimer) {
				  clearInterval(this.pollTimer);
				  this.pollTimer = null;
			  }
		  },
		  
		  // 检查通话状态
		  async checkCallStatus() {
		      if (!this.callId) return;
		      try {
		          const res = await uni.request({
		              url: phoneApi('/api/call-status'),
		              method: 'GET',
		              data: {
		                  callId: this.callId
		              }
		          });
		  
		          console.log('Call status response:', res);
		  
		          if (res.statusCode === 200 && res.data && res.data.code === 0) {
		              const status = res.data.data.status;
		              console.log('Current call status:', status);
		              
		              // 更新状态变量
		              this.status = status;
		              
		              switch (status) {
		                  case 'ringing':
		                      break;
		                  case 'connected':
		                      this.stopRingtone();
		                      if (!this.durationTimer) {
		                          console.log('Call connected, starting timer');
		                          this.startDurationTimer();
		                      }
		                      break;
		                  case 'failed':
		                      console.log('Call failed');
		                      if (this.durationTimer) {
		                          clearInterval(this.durationTimer);
		                          this.durationTimer = null;
		                      }
		                      setTimeout(() => {
		                          uni.navigateBack();
		                      }, 1000);
		                      break;
		                  case 'canceled':
		                      console.log('Call ended with status:', status);
		                      this.stopRingtone();
		                      if (this.durationTimer) {
		                          clearInterval(this.durationTimer);
		                          this.durationTimer = null;
		                      }
		                      uni.$emit('callEnded');
		                      setTimeout(() => {
		                          uni.navigateBack();
		                      }, 1000);
		                      break;
		                  case 'disconnected':
		                      console.log('Call disconnected');
		                      this.stopPolling();
		                      if (this.durationTimer) {
		                          clearInterval(this.durationTimer);
		                          this.durationTimer = null;
		                      }
		                      uni.$emit('callEnded');
		                      setTimeout(() => {
		                          uni.navigateBack();
		                      }, 1000);
		                      break;
		                  default:
		                      console.log('Call ended with status:', status);
		                      this.stopPolling();
		                      if (this.durationTimer) {
		                          clearInterval(this.durationTimer);
		                          this.durationTimer = null;
		                      }
		                      uni.$emit('callEnded');
		                      setTimeout(() => {
		                          uni.navigateBack();
		                      }, 1000);
		                      break;
		              }
		          }
		      } catch (error) {
		          console.error('Failed to check call status:', error);
		      }
		  },
		  endCall() {
			    // 停止计时器
			    if (this.durationTimer) {
			      clearInterval(this.durationTimer);
		          this.durationTimer = null;
		        }
		      
		        // 停止轮询
		        this.stopPolling();
			    // 停止铃声
			    this.stopRingtone();
			    // 如果有 callId，发送挂断请求
				if (this.callId) {
					uni.request({
						url: phoneApi('/api/hangup'),
						method: 'POST',
						data: {
							callId: this.callId,
							action: "hangup"
						},
						success: (res) => {
							if (res.statusCode === 200 && res.data && res.data.code === 0) {
								this.status = '正在结束通话...';
								// 触发通话结束事件
								uni.$emit('callEnded');
								// 在返回前触发清空事件
								uni.$emit('clearDialInput');
								setTimeout(() => {
									uni.navigateBack();
								}, 1000);
							} else {
								// 触发通话结束事件
								uni.$emit('callEnded');
								// 在返回前触发清空事件
								uni.$emit('clearDialInput');
								uni.navigateBack();
							}
						},
						fail: (err) => {
							console.error('Failed to hangup call:', err);
							uni.showToast({
								title: '挂断失败',
								icon: 'none'
							});
							// 触发通话结束事件
							uni.$emit('callEnded');
							// 在返回前触发清空事件
							uni.$emit('clearDialInput');
							setTimeout(() => {
								uni.navigateBack();
							}, 1000);
						}
					});
				} else {
					// 如果没有 callId，直接返回
					this.status = '已取消';
					// 触发通话结束事件
					uni.$emit('callEnded');
					// 在返回前触发清空事件
					uni.$emit('clearDialInput');
					setTimeout(() => {
						uni.navigateBack();
					}, 1000);
				}
			  },
		  playRandomRingtone() {
		    // 只更新状态，不播放铃声
		    console.log('Ringtone playback disabled in call-back page');
		  },
		  
		  stopRingtone() {
		    // 只更新状态，不停止铃声
		    console.log('Ringtone stop disabled in call-back page');
		  },
		  playEndCallMusic() {
		    if (!this.endCallContext) return;
		    
		    // 随机选择一首结束音乐
		    const randomIndex = Math.floor(Math.random() * this.endCallMusicList.length);
		    const endMusic = this.endCallMusicList[randomIndex];
		    
		    this.endCallContext.src = endMusic;
		    this.endCallContext.play();

		    // 根据选择的音乐设置不同的跳转时间
		    const delayTime = endMusic.includes('end-call1') ? 7000 : 17000;
		    setTimeout(() => {
		      // 在返回前触发清空事件
		      uni.$emit('clearDialInput');
		      uni.navigateBack();
		    }, delayTime);
		  },
		  startRingtonePolling() {
		    // 每1秒检查一次铃声状态
		    this.ringtonePollTimer = setInterval(() => {
		        this.checkRingtoneStatus();
		    }, 1000);
		  },
		  
		  stopRingtonePolling() {
		    if (this.ringtonePollTimer) {
		        clearInterval(this.ringtonePollTimer);
		        this.ringtonePollTimer = null;
		    }
		  },
		  
		  async checkRingtoneStatus() {
		    try {
		        const res = await uni.request({
		            url: phoneApi('/api/ringtone-status'),
		            method: 'GET',
		            data: {
		                userId: this.userId  // 添加用户ID参数
		            }
		        });
		        
		        if (res.statusCode === 200 && res.data && res.data.code === 0) {
		            const { isPlaying, lastUpdateTime, userId } = res.data.data;
		            
		            // 只更新状态，不播放铃声
		            if (lastUpdateTime > this.lastRingtoneUpdateTime && 
		                isPlaying !== this.isPlayingRingtone && 
		                userId === this.userId) {
		                console.log('Ringtone status changed:', isPlaying);
		                this.lastRingtoneUpdateTime = lastUpdateTime;
		                this.isPlayingRingtone = isPlaying;
		            }
		        }
		    } catch (error) {
		        console.error('Failed to check ringtone status:', error);
		    }
		  },
		  async checkContactAndDisplay(number) {
		    console.log('checkContactAndDisplay: Processing number:', number);
		    const cleanedNumber = number.replace(/\s/g, '');
		    if (!cleanedNumber) {
		        console.log('checkContactAndDisplay: Invalid number. Using original.');
		        return;
		    }
		    try {
		        // 使用 POST 方法请求
		        const apiUrl = phoneApi('/api/contact');
		        console.log('checkContactAndDisplay: Calling API:', apiUrl, 'with phone:', cleanedNumber);
		        const res = await uni.request({
		            url: apiUrl,
		            method: 'POST',
		            data: {
		                phone: cleanedNumber
		            }
		        });
		        console.log('checkContactAndDisplay: API response:', res);

		        if (res.statusCode === 200 && res.data && res.data.code === 0 && res.data.data) {
		            // Contact found, display name and number
		            console.log('checkContactAndDisplay: Contact found.', res.data.data.phone);
		            this.number = res.data.data.name;  // 直接使用名字，不需要格式化
		            this.location = res.data.data.phone;  // 电话号码需要格式化
		            console.log('checkContactAndDisplay: Updated display number to:', this.number, 'location to:', this.location);
		        } else {
		            // Contact not found or API returned error/no data
		            console.log('checkContactAndDisplay: Contact not found or API issue.');
		        }
		    } catch (error) {
		        console.error('checkContactAndDisplay: Failed to check contact API:', error);
		    }
		  },
		  // 修改接听方法
		  async dial() {
		      try {
		          // 停止所有计时器和轮询
		          this.stopPolling();
		          this.stopRingtonePolling();
		          
		          // 停止铃声
		          this.stopRingtone();
		          
		          // 更新铃声状态为false
		          try {
		              const res = await uni.request({
		                  url: phoneApi('/api/ringtone-status'),
		                  method: 'POST',
		                  data: {
		                      userId: this.userId,
		                      isPlaying: false
		                  }
		              });
		              
		              if (res.statusCode === 200 && res.data && res.data.code === 0) {
		                  console.log('成功更新铃声状态为false');
		              } else {
		                  console.error('更新铃声状态失败');
		              }
		          } catch (error) {
		              console.error('更新铃声状态时出错:', error);
		          }

		          // 更新通话状态为 connected
		          try {
		              const statusRes = await uni.request({
		                  url: phoneApi('/api/update-call-status'),
		                  method: 'POST',
		                  data: {
		                      callId: this.callId,
		                      status: 'connected'
		                  }
		              });
		              
		              if (statusRes.statusCode === 200 && statusRes.data && statusRes.data.code === 0) {
		                  console.log('成功更新通话状态为正在通话');
		              } else {
		                  console.error('更新通话状态失败:', statusRes.data?.msg || '未知错误');
		                  throw new Error(statusRes.data?.msg || '更新通话状态失败');
		              }
		          } catch (error) {
		              console.error('更新通话状态时出错:', error);
		              throw error; // 重新抛出错误，让外层捕获处理
		          }
		          
		          // 在导航前清理当前页面资源
		          this.cleanup();
		          
		          // 准备导航URL
		          const url = `/pages/call/calling?number=${encodeURIComponent(this.number.replace(/\s/g, ''))}&location=${encodeURIComponent(this.location)}&callId=${this.callId}&fromCallBack=true`;
		          
		          // 使用redirectTo替代navigateTo，避免实例问题
		          uni.redirectTo({
		              url: url,
		              success: () => {
		                  console.log('成功跳转到通话页面');
		              },
		              fail: (err) => {
		                  console.error('页面跳转失败:', err);
		                  // 如果跳转失败，显示错误并返回
		                  uni.showToast({
		                      title: '页面跳转失败',
		                      icon: 'none',
		                      duration: 2000
		                  });
		                  setTimeout(() => {
		                      uni.navigateBack();
		                  }, 2000);
		              }
		          });
		      } catch (error) {
		          console.error('接听方法出错:', error);
		          uni.showToast({
		              title: error.message || '接听失败',
		              icon: 'none',
		              duration: 2000
		          });
		          // 出错时清理并返回
		          this.cleanup();
		          setTimeout(() => {
		              uni.navigateBack();
		          }, 2000);
		      }
		  },
		  // Add a cleanup method to handle component cleanup
		  cleanup() {
		      // Clear all timers
		      if (this.durationTimer) {
		          clearInterval(this.durationTimer);
		          this.durationTimer = null;
		      }
		      if (this.pollTimer) {
		          clearInterval(this.pollTimer);
		          this.pollTimer = null;
		      }
		      if (this.ringtonePollTimer) {
		          clearInterval(this.ringtonePollTimer);
		          this.ringtonePollTimer = null;
		      }
		      
		      // Destroy audio contexts
		      if (this.audioContext) {
		          this.audioContext.destroy();
		          this.audioContext = null;
		      }
		      if (this.endCallContext) {
		          this.endCallContext.destroy();
		          this.endCallContext = null;
		      }
		      
		      // Clear any other state
		      this.isPlayingRingtone = false;
		      this.lastRingtoneUpdateTime = 0;
		  },
		  // Add helper method to get current date in YYYY-MM-DD format
		  getCurrentDateString() {
		      const now = new Date();
		      const year = now.getFullYear();
		      const month = (now.getMonth() + 1).toString().padStart(2, '0');
		      const day = now.getDate().toString().padStart(2, '0');
		      return `${year}-${month}-${day}`;
		  },
		},
		onUnload() {
			// 清理计时器
			if (this.durationTimer) {
		        clearInterval(this.durationTimer);
		        this.durationTimer = null;
		    }
			// 停止轮询
			this.stopPolling();
		    // Destroy audio context when page is closed
		    if (this.audioContext) {
		      this.audioContext.destroy();
		      this.audioContext = null;
		    }
		    // Destroy end call music context
		    if (this.endCallContext) {
		      this.endCallContext.destroy();
		      this.endCallContext = null;
		    }
		    // 停止铃声轮询
		    this.stopRingtonePolling();
		}
	}
</script>
  
<style scoped>
.call-bg {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

.call-bg::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1;
}

.bg-img {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
}

.debug-bg-source {
    position: absolute;
    top: 88rpx;
    left: 24rpx;
    z-index: 3;
    padding: 10rpx 16rpx;
    border-radius: 999rpx;
    background: rgba(0, 0, 0, 0.35);
    color: #fff;
    font-size: 22rpx;
    line-height: 1.4;
}

.call-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0 5vw;
    box-sizing: border-box;
}

/* 顶部信息区域 */
.call-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding-top: 15vh;
}

.call-number {
    font-size: clamp(48rpx, 8vw, 65rpx);  /* 与 calling 页面一致 */
    color: #fff;
    font-weight: bold;
    letter-spacing: 2rpx;
    text-align: center;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 2vh;
}

.call-location {
    color: #adadad;
    text-align: center;
    width: 100%;
}

.hanzi {
    font-size: clamp(28rpx, 4vw, 32rpx);  /* 与 calling 页面一致 */
    display: block;
    line-height: 1.4;
}

.status {
    font-size: clamp(24rpx, 3.5vw, 28rpx);  /* 与 calling 页面一致 */
    color: #adadad;
    display: block;
    line-height: 1.4;
    margin-top: 8rpx;
}

/* 按钮网格布局 */
.button-grid {
    position: fixed;
    top: 65%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 750rpx;
    display: flex;
    flex-direction: column;
    gap: 120rpx;
}

.grid-row {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0 100rpx;
    box-sizing: border-box;
}

.action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 120rpx;
}

.action-text {
    color: #fff;
    font-size: 24rpx;
    margin-top: 12rpx;
    text-align: center;
}

/* 图标尺寸 */
.call-xx, .call-nz {
    width: 60rpx;
    height: 60rpx;
}

/* 挂断和接听按钮样式 */
.call-end-btn, .miui-action-dial {
    width: 120rpx;
    height: 120rpx;
    border-radius: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.call-end-btn {
    background-color: #f7372d;
    box-shadow: 0 4rpx 12rpx rgba(247, 55, 45, 0.3);
}

.miui-action-dial {
    background-color: #4cd964;
    box-shadow: 0 4rpx 12rpx rgba(76, 217, 100, 0.3);
}

.end-icon, .miui-icon-call {
    width: 50rpx;
    height: 50rpx;
}

/* 移除旧的按钮布局样式 */
.call-actions, .bottom-actions {
    display: none;
}
</style>



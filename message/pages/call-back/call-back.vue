<template>
    <view 
      class="call-bg"
      :style="{
        overflow: 'hidden',
        height: '100vh',
        touchAction: 'none'
      }"
    >
      <image :src="imgUrl" class="bg-img" mode="aspectFill" />
      <view class="call-content">
        <view class="call-number">{{ number }}</view>
        <view class="call-location">
          <text class="hanzi">{{ location }}</text>
          <text class="status" v-if="isPlayingRingtone">对方已振铃</text>
        </view>
		
		
        <view class="call-actions">
            <view class="action-item">
                <image src="/static/icons/xx.png" class="call-xx"></image>
                <text>短信</text>
            </view>
            <view class="action-item">
                <image src="/static/icons/nz.png" class="call-nz"></image>
                <text>提醒</text>
            </view>
        </view>
		

        <view class="bottom-actions">
		  <view class="call-end-btn" @click="endCall">
		    <image src="/static/icons/end-call.png" class="end-icon" />
		  </view>
          <view class="miui-action-dial" @click="dial">
              <image src="/static/icons/call-icon.svg" class="miui-icon-call" />
          </view>
        </view>
      </view>
    </view>
  </template>
  
<script>
	import u7746wallpaper from '@/uni_modules/u7746-wallpaper';
	export default {
		data() {
			return {
				imgUrl: '',
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

		    // Create ringtone context
		    this.ringtoneContext = uni.createInnerAudioContext();
		    this.ringtoneContext.onEnded(() => {
		      // 当铃声播放结束时，重新播放同一首铃声
		      if (this.selectedRingtone) {
		        this.ringtoneContext.src = this.selectedRingtone;
		        this.ringtoneContext.play();
		      }
		    });
		    this.ringtoneContext.onError((res) => {
		      console.error('Ringtone Error:', res.errMsg);
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
		    const ret = u7746wallpaper.getBackground('test.png');
		    console.log(ret);
		    if (ret.code === "1") {
		      this.imgUrl = ret.msg;
		    } else {
		      this.imgUrl = '/static/images/bg.jpg';
		    }

		    // 只有在没有 callId 的情况下才发送拨号请求
		    if (!options.callId) {
		        this.sendDialRequest();
		    }
		    
		    // 开始轮询铃声状态
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
					  url: 'http://106.53.30.150:9097/api/dial',
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
		              url: `http://106.53.30.150:9097/api/call-status`,
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
						url: 'http://106.53.30.150:9097/api/hangup',
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
		    if (!this.ringtoneContext) return;
		    
		    const cleanedNumber = this.number.replace(/\s/g, ''); // Get cleaned number
		    const todayString = this.getCurrentDateString(); // Get today's date
		    const storageKey = 'number_ringtone_preferences';
		    
		    // Read existing preferences from local storage
		    const preferencesString = uni.getStorageSync(storageKey);
		    let preferences = preferencesString ? JSON.parse(preferencesString) : {};
		    
		    let useStoredRingtone = false;
		    
		    // Check if there is a preference for this number and if it is for today
		    if (preferences[cleanedNumber] && preferences[cleanedNumber].date === todayString) {
		        this.selectedRingtone = preferences[cleanedNumber].ringtoneUrl;
		        useStoredRingtone = true;
		        console.log(`Using stored ringtone for ${cleanedNumber} for today: ${this.selectedRingtone}`);
		    }
		    
		    // If no stored ringtone for today, select a random one and store it
		    if (!useStoredRingtone) {
		        const randomIndex = Math.floor(Math.random() * this.ringtoneList.length);
		        this.selectedRingtone = this.ringtoneList[randomIndex];
		        
		        // Store the new preference
		        preferences[cleanedNumber] = {
		            ringtoneUrl: this.selectedRingtone,
		            date: todayString
		        };
		        uni.setStorageSync(storageKey, JSON.stringify(preferences));
		        console.log(`Selected random ringtone for ${cleanedNumber} and stored for today: ${this.selectedRingtone}`);
		    }
		    
		    // 播放选中的铃声
		    this.ringtoneContext.src = this.selectedRingtone;
		    this.ringtoneContext.play();
		    console.log('Playing ringtone:', this.selectedRingtone);
		  },
		  
		  stopRingtone() {
		    if (this.ringtoneContext) {
		      this.ringtoneContext.stop();
		      // 重置选中的铃声，这样下次呼叫时会重新随机选择
		      this.selectedRingtone = null;
		    }
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
		            url: 'http://106.53.30.150:9097/api/ringtone-status',
		            method: 'GET'
		        });
		        
		        if (res.statusCode === 200 && res.data && res.data.code === 0) {
		            const { isPlaying, lastUpdateTime } = res.data.data;
		            
		            // 只有当状态更新且状态真正改变时才处理
		            if (lastUpdateTime > this.lastRingtoneUpdateTime && isPlaying !== this.isPlayingRingtone) {
		                console.log('Ringtone status changed:', isPlaying);
		                this.lastRingtoneUpdateTime = lastUpdateTime;
		                this.isPlayingRingtone = isPlaying;
		                
		                if (isPlaying) {
		                    this.playRandomRingtone();
		                } else {
		                    this.stopRingtone();
		                }
		            }
		        }
		    } catch (error) {
		        console.error('Failed to check ringtone status:', error);
		    }
		  },
		  async checkContactAndDisplay(number) {
		    console.log('checkContactAndDisplay: Processing number:', number);
		    const cleanedNumber = number.replace(/\s/g, '');
		    if (!cleanedNumber || !this.userId) {
		        console.log('checkContactAndDisplay: Invalid number or userId. Using original.');
		        return;
		    }
		    try {
		        // 使用 GET 方法请求
		        const apiUrl = `http://106.53.30.150:9097/api/contact?userId=${this.userId}&phone=${cleanedNumber}`;
		        console.log('checkContactAndDisplay: Calling API:', apiUrl);
		        const res = await uni.request({
		            url: apiUrl,
		            method: 'POST'  // 确保使用 GET 方法
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
		  dial() {
		      // 停止铃声
		      this.stopRingtone();
		      // 直接跳转到通话页面，去掉号码中的空格，添加 fromCallBack 标识
		      uni.redirectTo({
		          url: `/pages/call/calling?number=${encodeURIComponent(this.number.replace(/\s/g, ''))}&location=${encodeURIComponent(this.location)}&callId=${this.callId}&fromCallBack=true`
		      });
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
		    // Destroy ringtone context
		    if (this.ringtoneContext) {
		      this.ringtoneContext.destroy();
		      this.ringtoneContext = null;
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
    width: 100vw;
    height: 100vh;
    z-index: 0;
}
.call-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100vh;
    /* justify-content: space-between; */
}
.call-number {
    font-size: 65rpx;
    color: #fff;
    font-weight: bold;
    margin-bottom: 0rpx;
    letter-spacing: 2rpx;
	margin-top: 370rpx;
}
.call-location {
    color: #adadad;
    text-align: center;
    margin-bottom: 0rpx;
	margin-top: 0rpx;
}
.hanzi {
    font-size: 32rpx;
    display: block;
}
.status {
    font-size: 28rpx;
    color: #adadad;
    display: block;
}
.keypad-input-display {
    font-size: 60rpx;
    color: #fff;
    text-align: center;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 550rpx;
}
.call-actions {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    position: absolute;
    bottom: 570rpx;
    left: 0;
    right: 0;
    gap: 200rpx;
}
.call-xx, .call-nz {
    width: 70rpx;
    height: 70rpx;
}
.call-actions .action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 140rpx;
}
.call-actions image {
    width: 60rpx;
    height: 60rpx;
    margin-bottom: 27rpx;
}
.call-actions text {
    font-size: 28rpx;
    color: #adadad;
    display: block;
    text-align: center;
}
.bottom-actions {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    position: absolute;
    bottom: 400rpx;
    left: 0;
    right: 0;
    gap: 200rpx;
}
.call-end-btn {
    width: 140rpx;
    height: 140rpx;
    background: #f7372d;
    border-radius: 90rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}
.end-icon {
    width: 70rpx;
    height: 70rpx;
}
  
.miui-dialpad {
    width: 90vw;
    display: flex;
    flex-direction: column;
    margin-bottom: 100rpx;
    margin-top: 140rpx;
    margin-left: 80rpx;
    margin-right: auto;
    justify-content: flex-end;
}
  
.miui-keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20rpx;
    width: 100%;
}
  
.miui-key-row {
  	display: contents;
}
  
.miui-key {
  	display: flex;
  	flex-direction: column;
  	align-items: center;
  	justify-content: center;
  	width: 120rpx;
  	height: 120rpx;
  	border-radius: 60rpx;
  	background-color: rgba(255, 255, 255, 0.1);
  	color: #fff;
}
  
.miui-key-main {
  	font-size: 60rpx;
  	font-weight: bold;
}
  
.miui-key-sub {
  	font-size: 24rpx;
}
  
.miui-key-img {
      width: 30rpx;
      height: 30rpx;
      margin-top: 5rpx;
}

.miui-dial-actions {
  	width: 80%;
  	display: flex;
  	justify-content: center;
  	align-items: center;
  	margin-top: 40rpx;
    margin-bottom: 100rpx;
}
  
.miui-action-backspace {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100rpx;
      height: 100rpx;
}
  
.miui-icon-backspace {
  	width: 60rpx;
  	height: 60rpx;
}

.miui-action-dial {
    height: 140rpx;
    width: 140rpx;
    background: #21b34b;
    border-radius: 90rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}
.miui-icon-call {
    width: 60rpx;
    height: 60rpx;
}
  /* Removed specific styling for the last row */
</style>



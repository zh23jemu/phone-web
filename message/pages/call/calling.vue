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
          <text class="status">{{ displayStatus }}</text>
        </view>
        
        <view class="keypad-input-display" v-if="showKeypad">{{ keypadInput }}</view>

        <view class="call-actions" v-if="!showKeypad">
          <view class="action-item" v-for="(btn, index) in buttons.slice(0, 6)" :key="btn.text" @click="toggleButton(index)">
            <image :src="btn.isActive ? btn.activeIcon : btn.icon" class="action-icon" />
            <text class="action-text">{{ btn.text }}</text>
          </view>
        </view>

        <view 
        	class="miui-dialpad" 
        	v-if="showKeypad"
        	@touchmove.stop.prevent
        	@scroll.stop.prevent
        	style="touch-action: none; overflow: hidden;"
        >
        	<view class="miui-keypad">
        		<view class="miui-key-row" v-for="(row, rowIndex) in keys" :key="rowIndex">
        			<view
        				class="miui-key"
        				v-for="key in row"
        				:key="key.main"
        				@click="pressKey(key.main)"
        			>
        				<text class="miui-key-main">{{ key.main }}</text>
        				<template v-if="key.main === '1'">
        					<image src="/static/icons/yyxx.svg" class="miui-key-img" />
        				</template>
        				<text class="miui-key-sub" v-else-if="key.sub">{{ key.sub }}</text>
        			</view>
        		</view>
        	</view>
        </view>

        <view class="bottom-actions">
          <view class="action-item" @click="toggleButton(6)">
            <image :src="buttons[6].isActive ? buttons[6].activeIcon : buttons[6].icon" class="action-icon" />
            <text class="action-text">{{ buttons[6].text }}</text>
          </view>
		  <view class="call-end-btn" @click="endCall">
		    <image src="/static/icons/end-call.png" class="end-icon" />
		  </view>
          <view class="action-item" @click="toggleButton(7)">
            <image :src="buttons[7].isActive ? buttons[7].activeIcon : buttons[7].icon" class="action-icon" />
            <text class="action-text">{{ buttons[7].text }}</text>
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
				location: '中国联通',
				status: '正在拨号...',
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
				fromCallBack: false, // 添加标识是否从 call-back 跳转过来的标志
				internalStatus: '', // 添加内部状态变量
				hasPlayedEndMusic: false, // 添加标志来跟踪是否已经播放过结束音乐
				// Placeholder for the actual call audio player instance
				callAudioPlayer: null,
				// Use plus.audio.Player for ringtone to control route
				ringtonePlayer: null,
				ringtoneContext: null, // Revert to ringtoneContext
				navigateBackTimeout: null, // Added for navigation timeout handling
				endMusicPlayCount: 0, // Add counter for end call music plays
		  }
		},
		computed: {
			// 添加计算属性，根据 fromCallBack 决定显示什么
			displayStatus() {
				if (this.fromCallBack) {
					// 如果是从 call-back 跳转过来的，只显示计时器
					return this.status;
				} else {
					// 否则显示内部状态
					return this.internalStatus;
				}
		  }
		},
		onLoad(options) {
		    // Create audio context
		    this.audioContext = uni.createInnerAudioContext();
		    this.audioContext.onError((res) => {
		      console.error('Audio Error:', res.errMsg);
		    });

		    // Create ringtone context
		    this.ringtoneContext = uni.createInnerAudioContext();
		    this.ringtoneContext.onEnded(() => {
		        console.log('Ringtone finished playing, looping.');
		        // 当铃声播放结束时，重新播放同一首铃声
		        if (this.selectedRingtone && this.ringtoneContext) {
		            this.ringtoneContext.src = this.selectedRingtone;
		            this.ringtoneContext.play();
		        }
		    });
		    this.ringtoneContext.onError((res) => {
		        console.error('Ringtone Error:', res.errMsg);
		    });
		    console.log('Successfully created uni.createInnerAudioContext for ringtone.');

		    // Create end call music context
		    this.endCallContext = uni.createInnerAudioContext();
		    this.endCallContext.onError((res) => {
		        console.error('End Call Music Error:', res.errMsg);
		    });

		    // Read number and location from navigation options
		    let originalNumber = '';
		    let originalLocation = '';

		    if (options.number) {
		      originalNumber = options.number;
		      this.number = this.formatPhoneNumber(originalNumber); // Display formatted original number initially
		    }
		    if (options.location) {
		        originalLocation = decodeURIComponent(options.location);
		        this.location = originalLocation; // Display original location initially
		    }
		    
            // After setting initial values, check for contact
            if (originalNumber) {
                 this.checkContactAndDisplay(originalNumber, originalLocation);
            }

		    if (options.callId) {
		        this.callId = options.callId;
		        // 检查是否从 call-back 跳转过来
		        this.fromCallBack = options.fromCallBack === 'true';
		        if (this.fromCallBack) {
		            // 如果是从 call-back 跳转过来的，立即开始计时
		            this.status = '00:00';
		            this.startDurationTimer();
		        }
		        // 开始轮询通话状态
		        this.startPolling();
		    }
		    // 设置初始状态
		    if (options.initialStatus) {
		        this.status = decodeURIComponent(options.initialStatus);
		        this.internalStatus = this.status;
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
			
			// --- 尝试创建 plus.audio.Player 实例用于演示和测试 setRoute --- 
			// 重要的提醒：这个实例不会自动连接到您的实际通话音频流。
			// 它仅用于验证 plus.audio.Player 和 setRoute API 的可用性。
			if (typeof plus !== 'undefined' && plus.audio && plus.audio.createPlayer) {
			}
			// --- 结束创建 plus.audio.Player 实例 --- 
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
					this.internalStatus = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
				}
			},
			
		  toggleButton(index) {
		    if (this.buttons[index].activeIcon) {
		      this.buttons[index].isActive = !this.buttons[index].isActive;
          if (index === 6) {
            this.showKeypad = !this.showKeypad;
          }
          // 处理扬声器切换，控制按钮状态和音量
          if (index === 7) {
            if (this.ringtonePlayer) {
                // 使用 plus.audio.Player 时可以设置更高音量
                this.ringtonePlayer.volume = this.buttons[index].isActive ? 2.0 : 0.3;
                console.log('Speaker button toggled, plus.audio.Player volume set to:', this.ringtonePlayer.volume);
            } else if (this.ringtoneContext) {
                // 回退到 uni.createInnerAudioContext
                this.ringtoneContext.volume = this.buttons[index].isActive ? 1.0 : 0.2;
                console.log('Speaker button toggled, uni.createInnerAudioContext volume set to:', this.ringtoneContext.volume);
            }
          }
		    }
		  },
		  pressKey(key) {
			this.keypadInput += key;
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
			  // 每1秒查询一次通话状态
			  this.pollTimer = setInterval(() => {
				  this.checkCallStatus();
			  }, 1000);
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
		              
		              // 立即更新状态，不等待switch语句
		              if (status === 'connected' && !this.durationTimer) {
		                  console.log('Call connected, starting timer');
		                  this.internalStatus = '00:00';
		                  this.startDurationTimer();
		              }
		              
		              switch (status) {
		                  case 'ringing':
		                      this.internalStatus = '正在等待对方接听...';
		                      break;
		                  case 'connected':
		                      this.stopRingtone();
		                      break;
		                  case 'failed':
		                      console.log('Call failed');
		                      this.internalStatus = '无法接通';
		                      if (this.durationTimer) {
		                          clearInterval(this.durationTimer);
		                          this.durationTimer = null;
		                      }
		                          uni.navigateBack();
		                      break;
		                  case 'canceled':
		                      console.log('Call ended with status: canceled');
		                      this.internalStatus = '已取消';
		                      this.stopRingtone();
		                      if (this.durationTimer) {
		                          clearInterval(this.durationTimer);
		                          this.durationTimer = null;
		                      }
		                      
		                      uni.$emit('callEnded');
		                      break;
						  case 'weijie':
		                      console.log('Call ended with status: canceled');
		                      this.internalStatus = '呼叫已转移';
		                      this.stopRingtone();
		                      if (this.durationTimer) {
		                          clearInterval(this.durationTimer);
		                          this.durationTimer = null;
		                      }
		                      
		                      // 只在第一次检测到 canceled 状态时播放结束音乐
		                      if (!this.hasPlayedEndMusic) {
		                          this.hasPlayedEndMusic = true;
		                          this.playEndCallMusic(status);
		                      }
		                      uni.$emit('callEnded');
		                      break;
						  case 'guaduan':
		                      console.log('Call ended with status: canceled');
		                      this.internalStatus = '呼叫已转移';
		                      this.stopRingtone();
		                      if (this.durationTimer) {
		                          clearInterval(this.durationTimer);
		                          this.durationTimer = null;
		                      }
		                      
		                      // 只在第一次检测到 canceled 状态时播放结束音乐
		                      if (!this.hasPlayedEndMusic) {
		                          this.hasPlayedEndMusic = true;
		                          this.playEndCallMusic(status);
		                      }
		                      uni.$emit('callEnded');
		                      break;
		                  case 'disconnected':
		                      console.log('Call disconnected');
		                      this.internalStatus = '通话已结束';
								  this.stopPolling();
								  if (this.durationTimer) {
									  clearInterval(this.durationTimer);
									  this.durationTimer = null;
								  }
		                      this.stopRingtone();
		                      uni.$emit('callEnded');
									  uni.navigateBack();
								  break;
		                  default:
							console.log('Call ended with status:', status);
		                      this.internalStatus = '通话已结束';
							this.stopPolling();
							if (this.durationTimer) {
								clearInterval(this.durationTimer);
								this.durationTimer = null;
							}
		                      this.stopRingtone();
		                      uni.$emit('callEnded');
								uni.navigateBack();
							break;
		              }
		          }
		      } catch (error) {
		          console.error('Failed to check call status:', error);
		      }
		  },
		  endCall() {
			console.log('endCall called');

			// 如果有 callId，发送挂断请求
			if (this.callId) {
				console.log('Sending hangup request for callId:', this.callId);
				uni.request({
					url: 'http://106.53.30.150:9097/api/hangup',
					method: 'POST',
					data: {
						callId: this.callId,
						action: "hangup"
					},
					success: (res) => {
						console.log('Hangup response:', res);
						// 后端更新状态后，会通过轮询在 checkCallStatus 中处理后续逻辑 (播放音乐和跳转)
						// 这里不需要立即导航或播放音乐、
						uni.navigateBack();
						console.log('Hangup request successful. Waiting for status update from polling.');
					},
					fail: (err) => {
						console.error('Failed to hangup call:', err);
						uni.showToast({
							title: '挂断失败',
							icon: 'none'
						});
						// 挂断请求失败，可能导致状态无法更新，直接进行结束处理
                         console.log('Hangup request failed, proceeding with end call logic.');
                         // Pass a dummy status like 'failed' or 'unknown' if you don't have the final status
                         // Or better, just navigate back without specific end music if the request failed
                        this.navigateBackAfterEnd();
					}
				});
			} else {
				// 如果没有 callId (说明是未发起的呼叫)，直接返回
				console.log('No callId, navigating back.');
				this.navigateBackAfterEnd();
			}
		  },
		  playRandomRingtone() {
		    console.log('playRandomRingtone called');
		    // Use ringtoneContext instead of ringtonePlayer
		    if (!this.ringtoneContext) {
		        console.warn('ringtoneContext not available, cannot play ringtone.');
		        return;
		    }
		    
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
		    this.ringtoneContext.volume = this.buttons[7].isActive ? 1.0 : 0.2;
		    this.ringtoneContext.play();
		    console.log('Attempting to play ringtone:', this.selectedRingtone, 'with volume:', this.ringtoneContext.volume);
		  },
		  
		  stopRingtone() {
		    // Use ringtoneContext instead of ringtonePlayer
		    if (this.ringtoneContext) {
		      this.ringtoneContext.stop();
		      // 重置选中的铃声，这样下次呼叫时会重新随机选择
		      this.selectedRingtone = null;
               console.log('Ringtone stopped.');
		    }
		  },
		  playEndCallMusic(status) {
		    console.log('playEndCallMusic called');
			console.log(status);
			
		    // 随机选择一首结束音乐
		    const randomIndex = Math.floor(Math.random() * this.endCallMusicList.length);
			if (status === 'guaduan') {
				console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
				const endMusic = '/static/audio/end-call1.mp3';
				console.log('Playing end call music:', endMusic);
		    	this.endCallContext.src = endMusic;
				console.log('Playing end call music:', endMusic);
				this.endCallContext.src = endMusic;
				
				// // 根据选择的音乐设置不同的跳转时间
				// const delayTime = endMusic.includes('end-call1') ? 6000 : 8500;
				
				// 添加播放结束事件监听
				this.endCallContext.onEnded(() => {
					console.log('End call music finished playing');
					// 在返回前触发清空事件
					uni.$emit('clearDialInput');
					// 使用 redirectTo 而不是 navigateBack，确保完全返回
					uni.navigateBack()
				});
				
				// 设置定时器，在指定时间后跳转（作为备份，以防音乐播放出现问题）
						setTimeout(() => {
					if (this.endCallContext) {
						this.endCallContext.stop();
					}
					// 在返回前触发清空事件
					uni.$emit('clearDialInput');
					// 使用 redirectTo 而不是 navigateBack，确保完全返回
					uni.navigateBack()
				}, 3000);
				
				// 播放音乐
				this.endCallContext.play();
			}else if (status === 'weijie') {
				const endMusic = '/static/audio/end-call2.mp3';
				console.log('Playing end call music:', endMusic);
		    	this.endCallContext.src = endMusic;
				console.log('Playing end call music:', endMusic);
				this.endCallContext.src = endMusic;
				
				// // 根据选择的音乐设置不同的跳转时间
				// const delayTime = endMusic.includes('end-call1') ? 6000 : 8500;
				
				// 添加播放结束事件监听
				this.endCallContext.onEnded(() => {
					console.log('End call music finished playing');
					// 在返回前触发清空事件
					uni.$emit('clearDialInput');
					// 使用 redirectTo 而不是 navigateBack，确保完全返回
					this.endCallContext.play();
				});
				
				// 设置定时器，在指定时间后跳转（作为备份，以防音乐播放出现问题）
						setTimeout(() => {
					if (this.endCallContext) {
						this.endCallContext.stop();
					}
					// 在返回前触发清空事件
					uni.$emit('clearDialInput');
					// 使用 redirectTo 而不是 navigateBack，确保完全返回
					uni.navigateBack()
				}, 27000);
				
				// 播放音乐
				this.endCallContext.play();
			}
		    
		  },
		  async checkContactAndDisplay(number, defaultLocation) {
		    console.log('checkContactAndDisplay: Processing number:', number);
		    const cleanedNumber = number.replace(/\s/g, '');
		    if (!cleanedNumber || !this.userId) {
		        console.log('checkContactAndDisplay: Invalid number or userId. Using original display.');
		         // Ensure original number/location are displayed if check cannot be performed
		        this.number = this.formatPhoneNumber(number); // Set to formatted original number
		        this.location = defaultLocation || '未知位置'; // Set to original location or default
		        return;
		    }
		    try {
		        // Use POST method for the contact API as per server.py
		        const apiUrl = `http://106.53.30.150:9097/api/contact`;
		        console.log('checkContactAndDisplay: Calling API:', apiUrl, 'with phone:', cleanedNumber, 'and userId:', this.userId);
		        const res = await uni.request({
		            url: apiUrl,
		            method: 'POST', // Corrected to POST
		            data: {
		                phone: cleanedNumber,
		                userId: this.userId
		            }
		        });
		        console.log('checkContactAndDisplay: API response:', res);

		        if (res.statusCode === 200 && res.data && res.data.code === 0 && res.data.data) {
		            // Contact found, update display number to name and location to phone
		            console.log('checkContactAndDisplay: Contact found. Updating display.');
		            this.number = res.data.data.name;  // Display name
		            this.location = this.formatPhoneNumber(res.data.data.phone);  // Display formatted phone number
		            console.log('checkContactAndDisplay: Updated display number to:', this.number, 'location to:', this.location);
		        } else {
		            // Contact not found or API returned error/no data
		            console.log('checkContactAndDisplay: Contact not found or API issue. Keeping original display.');
		             // Keep the original number and location if contact not found
		            this.number = this.formatPhoneNumber(number); // Keep formatted original number
		            this.location = defaultLocation || '未知位置'; // Keep original location or default
		        }
		    } catch (error) {
		        console.error('checkContactAndDisplay: Failed to check contact API:', error);
		         // On API failure, keep the original number and location
		        this.number = this.formatPhoneNumber(number); // Keep formatted original number
		        this.location = defaultLocation || '未知位置'; // Keep original location or default
		    }
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
            // Helper method to get current date in YYYY-MM-DD format
            getCurrentDateString() {
                const now = new Date();
                const year = now.getFullYear();
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const day = now.getDate().toString().padStart(2, '0');
				return `${year}-${month}-${day}`;
            },
            // Helper to get display text for status (reuse from call-details if available, or define here)
            getStatusText(status) {
               const statusMap = {
                   'ringing': '正在等待对方接听...',
                   'connected': this.internalStatus, // Connected status text comes from timer
                   'completed': '通话已结束',
                   'failed': '呼叫失败',
                   'no_answer': '对方无应答',
                   'canceled': '呼叫已取消',
                   'disconnected': '通话已断开',
                   'weijie': '呼叫已转移',
                   'guaduan': '呼叫已转移',
                   // Add other potential statuses from backend if needed
               };
               return statusMap[status] || status;
            },
            // Stop duration timer helper
            stopDurationTimer(){
                if (this.durationTimer) {
                    clearInterval(this.durationTimer);
                    this.durationTimer = null;
                    console.log('Duration timer stopped.');
                }
            }
		},
		onUnload() {
			// 清理计时器和轮询
			this.stopDurationTimer();
			this.stopPolling();
		    // Destroy audio contexts when page is closed
		    if (this.audioContext) {
		      this.audioContext.destroy();
		      this.audioContext = null;
		    }
		    if (this.ringtoneContext) {
                console.log('Attempting to destroy ringtoneContext instance.');
                try {
                    this.ringtoneContext.destroy();
                } catch (error) {
                     console.error('Error destroying ringtoneContext:', error);
                }
                this.ringtoneContext = null;
            }
		    if (this.endCallContext) {
			  this.endCallContext.destroy();
			  this.endCallContext = null;
			}
			// Destroy call audio player instance if it exists
			if (this.callAudioPlayer) {
			  console.log('Cleaning up callAudioPlayer instance.');
			  this.callAudioPlayer = null;
			}
		    // 停止铃声轮询
		    this.stopRingtonePolling();
            // Clear any pending navigation timeout
            if (this.navigateBackTimeout) {
                clearTimeout(this.navigateBackTimeout);
                this.navigateBackTimeout = null;
                console.log('Cleared navigation timeout in onUnload.');
            }
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
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 60rpx 40rpx;
    width: 90vw;
    margin: 390rpx 0rpx 0rpx 0rpx;
  }
  .bottom-actions {
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 90vw;
    position: absolute;
    bottom: 50rpx;
    left: 5vw;
    right: 5vw;
	margin-bottom: 175rpx;
  }
  .action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
	margin-bottom: 0rpx;
  }
  .action-icon {
    width: 60rpx;
    height: 60rpx;
    margin-bottom: 20rpx;
  }
  .action-text {
    color: #fff;
    font-size: 24rpx;
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

  /* Removed specific styling for the last row */
</style>



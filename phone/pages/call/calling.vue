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
	// `u7746-wallpaper` 仅支持 App-Android，H5 下回退默认背景。
	// #ifdef APP-PLUS
	import u7746wallpaper from '@/uni_modules/u7746-wallpaper';
	// #endif
	import Logger from '@/utils/logger.js'
	import { phoneApi } from '@/utils/api';
	export default {
		data() {
			return {
				imgUrl: '',
				number: '186 8828 2571',
				location: '未知',
				status: '正在拨号...',
				ringtoneContext: null,
				endCallContext: null,
				endCallMusicList: [
					'/static/audio/end-call1.mp3',
					'/static/audio/end-call2.mp3'
				],
				ringtoneList: [
					'/static/audio/ringtone21.mp3',
					'/static/audio/ringtone22.mp3',
					'/static/audio/ringtone23.mp3',
					'/static/audio/ringtone24.mp3',
					'/static/audio/ringtone25.mp3',
					'/static/audio/ringtone26.mp3',
					'/static/audio/ringtone27.mp3',
					'/static/audio/ringtone28.mp3',
					'/static/audio/ringtone29.mp3',
					'/static/audio/ringtone30.mp3',
					'/static/audio/ringtone31.mp3',
					'/static/audio/ringtone32.mp3',
					'/static/audio/ringtone33.mp3',
					'/static/audio/ringtone34.mp3',
					'/static/audio/ringtone35.mp3',
					'/static/audio/ringtone36.mp3',
					'/static/audio/ringtone37.mp3',
					'/static/audio/ringtone38.mp3',
					'/static/audio/ringtone39.mp3',
					'/static/audio/ringtone40.mp3',
					'/static/audio/ringtone41.mp3',
					'/static/audio/ringtone42.mp3',
					'/static/audio/ringtone43.mp3',
					'/static/audio/ringtone44.mp3',
					'/static/audio/ringtone45.mp3',
					'/static/audio/ringtone46.mp3',
					'/static/audio/ringtone47.mp3',
					'/static/audio/ringtone48.mp3',
					'/static/audio/ringtone49.mp3',
					'/static/audio/ringtone50.mp3',
					'/static/audio/ringtone51.mp3',
					'/static/audio/ringtone52.mp3',
					'/static/audio/ringtone53.mp3',
					'/static/audio/ringtone54.mp3',
					'/static/audio/ringtone55.mp3',
					'/static/audio/ringtone56.mp3',
					'/static/audio/ringtone57.mp3',
					'/static/audio/ringtone58.mp3',
					'/static/audio/ringtone59.mp3',
					'/static/audio/ringtone60.mp3',
					'/static/audio/ringtone61.mp3',
					'/static/audio/ringtone62.mp3',
					'/static/audio/ringtone63.mp3',
					'/static/audio/ringtone64.mp3',
					'/static/audio/ringtone65.mp3',
					'/static/audio/ringtone66.mp3',
					'/static/audio/ringtone67.mp3',
					'/static/audio/ringtone68.mp3',
					'/static/audio/ringtone69.mp3',
					'/static/audio/ringtone70.mp3',
					'/static/audio/ringtone71.mp3',
					'/static/audio/ringtone72.mp3',
					'/static/audio/ringtone73.mp3',
					'/static/audio/ringtone74.mp3',
					'/static/audio/ringtone75.mp3',
					'/static/audio/ringtone76.mp3',
					'/static/audio/ringtone77.mp3',
					'/static/audio/ringtone78.mp3',
					'/static/audio/ringtone79.mp3',
					'/static/audio/ringtone80.mp3',
					'/static/audio/ringtone81.mp3',
					'/static/audio/ringtone82.mp3',
					'/static/audio/ringtone83.mp3',
					'/static/audio/ringtone84.mp3',
					'/static/audio/ringtone85.mp3',
					'/static/audio/ringtone86.mp3',
					'/static/audio/ringtone87.mp3',
					'/static/audio/ringtone88.mp3',
					'/static/audio/ringtone89.mp3',
					'/static/audio/ringtone90.mp3',
					'/static/audio/ringtone91.mp3',
					'/static/audio/ringtone92.mp3',
					'/static/audio/ringtone93.mp3',
					'/static/audio/ringtone94.mp3',
					'/static/audio/ringtone95.mp3',
					'/static/audio/ringtone96.mp3',
					'/static/audio/ringtone97.mp3',
					'/static/audio/ringtone98.mp3',
					'/static/audio/ringtone99.mp3',
					'/static/audio/ringtone100.mp3',
					'/static/audio/ringtone101.mp3',
					'/static/audio/ringtone102.mp3',
					'/static/audio/ringtone103.mp3',
					'/static/audio/ringtone104.mp3',
					'/static/audio/ringtone105.mp3',
					'/static/audio/ringtone106.mp3',
					'/static/audio/ringtone107.mp3',
					'/static/audio/ringtone108.mp3',
					'/static/audio/ringtone109.mp3',
					'/static/audio/ringtone110.mp3',
					'/static/audio/ringtone111.mp3',
					'/static/audio/ringtone112.mp3',
					'/static/audio/ringtone113.mp3',
					'/static/audio/ringtone114.mp3',
					'/static/audio/ringtone115.mp3',
					'/static/audio/ringtone116.mp3',
					'/static/audio/ringtone117.mp3',
					'/static/audio/ringtone118.mp3',
					'/static/audio/ringtone119.mp3',
					'/static/audio/ringtone120.mp3',
					'/static/audio/ringtone121.mp3',
					'/static/audio/ringtone122.mp3',
					'/static/audio/ringtone123.mp3',
					'/static/audio/ringtone124.mp3',
					'/static/audio/ringtone125.mp3',
					'/static/audio/ringtone126.mp3',
					'/static/audio/ringtone127.mp3',
					'/static/audio/ringtone128.mp3',
					'/static/audio/ringtone129.mp3',
					'/static/audio/ringtone130.mp3',
					'/static/audio/ringtone131.mp3',
					'/static/audio/ringtone132.mp3',
					'/static/audio/ringtone133.mp3',
					'/static/audio/ringtone134.mp3',
					'/static/audio/ringtone135.mp3',
					'/static/audio/ringtone136.mp3',
					'/static/audio/ringtone137.mp3',
					'/static/audio/ringtone138.mp3',
					'/static/audio/ringtone139.mp3',
					'/static/audio/ringtone140.mp3',
					'/static/audio/ringtone141.mp3',
					'/static/audio/ringtone142.mp3',
					'/static/audio/ringtone143.mp3',
					'/static/audio/ringtone144.mp3',
					'/static/audio/ringtone145.mp3',
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
				ringtonePlayCount: 0, // 添加铃声播放次数计数器
				maxRingtonePlays: 2, // 最大播放次数
				ringtoneTimeout: null, // 添加铃声超时定时器
				ringtoneStartTime: null, // 添加铃声开始时间
				maxRingtoneDuration: 96, // 最大播放时长（秒）
				ringtoneDurationTimer: null, // 添加铃声时长计时器
				hasSentHangup: false, // 防止重复发送挂断请求
				unknownStatusNotified: false, // 未知状态提示防抖
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
		    // 获取传入的参数
		    this.number = options.number || '';
		    this.location = decodeURIComponent(options.location || '');
		    this.initialStatus = options.initialStatus || '正在拨号...';
		    this.callId = options.callId || '';
		    this.dialerUserId = options.dialerUserId || '';
		    this.markType = options.markType || '';
		    
		    // 设置初始状态
		    this.status = this.initialStatus;
		    
		    // 延迟3秒后预加载通话记录
		    setTimeout(() => {
		        this.preloadCallRecords();
		    }, 3000);

		    // Create audio context
		    this.audioContext = uni.createInnerAudioContext();
		    this.audioContext.onError((res) => {
		      console.error('Audio Error:', res.errMsg);
		    });

		    // Create ringtone context
		    this.ringtoneContext = uni.createInnerAudioContext();
		    this.ringtoneContext.onEnded(() => {
		        console.log('Ringtone finished playing, checking duration.');
		        // 检查是否达到最大播放时长
		        const currentTime = Math.floor(Date.now() / 1000);
		        const elapsedTime = currentTime - this.ringtoneStartTime;
		        
		        if (elapsedTime >= this.maxRingtoneDuration) {
		            console.log('Maximum duration reached, stopping playback.');
		            this.stopRingtoneAndNavigate();
		        } else {
		            // 如果还没到最大时长，继续播放
		            if (this.ringtoneContext) {
		                this.ringtoneContext.src = this.selectedRingtone;
		                this.ringtoneContext.play();
		            }
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
		            console.log('From call-back page, starting timer immediately');
		            this.status = '00:00';
		            this.internalStatus = '00:00';
		            this.callDuration = 0;  // 重置计时器
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

		    // 使用预加载的背景图片
		    const cachedBg = uni.getStorageSync('cached_background');
		    const cacheTime = uni.getStorageSync('background_cache_time');
		    const now = Date.now();
		    
		    // 如果缓存存在且未过期（24小时内的缓存）
		    if (cachedBg && cacheTime && (now - cacheTime < 24 * 60 * 60 * 1000)) {
		        this.imgUrl = cachedBg;
		        console.log('Using cached background image');
		    } else {
		        // 缓存不存在或已过期，重新获取
		        this.imgUrl = '/static/images/bg.jpg';
		        // #ifdef APP-PLUS
		        const ret = u7746wallpaper.getBackground('test.png');
		        if (ret.code === "1") {
		            this.imgUrl = ret.msg;
		            // 更新缓存
		            uni.setStorageSync('cached_background', ret.msg);
		            uni.setStorageSync('background_cache_time', now);
		            console.log('Updated background image cache');
		        } else {
		            console.log('Using default background image');
		        }
		        // #endif
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
				console.log('Starting duration timer');
				if (this.durationTimer) {
					clearInterval(this.durationTimer);
				}
				this.callDuration = 0;  // 确保从0开始计时
				this.durationTimer = setInterval(() => {
					this.callDuration++;
					this.updateCallStatus();
					console.log('Timer tick:', this.callDuration, 'Current status:', this.internalStatus);
				}, 1000);
			},
			
			updateCallStatus() {
				if (this.callDuration >= 0) {  // 修改条件，允许从0开始更新
					const minutes = Math.floor(this.callDuration / 60);
					const seconds = this.callDuration % 60;
					const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
					console.log('Updating status to:', timeString);
					this.status = timeString;
					this.internalStatus = timeString;
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
					  url: phoneApi('/api/dial'),
					  method: 'POST',
					  data: {
						  number: this.number.replace(/\s/g, ''),
						  dialerUserId: this.userId,
						  targetUserId: this.userId,
						  location: this.location
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
							  Logger.log('navigate', { reason: 'dial_request_failed', status: this.internalStatus, callId: this.callId, serverMsg: res.data?.msg });
							  console.log('Navigate due to dial_request_failed', { reason: 'dial_request_failed', status: this.internalStatus, callId: this.callId, serverMsg: res.data?.msg });
							  uni.switchTab({
								url: '/pages/dial/dial'
							  });
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
					  Logger.log('navigate', { reason: 'dial_request_network_error', status: this.internalStatus, callId: this.callId });
					  console.log('Navigate due to dial_request_network_error', { reason: 'dial_request_network_error', status: this.internalStatus, callId: this.callId });
					  uni.switchTab({
						url: '/pages/dial/dial'
					  });
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
		              
		              // 如果状态发生变化，先停止铃声和轮询
		              if (status !== 'ringing' && this.isPlayingRingtone) {
		                  console.log('Status changed from ringing, stopping ringtone');
		                  this.stopRingtone();
		                  this.stopRingtonePolling();
		              }
		              
		              switch (status) {
		                  case 'ringing':
		                      this.internalStatus = '正在等待对方接听...';
		                      // 只在 ringing 状态下检查铃声状态
		                      this.checkRingtoneStatus();
		                      break;
		                  case 'connected':
		                      if (!this.durationTimer) {
		                          console.log('Call connected, starting timer');
		                          this.internalStatus = '00:00';
		                          this.startDurationTimer();
		                          
		                          // 更新铃声状态为 false
		                          try {
		                              const ringtoneRes = await uni.request({
		                                  url: phoneApi('/api/ringtone-status'),
		                                  method: 'POST',
		                                  data: {
		                                      userId: this.userId,
		                                      isPlaying: false
		                                  }
		                              });
		                              
		                              if (ringtoneRes.statusCode === 200 && ringtoneRes.data && ringtoneRes.data.code === 0) {
		                                  console.log('Successfully updated ringtone status to false for connected call');
		                              } else {
		                                  console.error('Failed to update ringtone status for connected call');
		                              }
		                          } catch (error) {
		                              console.error('Error updating ringtone status for connected call:', error);
		                          }
		                      }
		                      break;
		                  case 'failed':
		                      console.log('Call failed');
		                      this.internalStatus = '无法接通';
		                      if (this.durationTimer) {
		                          clearInterval(this.durationTimer);
		                          this.durationTimer = null;
		                      }
		                      console.log('Navigate due to call_status_failed', { reason: 'call_status_failed', status: this.internalStatus, callId: this.callId });
		                      uni.switchTab({
							url: '/pages/dial/dial'
						  });
		                      break;
		                  case 'canceled':
		                      console.log('Call ended with status: canceled');
		                      this.internalStatus = '已取消';
		                      if (this.durationTimer) {
		                          clearInterval(this.durationTimer);
		                          this.durationTimer = null;
		                      }
		                      
		                      uni.$emit('callEnded');
		                      console.log('Navigate due to call_status_canceled', { reason: 'call_status_canceled', status: this.internalStatus, callId: this.callId });
		                      uni.switchTab({
							url: '/pages/dial/dial'
						  });
		                      break;
						  case 'weijie':
						  case 'guaduan':
							  console.log('Call ended with status:', status);
							  
							  if (this.durationTimer) {
							  clearInterval(this.durationTimer);
							  this.durationTimer = null;
						  }
							  
						  // 只在第一次检测到状态时播放结束音乐
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
							  uni.$emit('callEnded');
							  console.log('Navigate due to call_status_disconnected', { reason: 'call_status_disconnected', status: this.internalStatus, callId: this.callId });
							  uni.switchTab({
								url: '/pages/dial/dial'
							  });
							  break;
						  default:
							console.warn('Unknown backend call status, will not navigate', { backendStatus: status, callId: this.callId });
							if (!this.unknownStatusNotified) {
								this.unknownStatusNotified = true;
								uni.showToast({ title: `未知状态：${status}`, icon: 'none' });
							}
							break;
		              }
		          }
		      } catch (error) {
		          console.error('Failed to check call status:', error);
		      }
		  },
		  // 新增：发送挂断请求的方法
		  async sendHangupRequest() {
		      if (!this.callId) {
		          console.log('No callId, skipping hangup request.');
		          return;
		      }
		      if (this.hasSentHangup) {
		          console.log('Hangup already sent, skipping duplicate request.');
		          return;
		      }
		      this.hasSentHangup = true;
		      try {
		          console.log('Sending background hangup request for callId:', this.callId);
		          const res = await uni.request({
		              url: phoneApi('/api/hangup'),
		              method: 'POST',
		              data: {
		                  callId: this.callId,
		                  action: "hangup"
		              }
		          });
		          console.log('Background hangup response:', res);
		          if (res.statusCode === 200 && res.data && res.data.code === 0) {
		              console.log('Background hangup successful.');
		          } else {
		              console.error('Background hangup failed:', res.data?.msg || 'Unknown error');
		          }
		      } catch (error) {
		          console.error('Error sending background hangup request:', error);
		      }
		  },
		  endCall() {
			console.log('endCall called');

			// 如果有 callId，发送挂断请求
			if (this.callId) {
				console.log('Sending hangup request for callId:', this.callId);
				this.sendHangupRequest(); // 调用新的挂断方法
				uni.$emit('clearDialInput');
				Logger.log('navigate', { reason: 'user_end_call', status: this.internalStatus, callId: this.callId });
				console.log('Navigate due to user_end_call', { reason: 'user_end_call', status: this.internalStatus, callId: this.callId });
				uni.switchTab({
					url: '/pages/dial/dial'
				});
				console.log('Hangup request initiated. Switching to dial page.');
			} else {
				// 如果没有 callId (说明是未发起的呼叫)，直接跳转到拨号页面
				console.log('No callId, switching to dial page.');
				uni.switchTab({
					url: '/pages/dial/dial'
				});
			}
		  },
		  async stopRingtoneAndNavigate() {
		        // 停止铃声
		        if (this.ringtoneContext) {
		            this.ringtoneContext.stop();
		            this.selectedRingtone = null;
		        }
		        
		        // 清除所有定时器
		        if (this.ringtoneDurationTimer) {
		            clearInterval(this.ringtoneDurationTimer);
		            this.ringtoneDurationTimer = null;
		        }
		        if (this.ringtoneTimeout) {
		            clearTimeout(this.ringtoneTimeout);
		            this.ringtoneTimeout = null;
		        }
		        
		        // 重置开始时间
		        this.ringtoneStartTime = null;
		        
		        // 更新服务器状态
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
		                console.log('Successfully updated ringtone status to false');
		            } else {
		                console.error('Failed to update ringtone status');
		            }
		        } catch (error) {
		            console.error('Error updating ringtone status:', error);
		        }

		        // 发送挂断请求（防重入）
		        await this.sendHangupRequest();
		        
		        // 触发清空事件并跳转到拨号页面
		        uni.$emit('clearDialInput');
		        Logger.log('navigate', { reason: 'ringtone_timeout', status: this.internalStatus, callId: this.callId });
		        console.log('Navigate due to ringtone_timeout', { reason: 'ringtone_timeout', status: this.internalStatus, callId: this.callId });
		        uni.switchTab({
				url: '/pages/dial/dial'
			});
		    },
		  async playRandomRingtone() {
		    console.log('playRandomRingtone called');
		    if (!this.ringtoneContext) {
		        console.warn('ringtoneContext not available, cannot play ringtone.');
		        return;
		    }

		    // 如果已经开始播放，检查是否超过最大时长
		    if (this.ringtoneStartTime) {
		        const currentTime = Math.floor(Date.now() / 1000);
		        const elapsedTime = currentTime - this.ringtoneStartTime;
		        
		        if (elapsedTime >= this.maxRingtoneDuration) {
		            console.log('Maximum ringtone duration reached, stopping playback');
		            await this.stopRingtoneAndNavigate();
		            return;
		        }
		    } else {
		        // 记录开始播放时间
		        this.ringtoneStartTime = Math.floor(Date.now() / 1000);
		        console.log('Starting ringtone playback timer');
		    }
		    
		    const cleanedNumber = this.number.replace(/\s/g, '');
		    const todayString = this.getCurrentDateString();
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
		    
		    // 添加通知服务器的逻辑
		    try {
		        const res = await uni.request({
		            url: phoneApi('/api/ringtone-status'),
		            method: 'POST',
		            data: {
		                userId: this.userId,
		                isPlaying: true
		            }
		        });
		        
		        if (res.statusCode === 200 && res.data && res.data.code === 0) {
		            console.log('Successfully updated ringtone status on server');
		        } else {
		            console.error('Failed to update ringtone status:', error);
		        }
		    } catch (error) {
		        console.error('Error updating ringtone status:', error);
		    }

		    // 设置铃声时长检查定时器
		    if (!this.ringtoneDurationTimer) {
		        this.ringtoneDurationTimer = setInterval(async () => {
		            const currentTime = Math.floor(Date.now() / 1000);
		            const elapsedTime = currentTime - this.ringtoneStartTime;
		            
		            if (elapsedTime >= this.maxRingtoneDuration) {
		                console.log('Maximum ringtone duration reached via timer, stopping playback');
		                await this.stopRingtoneAndNavigate();
		            }
		        }, 1000); // 每秒检查一次
		    }
		  },
		  playEndCallMusic(status) {
		    console.log('playEndCallMusic called');
		    console.log(status);
		    
		    if (status === 'guaduan') {
		        console.log('Call transferred, switching to dial page');
		        // 在跳转前触发清空事件
		        uni.$emit('clearDialInput');
		        Logger.log('navigate', { reason: 'call_status_guaduan', status: this.internalStatus, callId: this.callId });
		        console.log('Navigate due to call_status_guaduan', { reason: 'call_status_guaduan', status: this.internalStatus, callId: this.callId });
		        // 直接跳转到拨号页面
		        uni.switchTab({
				url: '/pages/dial/dial'
			});
		    } else if (status === 'weijie') {
		        const endMusic = '/static/audio/end-call2.mp3';
		        console.log('Playing end call music:', endMusic);
		        this.endCallContext.src = endMusic;
		        console.log('Playing end call music:', endMusic);
		        this.endCallContext.src = endMusic;
		        
		        // 添加播放结束事件监听
		        this.endCallContext.onEnded(() => {
		            console.log('End call music finished playing');
		            // 在跳转前触发清空事件
		            uni.$emit('clearDialInput');
		            Logger.log('navigate', { reason: 'end_music_finished', status: this.internalStatus, callId: this.callId });
		            console.log('Navigate due to end_music_finished', { reason: 'end_music_finished', status: this.internalStatus, callId: this.callId });
		            // 跳转到拨号页面
		            uni.switchTab({
					url: '/pages/dial/dial'
				});
		        });
		        
		        // 设置定时器，在指定时间后跳转（作为备份，以防音乐播放出现问题）
		        setTimeout(() => {
		            if (this.endCallContext) {
		                this.endCallContext.stop();
		            }
		            // 在跳转前触发清空事件
		            uni.$emit('clearDialInput');
		            Logger.log('navigate', { reason: 'end_music_timeout', status: this.internalStatus, callId: this.callId });
		            console.log('Navigate due to end_music_timeout', { reason: 'end_music_timeout', status: this.internalStatus, callId: this.callId });
		            // 跳转到拨号页面
		            uni.switchTab({
					url: '/pages/dial/dial'
				});
		        }, 27000);
		        
		        // 播放音乐
		        this.endCallContext.play();
		    }
		  },
		  async checkContactAndDisplay(number, defaultLocation) {
		    console.log('checkContactAndDisplay: Processing number:', number);
		    const cleanedNumber = number.replace(/\s/g, '');
		    if (!cleanedNumber) {
		        console.log('checkContactAndDisplay: Invalid number. Using original display.');
		         // Ensure original number/location are displayed if check cannot be performed
		        this.number = this.formatPhoneNumber(number); // Set to formatted original number
		        this.location = defaultLocation || '未知位置'; // Set to original location or default
		        return;
		    }
		    try {
		        // Use POST method for the contact API as per server.py
		        const apiUrl = phoneApi('/api/contact');
		        console.log('checkContactAndDisplay: Calling API:', apiUrl, 'with phone:', cleanedNumber);
		        const res = await uni.request({
		            url: apiUrl,
		            method: 'POST', // Corrected to POST
		            data: {
		                phone: cleanedNumber
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
		    // 清除可能存在的旧轮询
		    this.stopRingtonePolling();
		    
		    // 检查当前状态是否为 ringing
		    if (this.internalStatus === '正在等待对方接听...') {
		        console.log('Starting ringtone polling for ringing state');
		        this.ringtonePollTimer = setInterval(() => {
		            this.checkRingtoneStatus();
		        }, 1000);
		    }
		  },
		  stopRingtonePolling() {
		    if (this.ringtonePollTimer) {
		        clearInterval(this.ringtonePollTimer);
		        this.ringtonePollTimer = null;
		    }
		  },
		  async checkRingtoneStatus() {
		    // 如果当前不是 ringing 状态，直接返回
		    if (this.internalStatus !== '正在等待对方接听...') {
		        console.log('Not in ringing state, skipping ringtone check');
		        return;
		    }

		    try {
		        const res = await uni.request({
		            url: phoneApi('/api/ringtone-status'),
		            method: 'GET',
		            data: {
		                userId: this.userId
		            }
		        });
		        
		        if (res.statusCode === 200 && res.data && res.data.code === 0) {
		            const { isPlaying, lastUpdateTime, userId } = res.data.data;
		            
		            if (lastUpdateTime > this.lastRingtoneUpdateTime && 
		                isPlaying !== this.isPlayingRingtone && 
		                userId === this.userId) {
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
            },
            // 修改 stopRingtone 方法，确保完全停止铃声和相关状态
            stopRingtone() {
                console.log('Stopping ringtone');
                if (this.ringtoneContext) {
                    try {
                        this.ringtoneContext.stop();
                        console.log('Ringtone stopped successfully');
                    } catch (error) {
                        console.error('Error stopping ringtone:', error);
                    }
                }
                
                // 清除铃声相关的定时器
                if (this.ringtoneDurationTimer) {
                    clearInterval(this.ringtoneDurationTimer);
                    this.ringtoneDurationTimer = null;
                }
                if (this.ringtoneTimeout) {
                    clearTimeout(this.ringtoneTimeout);
                    this.ringtoneTimeout = null;
                }
                
                // 重置铃声状态
                this.ringtoneStartTime = null;
                this.selectedRingtone = null;
                this.isPlayingRingtone = false;
                this.lastRingtoneUpdateTime = 0;
            },
			// 添加预加载通话记录的方法
			async preloadCallRecords() {
				try {
					const userId = uni.getStorageSync('userId') || 6;
					const response = await uni.request({
						url: phoneApi('/api/call-records'),
						method: 'GET',
						data: {
							userId: userId,
							page: 1,
							pageSize: 50
						}
					});

					if (response.data.code === 0) {
						const records = response.data.data.list.map(record => ({
							id: record.call_id,
							number: record.dialed_number,
							displayName: record.contact_name || record.dialed_number,
							location: record.contact_name ? record.dialed_number : (record.location || '未知'),
							time: this.formatTime(record.start_time),
							status: this.mapCallStatus(record.status)
						}));

						// 将记录存储到本地存储中
						uni.setStorageSync('preloaded_call_records', records);
						console.log('Successfully preloaded call records');
					}
				} catch (error) {
					console.error('Failed to preload call records:', error);
				}
			},

			// 添加格式化时间的方法
			formatTime(timestamp) {
				const now = Math.floor(Date.now() / 1000);
				const diff = now - timestamp;
				
				if (diff < 60) return '刚刚';
				if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
				if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
				
				const date = new Date(timestamp * 1000);
				return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
			},

			// 添加状态映射方法
			mapCallStatus(status) {
				const statusMap = {
					'ringing': 'incoming',
					'connected': 'outgoing',
					'completed': 'completed',
					'failed': 'failed',
					'no_answer': 'missed',
					'canceled': 'canceled',
					'disconnected': 'disconnected'
				};
				return statusMap[status] || 'off';
			},
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
            // 清除铃声相关定时器
            if (this.ringtoneTimeout) {
                clearTimeout(this.ringtoneTimeout);
                this.ringtoneTimeout = null;
            }
            if (this.ringtoneDurationTimer) {
                clearInterval(this.ringtoneDurationTimer);
                this.ringtoneDurationTimer = null;
            }
            // 重置铃声开始时间
            this.ringtoneStartTime = null;

            // 在页面卸载时发送挂断请求
            this.sendHangupRequest();
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
    padding: 0 40rpx;
    box-sizing: border-box;
  }
  .call-number {
    font-size: clamp(48rpx, 8vw, 65rpx);
    color: #fff;
    font-weight: bold;
    margin-top: min(30vh, 300rpx);
    letter-spacing: 2rpx;
    text-align: center;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .call-location {
    color: #adadad;
    text-align: center;
    margin-top: 20rpx;
    width: 100%;
  }
  .hanzi {
    font-size: clamp(28rpx, 4vw, 32rpx);
    display: block;
    line-height: 1.4;
  }
  .status {
    font-size: clamp(24rpx, 3.5vw, 28rpx);
    color: #adadad;
    display: block;
    line-height: 1.4;
    margin-top: 8rpx;
  }
  .keypad-input-display {
    font-size: clamp(48rpx, 7vw, 60rpx);
    color: #fff;
    text-align: center;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: min(45vh, 550rpx);
    width: min(90vw, 750rpx);
    top: 550rpx;
  }
  .call-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40rpx 30rpx;
    width: 750rpx;
    position: fixed;
    bottom: 400rpx;
    left: 50%;
    transform: translateX(-50%);
    padding: 0 40rpx;
    box-sizing: border-box;
  }
  .action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .action-icon {
    width: 60rpx;
    height: 60rpx;
    margin-bottom: 20rpx;
  }
  .action-text {
    color: #fff;
    font-size: 24rpx;
    text-align: center;
  }
  .bottom-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: center;
    width: 750rpx;
    position: fixed;
    bottom: 200rpx;
    left: 50%;
    transform: translateX(-50%);
    padding: 0 40rpx;
    box-sizing: border-box;
    gap: 40rpx 30rpx;
  }
  .bottom-actions .action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .call-end-btn {
    width: 140rpx;
    height: 140rpx;
    background: #f7372d;
    border-radius: 70rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
  }
  .end-icon {
    width: 70rpx;
    height: 70rpx;
  }
  
  .miui-dialpad {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 140rpx;
    padding: 0 40rpx;
    box-sizing: border-box;
}

.miui-keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 30rpx;
    width: 100%;
    max-width: 580rpx;
    margin: 0 auto;
}

.miui-key-row {
    display: contents;
}

.miui-key {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 140rpx;
    height: 140rpx;
    border-radius: 70rpx;
    background-color: rgba(255, 255, 255, 0.15);
    color: #fff;
    margin: 0 auto;
}

.miui-key-main {
    font-size: 64rpx;
    font-weight: bold;
}

.miui-key-sub {
    font-size: 26rpx;
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
    margin-top: 60rpx;
    margin-bottom: 120rpx;
}

.miui-action-backspace {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 120rpx;
    height: 120rpx;
}

.miui-icon-backspace {
    width: 70rpx;
    height: 70rpx;
}

/* Removed specific styling for the last row */

/* 添加安全区域适配 */
@supports (padding-bottom: constant(safe-area-inset-bottom)) {
    .bottom-actions {
        padding-bottom: constant(safe-area-inset-bottom);
    }
}

@supports (padding-bottom: env(safe-area-inset-bottom)) {
    .bottom-actions {
        padding-bottom: env(safe-area-inset-bottom);
    }
}
</style>

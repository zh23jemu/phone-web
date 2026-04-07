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
          <text class="status">{{ status }}</text>
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
				location: '广东佛山 联通',
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
				dialerUserId: null,
				markType: null
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

		    // Read call information from navigation options
		    if (options.callId) {
		        // 这是作为被叫方接到来电后跳转过来的
		        this.callId = options.callId;
		        this.number = options.number ? decodeURIComponent(options.number) : '未知号码';
		        this.number = this.formatPhoneNumber(this.number); // 格式化号码
		        this.location = options.location ? decodeURIComponent(options.location) : '未知位置';
		        this.dialerUserId = options.dialerUserId; // 记录拨号方ID
		        this.markType = options.markType; // 记录标记类型
		        this.status = '来电中...'; // 初始状态为来电中

                // 暂时停止铃声轮询，避免和来电铃声冲突
                // uni.$emit('stopRingtonePolling'); // 如果在 dial.vue 或其他页面启动了全局铃声轮询

		        console.log('Navigated to calling as callee with options:', options);

		        // 不需要发送拨号请求，因为呼叫已经被主叫方创建了
		        // this.sendDialRequest(); // 注释掉或移除

		        // 开始轮询通话状态（检查是否已接通或挂断）
		        this.startPolling();

		        // 作为被叫方，需要播放来电铃声
		        this.playRandomRingtone();

		    } else if (options.number) {
		        // 这是作为主叫方发起呼叫跳转过来的
		        this.number = options.number;
		        this.number = this.formatPhoneNumber(this.number);
		        this.location = options.location ? decodeURIComponent(options.location) : '未知位置';
		        this.status = '正在拨号...'; // 初始状态为正在拨号

		        console.log('Navigated to calling as dialer with options:', options);

		        // 发送拨号请求给服务器
		        this.sendDialRequest();

		        // 作为主叫方，不需要播放来电铃声
		        // this.playRandomRingtone(); // 注释掉或移除
		    } else {
		        // 没有必要的参数，可能需要处理错误或返回
		        console.error('Navigated to calling page without necessary parameters.');
		        uni.showToast({ title: '参数错误', icon: 'none' });
		        setTimeout(() => {
		             uni.navigateBack();
		        }, 2000);
		        return; // 停止执行后续代码
		    }


		    // Existing logic to get background image
		    const ret = u7746wallpaper.getBackground('test.png');
		    console.log(ret);
		    if (ret.code === "1") {
		        this.imgUrl = ret.msg;
		    } else {
		        this.imgUrl = '/static/images/bg.jpg';
		    }

		    // 停止铃声轮询 (如果在 dial.vue 或 call_records.vue 页面启动了)
		    // 可以在 onUnload 中停止，或者根据需要在这里停止
		    // this.stopRingtonePolling(); // 确保不会在这里意外停止其他页面的轮询
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
		              
		              switch (status) {
		                  case 'ringing':
		                      this.status = '正在等待对方接听...'; // 主叫方看到的状态
                            // 如果是被叫方进入此页面，并且状态仍然是 ringing，保持 '来电中...' 状态并播放铃声
                            if (this.dialerUserId && this.userId === this.dialerUserId) { // 判断是主叫方
                                this.status = '正在等待对方接听...';
                            } else if (this.callId && this.status !== '来电中...') { // 判断是被叫方且状态不是来电中
                                this.status = '来电中...';
                                this.playRandomRingtone();
                            }
                            break;
		                  case 'connected':
		                      this.stopRingtone();
		                      if (!this.durationTimer) {  // 只在第一次收到 connected 状态时启动计时器
		                          console.log('Call connected, starting timer');
		                          this.status = '00:00';
		                          this.startDurationTimer();
		                      }
		                      break;
		                  case 'failed':
		                      console.log('Call failed');
		                      this.status = '无法接通';
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
							  this.status = '呼叫已转移';
							  this.stopRingtone();
							  this.playEndCallMusic();
							  if (this.durationTimer) {
								  clearInterval(this.durationTimer);
								  this.durationTimer = null;
							  }
							  // 触发通话结束事件
							  uni.$emit('callEnded');
							  break;
						  default:  // 处理所有其他状态
							console.log('Call ended with status:', status);
		                            this.status = '通话已结束';
		                            this.stopPolling();
							if (this.durationTimer) {
								clearInterval(this.durationTimer);
								durationTimer = null;
							}
							// 触发通话结束事件
							uni.$emit('callEnded');
		                            setTimeout(() => {
		                                uni.navigateBack();
		                            }, 2000);
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
							callId: this.callId
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
								setTimeout(() => {
									uni.navigateBack();
								}, 1000);
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
		    
		    // 如果还没有选择铃声，随机选择一首
		    if (!this.selectedRingtone) {
		      const randomIndex = Math.floor(Math.random() * this.ringtoneList.length);
		      this.selectedRingtone = this.ringtoneList[randomIndex];
		    }
		    
		    // 播放选中的铃声
		    this.ringtoneContext.src = this.selectedRingtone;
            this.ringtoneContext.loop = true; // Loop the ringtone
		    this.ringtoneContext.play();
            this.isPlayingRingtone = true; // Update state
		  },
		  
		  stopRingtone() {
		    if (this.ringtoneContext) {
		      this.ringtoneContext.stop();
		      // 重置选中的铃声，这样下次呼叫时会重新随机选择
		      this.selectedRingtone = null;
              this.isPlayingRingtone = false; // Update state
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
		  // 添加接听电话逻辑（如果从 dial.vue 跳转过来是响铃状态）
          // 如果你是作为被叫方进入 calling.vue 并且状态是 ringing，你需要一个接听按钮来触发这个方法
          async answerCall() {
              if (!this.callId) {
                  console.warn('Cannot answer call: callId is not set.');
                  return;
              }

              try {
                  const res = await uni.request({
                      url: 'http://106.53.30.150:9097/api/answerCall', // 假设服务器有接听接口
                      method: 'POST',
                      header: {
                           'content-type': 'application/json'
                      },
                      data: JSON.stringify({
                           callId: this.callId,
                           userId: this.userId // 接听用户的ID
                      })
                  });

                  console.log('Answer call response:', res);

                  if (res.statusCode === 200 && res.data && res.data.code === 0) {
                      console.log('Call answered successfully.');
                      // 服务器应该会将状态更新为 'connected' 并通知双方，
                      // 这里的状态更新会通过 status 轮询反映出来
                      this.status = '通话中...';
                      // 停止铃声 (如果正在响)
                      this.stopRingtone();
                      // 启动通话计时
                      this.startDurationTimer();

                  } else {
                      console.error('Failed to answer call:', res.data?.msg);
                      uni.showToast({ title: res.data?.msg || '接听失败', icon: 'none' });
                      // 接听失败可能需要结束通话或返回
                      this.endCall(); // 例如，接听失败就挂断
                  }
              } catch (error) {
                  console.error('Answer call failed:', error);
                  uni.showToast({ title: '网络错误或服务器无响应', icon: 'none' });
                  this.endCall(); // 例如，网络错误就挂断
              }
          }
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



<template>
    <view class="call-record-page">
        <!-- 顶部蓝色卡片 -->
        <view class="top-blue-card">
            <view class="buttons-container">
                <view class="top-row">
                    <view class="side-btn" @click="openRedialModal">回拨电话</view>
                    <view class="side-btn" @click="goToDeadCardSms">死卡短信</view>
                </view>
                <view class="center-title">
                    <view class="main-title">呼叫记录</view>
                </view>
                <view class="bottom-row">
                    <view class="side-btn" @click="handlePlayRingtone">呼叫铃声</view>
                    <view class="side-btn" @click="handleRefresh">刷新</view>
                    <view class="side-btn" @click="goToSendSms">模拟短信</view>
                </view>
            </view>
        </view>

        <!-- 显示消息状态，过滤掉 WebSocket 连接状态
        <view v-if="messageStatus && !isConnectionStatusMessage" class="message-status">{{ messageStatus }}</view> -->

        <!-- 历史记录第一条显示在实时通话区域 -->
        <view v-if="callRecords.length > 0" class="record-list real-time-call">
            <view class="record-item" :class="{'mark-transfer': callRecords[0].mark_type === 'transfer', 'mark-internal': callRecords[0].mark_type === 'internal', 'mark-normal': callRecords[0].mark_type === 'normal'}">
                <image class="call-icon" :src="getCallIcon(callRecords[0])"></image>
                <view class="record-info">
                    <view class="number">{{ callRecords[0].dialed_number }}</view>
                    <view class="location">
                        {{ callRecords[0].location || '未知位置' }}
                    </view>
                    <view class="time-status">
                        {{ formatTimestamp(callRecords[0].start_time) }}
                        {{ mapCallStatusToText(callRecords[0].status) }}
                    </view>
                </view>
                <view class="record-btns">
                    <view v-if="callRecords[0].status === 'ringing' && callRecords[0].call_type !== 'redial'" class="btn accept" @click="openAnswerConfirm">接听</view>
                    <view v-if="callRecords[0].status === 'ringing' || callRecords[0].status === 'connected'" class="btn reject" @click="openHangupConfirm">挂断</view>
                    <view v-if="mapCallStatusToAction(callRecords[0].status)" class="btn mark" @click="openMarkModal(callRecords[0])">{{ mapCallStatusToAction(callRecords[0].status) }}</view>
                </view>
            </view>
        </view>

        <!-- 通话记录列表 (原有的历史记录，从第二条开始) -->
        <!-- 添加滚动监听和ID，设置高度和滚动样式 -->
        <scroll-view class="record-list history-records" scroll-y="true" @scroll="handleScroll" id="recordList">
             <!-- 添加调试信息 -->
            <view class="debug-info" style="color: #333; padding: 10rpx;">
                记录数量: {{ callRecords.length }} / 总数: {{ total }}
            </view>
            <view class="record-item" v-for="(item, idx) in callRecords.slice(1)" :key="item.id" :class="{'mark-transfer': item.mark_type === 'transfer', 'mark-internal': item.mark_type === 'internal', 'mark-normal': item.mark_type === 'normal'}">
                <image class="call-icon" :src="getCallIcon(item)"></image>
                <view class="record-info">
                    <view class="number">{{ item.dialed_number }}</view>
                    <view class="location">
                        {{ item.location || '未知位置' }}
                    </view>
                    <view class="time-status">
                        {{ formatTimestamp(item.start_time) }}
                        {{ mapCallStatusToText(item.status) }}
                    </view>
                </view>
                <view class="record-btns">
                    <view v-if="item.status === 'ringing' && item.call_type !== 'redial'" class="btn accept" @click="openAnswerConfirm">接听</view>
                    <view v-if="item.status === 'ringing' || item.status === 'connected'" class="btn reject" @click="openHangupConfirm">挂断</view>
                    <view v-if="mapCallStatusToAction(item.status)" class="btn mark" @click="openMarkModal(item)">{{ item.mark_type ? '修改标记' : '标记号码' }}</view>
                </view>
            </view>

            <!-- 加载状态提示 -->
            <view v-if="isLoading" class="loading-status">
                <text>加载中...</text>
            </view>
            <view v-else-if="!hasMoreRecords && callRecords.length > 1" class="no-more">
                <text>没有更多记录了</text>
            </view>
        </scroll-view>

        <!-- 标记测试弹窗 -->
        <view class="mark-modal" v-if="showMarkModal">
            <view class="modal-content">
                <view class="modal-title">确定标记 {{ currentRecordToMark ? currentRecordToMark.dialed_number : '' }} 为测试号码吗?</view>
                <view class="mark-options">
                    <view class="option-item" v-for="option in markOptions" :key="option.value" @click="selectedMarkType = option.value">
                        <view class="radio-icon" :class="{ 'checked': selectedMarkType === option.value }"></view>
                        <text>{{ option.label }}</text>
                    </view>
                </view>
                <view class="modal-actions">
                    <view class="action-btn cancel" @click="closeMarkModal">取消</view>
                    <view class="action-btn confirm" @click="confirmMark">确认</view>
                </view>
            </view>
        </view>

        <!-- 回拨电话弹窗 -->
        <view class="mark-modal" v-if="showRedialModal">
            <view class="modal-content">
                <view class="modal-title">回拨电话</view>
                <input 
                    class="modal-input" 
                    type="number" 
                    v-model="redialNumber" 
                    placeholder="请输入手机号码" 
                    @input="handleNumberInput"
                />
                <view v-if="numberLocation" class="location-info">
                    归属地：{{ numberLocation }}
                </view>
                <view class="modal-actions">
                    <view class="action-btn cancel" @click="closeRedialModal">取消</view>
                    <view class="action-btn confirm" @click="confirmRedial">确认</view>
                </view>
            </view>
        </view>

        <!-- 添加接听确认弹窗 -->
        <view class="mark-modal" v-if="showAnswerConfirmModal">
            <view class="modal-content">
                <view class="modal-title">确定接听电话吗?</view>
                <view class="modal-actions">
                    <view class="action-btn cancel" @click="cancelAnswer">取消</view>
                    <view class="action-btn confirm" @click="confirmAnswer">确认</view>
                </view>
            </view>
        </view>

        <!-- 添加挂断确认弹窗 -->
        <view class="mark-modal" v-if="showHangupConfirmModal">
            <view class="modal-content">
                <view class="modal-title">确定挂断电话吗?</view>
                <view class="modal-actions">
                    <!-- Conditional buttons based on call type -->
                    <view v-if="callToHangup && callToHangup.call_type === 'redial'">
                        <view class="action-btn cancel" @click="cancelHangup">取消</view>
                        <view class="action-btn confirm" @click="confirmHangup">挂断</view>
                    </view>
                    <template v-else>
                        <view class="action-btn cancel" @click="cancelHangup">取消</view>
                        <view class="action-btn reject" @click="confirmReject">拒接</view>
                        <view class="action-btn confirm" @click="confirmHangup">挂断</view>
                    </template>
                </view>
            </view>
        </view>

    </view>
</template>

<script>
import { connectWebSocket, closeWebSocket, sendWebSocketMessage, registerMessageHandler, wsStatus, messageStatus } from '@/utils/websocket'
import { fetchCallRecords, formatTimestamp, mapCallStatusToText, mapCallStatusToAction, callRecords } from '@/api/call'
import { useUserStore } from '@/stores/user'
import cache from '@/utils/cache'

export default {
    name: 'CallRecordPage',
    data() {
        return {
            // WebSocket 相关状态
            wsStatus,
            messageStatus,
            userId: null, // 初始化为 null，将从用户中心获取
            heartbeatTimer: null, // 添加心跳定时器
            // 实时呼叫状态
            currentCall: null, // 存储当前活动呼叫的状态 { callId, number, dialerUserId, status: 'ringing' | 'connected' }
            statusPollTimer: null, // 添加状态轮询定时器
            showMarkModal: false, // 控制标记弹窗的显示
            currentRecordToMark: null, // 当前正在标记的通话记录
            selectedMarkType: 'normal', // 选中的标记类型，默认为 'normal'
            markOptions: [ // 标记选项
                { label: '一般', value: 'normal', color: 'green' },
                { label: '转移', value: 'transfer', color: 'yellow' },
                { label: '内部', value: 'internal', color: 'red' }
            ],
            // 历史记录
            callRecords: [],
            isPlayingRingtone: false, // 确保初始值为 false
            ringtoneContext: null,
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
            markedNumbers: [], // 存储标记号码列表
            markedNumbersPage: 1, // 当前页码
            markedNumbersPageSize: 20, // 每页数量
            markedNumbersTotal: 0, // 总记录数
            searchQuery: '', // 搜索关键字
            showRedialModal: false, // 控制回拨弹窗的显示
            redialNumber: '', // 回拨电话号码输入框的值
            numberLocation: '', // 存储号码归属地信息
            showAnswerConfirmModal: false, // 添加接听确认弹窗状态
            showHangupConfirmModal: false, // 添加挂断确认弹窗状态
            callToAnswer: null, // 存储待接听的通话信息
            callToHangup: null, // 存储待挂断的通话信息
            page: 1,
            pageSize: 20,
            total: 0,
            hasMoreRecords: true,
            isLoading: false,
            // 自动加载相关
            scrollThreshold: 100, // 距离底部多少像素时触发加载
            scrollViewHeight: 0, // 存储 scroll-view 的高度
        }
    },
    mounted() {
        this.$nextTick(() => {
            uni.createSelectorQuery().select('#recordList').boundingClientRect(rect => {
                if (rect) {
                    this.scrollViewHeight = rect.height;
                    console.log('Scroll-view height:', this.scrollViewHeight);
                }
            }).exec();
        });
    },
    onLoad() {
        // 获取用户信息
        this.getUserInfo();
        
        // 确保初始状态为 false
        this.isPlayingRingtone = false;
        
        // 初始化铃声音频上下文
        this.ringtoneContext = uni.createInnerAudioContext();
        this.ringtoneContext.onEnded(() => {
            // 当铃声播放结束时，如果还在播放状态，继续播放
            if (this.isPlayingRingtone && this.currentRingtone) {
                this.ringtoneContext.src = this.currentRingtone;
                this.ringtoneContext.play();
            }
        });
        this.ringtoneContext.onError((res) => {
            console.error('Ringtone Error:', res.errMsg);
            // 发生错误时停止铃声并通知服务器
            this.stopRingtone();
        });
    },
    onShow() {
        // 页面显示时检查 WebSocket 连接状态
        if (this.userId && wsStatus.value !== 'connected') {
            console.log('Reconnecting WebSocket on page show...');
            connectWebSocket(this.userId, 'ws://106.53.30.150:9096');
            this.registerMessageHandlers();
            this.startHeartbeat();
        }
    },
    onUnload() {
        // 页面卸载时关闭 WebSocket 连接
        closeWebSocket()
        // 清理心跳定时器
        this.stopHeartbeat()
        // 确保停止铃声并通知服务器
        if (this.isPlayingRingtone) {
            this.stopRingtone();
        }
        // 清理铃声音频上下文
        if (this.ringtoneContext) {
            this.ringtoneContext.destroy();
            this.ringtoneContext = null;
        }
    },
    computed: {
        // 计算属性，判断当前 messageStatus 是否为 WebSocket 连接状态消息
        isConnectionStatusMessage() {
            if (!this.messageStatus) return false;
            const connectionMessages = [
                'WebSocket已连接',
                'WebSocket连接中...',
                'WebSocket连接断开',
                'WebSocket连接错误',
                'websocket连接失败',
            ];
            return connectionMessages.some(msg => this.messageStatus.includes(msg));
        },

        // 添加计算属性：检查是否有振铃状态的通话
        hasRingingCall() {
            return this.callRecords.some(record => record.status === 'ringing');
        }
    },
    methods: {
        // 添加获取用户信息的方法
        async getUserInfo() {
            try {
                console.log('Getting user info...');
                // 尝试从 store 获取 token
                const userStore = useUserStore();
                console.log('Token from store:', userStore.token ? 'exists' : 'not found');

                // 尝试从 cache 工具获取 token (正确的方式)
                const token = cache.get('token');
                console.log('Token from cache:', token ? 'exists' : 'not found');

                if (!token) {
                    console.error('No token found in cache');
                    // 如果没有 token，跳转到登录页面
                    uni.showToast({
                        title: '请先登录',
                        icon: 'none',
                        duration: 2000,
                        complete: () => {
                            setTimeout(() => {
                                uni.navigateTo({
                                    url: '/pages/login/login'
                                });
                            }, 2000);
                        }
                    });
                    return;
                }

                const res = await uni.request({
                    url: 'http://106.53.30.150:2025/api/user/center',
                    method: 'GET',
                    header: {
                        token: token // 使用从 cache 获取的 token
                    }
                });
                
                console.log('User center API response:', res);
                
                if (res.data && res.data.code === 1 && res.data.data) {
                    const newUserId = res.data.data.id;
                    console.log('Successfully got user ID:', newUserId);
                    
                    // 只有在用户ID发生变化时才重新连接WebSocket
                    if (this.userId !== newUserId) {
                        this.userId = newUserId;
                        // 只有在没有活动连接时才重新连接
                        if (wsStatus.value !== 'connected') {
                            connectWebSocket(this.userId, 'ws://106.53.30.150:9096');
                            this.registerMessageHandlers();
                            this.startHeartbeat();
                        }
                    }
                    
                    // 无论是否重新连接，都获取历史记录
                    this.fetchCallRecords();
                } else {
                    console.error('Failed to get user info:', res.data);
                    // 如果获取用户信息失败，可能是 token 过期，跳转到登录页面
                    if (res.data?.code === 401 || res.data?.msg?.includes('token')) {
                        uni.showToast({
                            title: '登录已过期，请重新登录',
                            icon: 'none',
                            duration: 2000,
                            complete: () => {
                                setTimeout(() => {
                                    uni.navigateTo({
                                        url: '/pages/login/login'
                                    });
                                }, 2000);
                            }
                        });
                    } else {
                        uni.showToast({
                            title: res.data?.msg || '获取用户信息失败',
                            icon: 'none'
                        });
                    }
                }
            } catch (error) {
                console.error('Error getting user info:', error);
                uni.showToast({
                    title: '获取用户信息失败',
                    icon: 'none'
                });
            }
        },
        // 启动心跳
        startHeartbeat() {
            // 每30秒发送一次心跳
            // Adjusted to 20 seconds for more frequent pings
            this.heartbeatTimer = setInterval(() => {
                if (wsStatus.value === 'connected') {
                    sendWebSocketMessage({
                        type: 'ping'
                    });
                    console.log('Sent WebSocket ping.'); // Log ping sending
                }
            // Adjusted interval to 20000ms
            }, 20000);
        },

        // 停止心跳
        stopHeartbeat() {
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer)
                this.heartbeatTimer = null
            }
        },
        // 启动状态轮询
        startStatusPolling() {
            // 先清除可能存在的旧定时器
            this.stopStatusPolling();
            if (!this.currentCall) {
                console.log('No active call, not starting polling');
                return;
            }

            console.log('Starting status polling for call:', this.currentCall.callId);
            // 每3秒检查一次状态
            this.statusPollTimer = setInterval(() => {
                this.checkCallStatus()
            }, 3000)
        },

        // 停止状态轮询
        stopStatusPolling() {
            if (this.statusPollTimer) {
                clearInterval(this.statusPollTimer)
                this.statusPollTimer = null
            }
        },
        // 注册消息处理器
        registerMessageHandlers() {
            registerMessageHandler('registrationSuccess', (message) => {
                console.log('Registered successfully with userId:', message.userId)
                this.messageStatus = ''  // 清空消息状态，不显示注册成功
            })

            registerMessageHandler('callStatus', (message) => {
                console.log('Received call status:', message)
                console.log('Call status message details:', message);
                // 如果当前没有活动通话，则设置当前通话
                if (!this.currentCall) {
                    this.currentCall = {
                        callId: message.callId,
                        number: message.number,
                        dialerUserId: message.dialerUserId,
                        backendUserId: message.backendUserId,
                        status: message.status,
                        call_type: message.call_type,  // 添加通话类型
                        mark_type: message.mark_type // Add mark_type assignment here
                    }
                    this.messageStatus = ''  // 清空消息状态，不显示恢复通话状态
                    // 开始轮询状态
                    this.startStatusPolling()
                }
            })

            registerMessageHandler('incomingCall', (message) => {
                console.log('Received incoming call:', message)
                // 清除当前通话状态，允许新通话显示
                this.currentCall = {
                    callId: message.callId,
                    number: message.number,
                    dialerUserId: message.dialerUserId,
                    status: 'ringing',
                    mark_type: message.mark_type,
                    call_type: message.call_type  // 添加通话类型
                }
                this.messageStatus = ''  // 清空消息状态，不显示收到来电
                // 收到来电后开始轮询状态
                this.startStatusPolling()
            })

            registerMessageHandler('callAccepted', (message) => {
                console.log('Call accepted:', message.callId)
                if (this.currentCall && this.currentCall.callId === message.callId) {
                    this.currentCall.status = 'connected'
                    this.messageStatus = `呼叫已接通: ${this.currentCall.number}`
                    // 立即刷新呼叫记录列表
                    this.fetchCallRecords()
                }
            })

            registerMessageHandler('callEnded', (message) => {
                console.log('Call ended:', message.callId)
                // 检查是否是当前通话或历史记录中的通话
                const isCurrentCall = this.currentCall && this.currentCall.callId === message.callId
                const isHistoricalCall = this.callRecords.some(record => record.call_id === message.callId)

                if (isCurrentCall || isHistoricalCall) {
                    if (isCurrentCall) {
                        this.messageStatus = `呼叫已结束: ${this.currentCall.number} (原因: ${message.reason || '未知'})`
                        this.currentCall = null
                        // 通话结束时停止轮询
                        this.stopStatusPolling()
                        // 停止铃声
                        if (this.isPlayingRingtone) {
                            this.stopRingtone()
                        }
                    }
                    // 立即刷新呼叫记录列表
                    this.fetchCallRecords()
                }
            })

            // Add logging for refreshCallRecords message
            registerMessageHandler('refreshCallRecords', (message) => {
                console.log('Received refreshCallRecords message.', message);
                // Immediately fetch call records when notified
                this.fetchCallRecords();
            })

            registerMessageHandler('error', (message) => {
                console.error('Server error:', message.message)
                this.messageStatus = `服务器错误: ${message.message}`
            })
        },

        // 滚动事件处理
        handleScroll(e) {
            console.log('Scroll event triggered:', e.detail);
            if (this.isLoading || !this.hasMoreRecords || this.scrollViewHeight === 0) {
                console.log('Loading blocked or height not obtained: isLoading = ', this.isLoading, ', hasMoreRecords = ', this.hasMoreRecords, ', scrollViewHeight = ', this.scrollViewHeight);
                return;
            }
            
            const { scrollTop, scrollHeight } = e.detail;
            
            // 计算距离底部像素 = 总内容高度 - 已滚动距离 - 可视区域高度
            const distanceToBottom = scrollHeight - scrollTop - this.scrollViewHeight;
            const triggerThreshold = 100; // 距离底部100像素时触发加载

            console.log(`scrollTop: ${scrollTop}, scrollHeight: ${scrollHeight}, scrollViewHeight: ${this.scrollViewHeight}, distanceToBottom: ${distanceToBottom}`);

            // 基于距离底部像素判断触发
            if (distanceToBottom < triggerThreshold) {
                 console.log('Triggering load more: Distance to bottom is less than trigger threshold.');
                 this.loadMoreRecords();
            }
        },

        // 加载更多记录
        async loadMoreRecords() {
            console.log('Attempting to load more records...', 'isLoading:', this.isLoading, ', hasMoreRecords:', this.hasMoreRecords);
            if (this.isLoading || !this.hasMoreRecords) {
                console.log('Load more blocked.');
                return;
            }

            // 增加页码并获取记录
            this.page += 1;
            await this.fetchCallRecords();
        },

        // 获取记录
        async fetchCallRecords() {
            console.log('Fetching call records...');
            if (this.isLoading) {
                console.log('Fetch call records skipped: isLoading is true.');
                return;
            }
            this.isLoading = true;

            let timeoutId = null;

            try {
                timeoutId = setTimeout(() => {
                    if (this.isLoading) {
                        console.warn('Fetch call records timed out.');
                        this.isLoading = false;
                        this.hasMoreRecords = false; // 超时时也重置 hasMoreRecords
                        this.messageStatus = '获取呼叫记录超时，请检查网络或服务器';
                        uni.stopPullDownRefresh();
                    }
                }, 15000);

                const res = await uni.request({
                    url: 'http://106.53.30.150:9097/api/all-call-records',
                    method: 'GET',
                    data: {
                        userId: this.userId,
                        page: this.page,
                        pageSize: this.pageSize
                    }
                });

                if (res.statusCode === 200 && res.data && res.data.code === 0) {
                    const { list, total } = res.data.data;
                    this.total = total;

                    if (this.page === 1) {
                        this.callRecords = list;
                    } else {
                        this.callRecords = [...this.callRecords, ...list];
                    }

                    // 更新是否有更多记录的状态
                    this.hasMoreRecords = this.callRecords.length < total;
                    console.log('Fetch call records successful. Total records:', this.callRecords.length, 'of', total);
                } else {
                    console.error('Failed to fetch records:', res.data);
                    this.messageStatus = '获取呼叫记录失败：' + (res.data?.msg || '未知错误');
                    this.hasMoreRecords = false; // 失败时也重置 hasMoreRecords
                }
            } catch (error) {
                console.error('Failed to fetch call records:', error);
                this.messageStatus = '获取呼叫记录失败：' + error.message;
                this.hasMoreRecords = false; // 错误时也重置 hasMoreRecords
            } finally {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                this.isLoading = false;
                console.log('Fetch call records finished. isLoading:', this.isLoading, 'hasMoreRecords:', this.hasMoreRecords);
                uni.stopPullDownRefresh();
            }
        },

        // 重置分页并重新加载
        async resetAndReload() {
            console.log('Resetting and reloading...');
            this.page = 1;
            this.hasMoreRecords = true;
            this.isLoading = false;
            this.callRecords = [];
            await this.fetchCallRecords();
        },

        // 检查通话状态
        async checkCallStatus() {
            if (!this.currentCall) return
            try {
                const res = await uni.request({
                    url: `http://106.53.30.150:9097/api/call-status`,
                    method: 'GET',
                    data: {
                        callId: this.currentCall.callId
                    }
                })

                if (res.statusCode === 200 && res.data && res.data.code === 0) {
                    const status = res.data.data.status
                    console.log('Current call status:', status)

                    // 如果通话已结束，清除当前通话并刷新列表
                    if (['completed', 'failed', 'no_answer', 'disconnected', 'canceled', 'guaduan', 'weijie'].includes(status)) {
                        this.messageStatus = `呼叫已结束: ${this.currentCall.number}`
                        this.currentCall = null
                        this.fetchCallRecords()
                        // 停止铃声并更新状态
                        if (this.isPlayingRingtone) {
                            this.stopRingtone();
                            // 确保通过 HTTP 更新铃声状态
                            this.updateRingtoneStatus(false);
                        }
                        // 停止轮询
                        this.stopStatusPolling()
                    }
                    // 如果状态改变，更新状态
                    else if (this.currentCall.status !== status) {
                        this.currentCall.status = status
                        this.fetchCallRecords()
                    }
                }
            } catch (error) {
                console.error('Failed to check call status:', error)
            }
        },

        // 修改接听呼叫方法，改为打开确认弹窗
        openAnswerConfirm() {
             if (this.currentCall && this.currentCall.status === 'ringing') {
                this.callToAnswer = this.currentCall;
                this.showAnswerConfirmModal = true;
             } else {
                 console.warn('Cannot open answer confirm: No incoming call or wrong status');
                 this.messageStatus = '无法接听：无来电或状态错误';
             }
        },

        // 修改确认接听方法
        confirmAnswer() {
            console.log('confirmAnswer called.');
            // 无论请求是否成功，先停止铃声
            if (this.isPlayingRingtone) {
                this.stopRingtone();
                // 确保通过 HTTP 更新铃声状态
                this.updateRingtoneStatus(false);
            }

            if (this.callToAnswer && this.callToAnswer.callId) {
                console.log('Answering call:', this.callToAnswer.callId);
                console.log('Sending answerCall WebSocket message.');
                sendWebSocketMessage({
                    type: 'answerCall',
                    callId: this.callToAnswer.callId
                });
                this.messageStatus = '发送接听请求...';
            }
            this.cancelAnswer(); // 关闭弹窗并清除待处理通话
        },

        // 实现取消接听方法
        cancelAnswer() {
            this.showAnswerConfirmModal = false;
            this.callToAnswer = null;
        },

        // 修改挂断呼叫方法，改为打开确认弹窗
        openHangupConfirm() {
            if (this.currentCall && (this.currentCall.status === 'ringing' || this.currentCall.status === 'connected')) {
                this.callToHangup = this.currentCall;
                this.showHangupConfirmModal = true;
            } else {
                console.warn('Cannot open hangup confirm: No active call or wrong status');
                this.messageStatus = '无法挂断：无通话或状态错误';
            }
        },

        // 修改确认挂断方法
        async confirmHangup() {
            console.log('confirmHangup called.');
            // 无论请求是否成功，先停止铃声
            if (this.isPlayingRingtone) {
                this.stopRingtone();
                // 确保通过 HTTP 更新铃声状态
                this.updateRingtoneStatus(false);
            }

            if (this.callToHangup && this.callToHangup.callId) {
                let actionToSend = 'guaduan'; // 默认动作
                if (this.callToHangup.call_type === 'redial') {
                    actionToSend = 'hangup'; // 回拨电话使用 'hangup' 动作
                }

                try {
                    const res = await uni.request({
                        url: 'http://106.53.30.150:9097/api/hangup',
                        method: 'POST',
                        header: {
                            'content-type': 'application/json'
                        },
                        data: JSON.stringify({
                            callId: this.callToHangup.callId,
                            action: actionToSend
                        })
                    });

                    if (res.statusCode === 200 && res.data && res.data.code === 0) {
                        uni.showToast({ title: res.data.msg || '挂断成功', icon: 'success' });
                        this.messageStatus = '挂断成功';
                    } else {
                        uni.showToast({ title: res.data?.msg || '挂断失败', icon: 'none' });
                        this.messageStatus = '挂断失败';
                    }
                } catch (error) {
                    console.error('Hangup HTTP request failed:', error);
                    uni.showToast({ title: '网络错误或服务器无响应', icon: 'none' });
                    this.messageStatus = '挂断请求失败';
                }

                // 无论请求结果如何，都清除通话状态
                this.currentCall = null;
                this.fetchCallRecords();
                this.stopStatusPolling();
            }
            this.cancelHangup(); // 关闭弹窗并清除待处理通话
        },

        // 修改确认拒接方法
        async confirmReject() {
            console.log('confirmReject called.');
            // 无论请求是否成功，先停止铃声
            if (this.isPlayingRingtone) {
                this.stopRingtone();
                // 确保通过 HTTP 更新铃声状态
                this.updateRingtoneStatus(false);
            }

            if (this.callToHangup && this.callToHangup.callId) {
                try {
                    const res = await uni.request({
                        url: 'http://106.53.30.150:9097/api/hangup',
                        method: 'POST',
                        header: {
                            'content-type': 'application/json'
                        },
                        data: JSON.stringify({
                            callId: this.callToHangup.callId,
                            action: 'weijie' // 使用 'weijie' 动作标记拒接
                        })
                    });

                    if (res.statusCode === 200 && res.data && res.data.code === 0) {
                        uni.showToast({ title: res.data.msg || '拒接成功', icon: 'success' });
                        this.messageStatus = '拒接成功';
                    } else {
                        uni.showToast({ title: res.data?.msg || '拒接失败', icon: 'none' });
                        this.messageStatus = '拒接失败';
                    }
                } catch (error) {
                    console.error('Reject HTTP request failed:', error);
                    uni.showToast({ title: '网络错误或服务器无响应', icon: 'none' });
                    this.messageStatus = '拒接请求失败';
                }

                // 无论请求结果如何，都清除通话状态
                this.currentCall = null;
                this.fetchCallRecords();
                this.stopStatusPolling();
            }
            this.cancelHangup(); // 关闭弹窗并清除待处理通话
        },

        // 实现取消挂断方法
        cancelHangup() {
            this.showHangupConfirmModal = false;
            this.callToHangup = null;
        },

        // 打开标记弹窗
        openMarkModal(record) {
            this.currentRecordToMark = record;
            this.selectedMarkType = 'normal'; // 默认选中第一个选项
            this.showMarkModal = true;
        },

        // 关闭标记弹窗
        closeMarkModal() {
            this.showMarkModal = false;
            this.currentRecordToMark = null;
        },

        // 获取标记号码列表
        async fetchMarkedNumbers() {
            try {
                const res = await uni.request({
                    url: 'http://106.53.30.150:9097/api/marked-numbers',
                    method: 'GET',
                    data: {
                        query: this.searchQuery,
                        page: this.markedNumbersPage,
                        pageSize: this.markedNumbersPageSize
                    }
                });

                if (res.statusCode === 200 && res.data && res.data.code === 0) {
                    this.markedNumbers = res.data.data.list;
                    this.markedNumbersTotal = res.data.data.total;
                    console.log('Marked numbers updated:', this.markedNumbers);
                } else {
                    console.error('Failed to fetch marked numbers:', res.data);
                    uni.showToast({
                        title: res.data?.msg || '获取标记号码失败',
                        icon: 'none'
                    });
                }
            } catch (error) {
                console.error('Failed to fetch marked numbers:', error);
                uni.showToast({
                    title: '获取标记号码失败',
                    icon: 'none'
                });
            }
        },

        // 搜索标记号码
        async searchMarkedNumbers(query) {
            this.searchQuery = query;
            this.markedNumbersPage = 1; // 重置页码
            await this.fetchMarkedNumbers();
        },

        // 加载更多标记号码
        async loadMoreMarkedNumbers() {
            if (this.markedNumbers.length >= this.markedNumbersTotal) {
                return; // 已加载全部数据
            }
            this.markedNumbersPage++;
            await this.fetchMarkedNumbers();
        },

        // 确认标记
        async confirmMark() {
            if (!this.currentRecordToMark) return;

            const numberToMark = this.currentRecordToMark.dialed_number || this.currentRecordToMark.number;
            const markType = this.selectedMarkType;

            try {
                const res = await uni.request({
                    url: 'http://106.53.30.150:9097/api/mark-number',
                    method: 'POST',
                    header: {
                        'content-type': 'application/json'
                    },
                    data: JSON.stringify({
                        number: numberToMark,
                        markType: markType,
                        userId: this.userId
                    })
                });

                console.log('Mark number response:', res);

                if (res.statusCode === 200 && res.data && res.data.code === 0) {
                    uni.showToast({ title: '标记成功', icon: 'success' });
                    this.closeMarkModal();
                    // 刷新标记号码列表和通话记录列表
                    await Promise.all([
                        this.fetchMarkedNumbers(),
                        this.fetchCallRecords()
                    ]);
                } else {
                    uni.showToast({ title: res.data?.msg || '标记失败', icon: 'none' });
                }
            } catch (error) {
                console.error('Mark number failed:', error);
                uni.showToast({ title: '网络错误或服务器无响应', icon: 'none' });
            }
        },

        // 修改处理方法
        handlePlayRingtone() {
            if (!this.hasRingingCall) {
                uni.showToast({
                    title: '当前没有振铃通话',
                    icon: 'none',
                    duration: 2000
                });
                return;
            }

            // 如果已经在播放，则停止
            if (this.isPlayingRingtone) {
                this.stopRingtone();
                return;
            }

            // 开始播放铃声
            this.playRandomRingtone();
        },

        // 修改播放铃声方法
        playRandomRingtone() {
            if (!this.ringtoneContext) return;
            
            // 随机选择一首铃声
            const randomIndex = Math.floor(Math.random() * this.ringtoneList.length);
            this.currentRingtone = this.ringtoneList[randomIndex];
            
            // 播放选中的铃声
            this.ringtoneContext.src = this.currentRingtone;
            this.ringtoneContext.play();
            
            // 设置播放状态并通过 HTTP 通知服务器
            this.isPlayingRingtone = true;
            this.updateRingtoneStatus(true);

            uni.showToast({
                title: '铃声播放中',
                icon: 'success',
                duration: 2000
            });
        },

        // 修改停止铃声方法
        stopRingtone() {
            if (!this.ringtoneContext) return;
            
            this.ringtoneContext.stop();
            this.currentRingtone = null;
            
            // 设置停止状态并通过 HTTP 通知服务器
            this.isPlayingRingtone = false;
            this.updateRingtoneStatus(false);
        },

        // 添加更新铃声状态的 HTTP 方法
        async updateRingtoneStatus(isPlaying) {
            try {
                const res = await uni.request({
                    url: 'http://106.53.30.150:9097/api/ringtone-status',
                    method: 'POST',
                    header: {
                        'content-type': 'application/json'
                    },
                    data: JSON.stringify({
                        userId: this.userId,
                        isPlaying: isPlaying
                    })
                });

                if (res.statusCode !== 200 || res.data?.code !== 0) {
                    console.error('Failed to update ringtone status:', res.data);
                }
            } catch (error) {
                console.error('Error updating ringtone status:', error);
            }
        },

        formatTimestamp,
        mapCallStatusToText,
        mapCallStatusToAction,

        // 根据通话类型获取图标
        getCallIcon(item) {
            // 假设 'redial' 是回拨电话的 call_type
            if (item.call_type === 'redial') {
                return '/static/images/icon/incoming.png'; // 来电图标
            } else {
                return '/static/images/icon/outgoing.png'; // 去电图标或其他类型
            }
        },

        // 回拨电话（打开弹窗）
        openRedialModal() {
            this.redialNumber = ''; // 直接设置为空字符串
            this.showRedialModal = true;
        },

        // 关闭回拨弹窗
        closeRedialModal() {
            this.showRedialModal = false;
            this.redialNumber = ''; // 清空输入框
        },

        // 处理号码输入
        async handleNumberInput(e) {
            const cleaned = e.detail.value.replace(/\s+/g, '').trim();
            
            // 当输入11位手机号时自动查询归属地
            if (/^1[3-9]\d{9}$/.test(cleaned)) {
                try {
                    const res = await uni.request({
                        url: 'http://106.53.30.150:9097/api/phone-location',
                        method: 'GET',
                        data: {
                            phone: cleaned
                        }
                    });

                    if (res.statusCode === 200 && res.data && res.data.code === 0) {
                        const { province, city, company } = res.data.data;
                        const processedChannel = company ? company.replace('中国', '') : '';
                        this.numberLocation = `${province || ''}${city || ''} ${processedChannel || ''}`.trim();
                    } else {
                        this.numberLocation = '';
                    }
                } catch (error) {
                    console.error('Failed to fetch location:', error);
                    this.numberLocation = '';
                }
            } else {
                this.numberLocation = '';
            }
        },

        // 确认回拨电话
        async confirmRedial() {
            if (!this.redialNumber) {
                uni.showToast({
                    title: '请输入手机号码',
                    icon: 'none'
                });
                return;
            }

            // 清理电话号码（移除可能的空格和特殊字符）
            const cleaned = this.redialNumber.replace(/\s+/g, '').trim();
            
            // 验证手机号格式
            if (!/^1[3-9]\d{9}$/.test(cleaned)) {
                uni.showToast({
                    title: '请输入正确的手机号码',
                    icon: 'none'
                });
                return;
            }

            try {
                // 先查询归属地
                const locationRes = await uni.request({
                    url: 'http://106.53.30.150:9097/api/phone-location',
                    method: 'GET',
                    data: {
                        phone: cleaned
                    }
                });

                let location = '未知位置';
                if (locationRes.statusCode === 200 && locationRes.data && locationRes.data.code === 0) {
                    const { province, city, company } = locationRes.data.data;
                    const processedChannel = company ? company.replace('中国', '') : '';
                    location = `${province || ''}${city || ''} ${processedChannel || ''}`.trim();
                }

                // 发起拨号请求
                const res = await uni.request({
                    url: 'http://106.53.30.150:9097/api/dial',
                    method: 'POST',
                    header: {
                        'content-type': 'application/json'
                    },
                    data: JSON.stringify({
                        number: cleaned,
                        dialerUserId: this.userId,
                        targetUserId: this.userId,
                        location: location,
                        callType: 'redial'  // 添加通话类型标记
                    })
                });

                if (res.statusCode === 200 && res.data && res.data.code === 0) {
                    uni.showToast({ 
                        title: '拨号请求已发送', 
                        icon: 'success' 
                    });
                    this.closeRedialModal();
                } else {
                    uni.showToast({ 
                        title: res.data?.msg || '拨号请求失败', 
                        icon: 'none' 
                    });
                }
            } catch (error) {
                console.error('Dial initiation failed:', error);
                uni.showToast({ 
                    title: '网络错误或服务器无响应', 
                    icon: 'none' 
                });
            }
        },

        // 跳转到发送短信页面
        goToSendSms() {
            uni.navigateTo({
                url: '/pages/send_sms/send_sms'
            });
        },
        
        // 添加跳转到死卡短信页面的方法
        goToDeadCardSms() {
            uni.navigateTo({
                url: '/pages/dead_card_sms/dead_card_sms'
            });
        },

        // 添加刷新方法
        async handleRefresh() {
            console.log('Refreshing call records...');
            
            // 显示加载提示
            uni.showLoading({
                title: '刷新中...',
                mask: true
            });

            try {
                // 重置分页并重新加载
                await this.resetAndReload();
                
                // 显示成功提示
                uni.showToast({
                    title: '刷新成功',
                    icon: 'success',
                    duration: 1500
                });
            } catch (error) {
                console.error('Refresh failed:', error);
                uni.showToast({
                    title: '刷新失败',
                    icon: 'none',
                    duration: 2000
                });
            } finally {
                // 隐藏加载提示
                uni.hideLoading();
            }
        }
    }
};
</script>

<style scoped>
.call-record-page {
    min-height: 100vh;
    background: #ffffff; /* White background */
    padding: 0;
    margin: 0;
    width: 100vw;
    box-sizing: border-box;
}

.top-blue-card {
    background: #4d8cff;
    border-radius: 32rpx;
    margin: 20rpx 24rpx 20rpx 24rpx;  /* 减小上下边距 */
    padding: 20rpx 24rpx;  /* 减小内边距 */
}

.buttons-container {
    display: flex;
    flex-direction: column;
    gap: 10rpx;  /* 减小按钮之间的间距 */
}

.top-row, .bottom-row {
    display: flex;
    justify-content: space-between;
    width: 100%;
}

.center-title {
    text-align: center;
    padding: 5rpx 0;  /* 减小标题的内边距 */
}

.main-title {
    color: #fff;
    font-size: 34rpx;  /* 稍微减小标题字体大小 */
    font-weight: 500;
}

.side-btn {
    background: #ffffff;
    color: #333;
    font-size: 26rpx;
    border-radius: 40rpx;
    padding: 10rpx 40rpx;  /* 减小按钮的内边距 */
    text-align: center;
    min-width: 120rpx;
    white-space: nowrap;
}

.message-status {
    color: #333;
    font-size: 24rpx;
    text-align: center;
    margin-top: 20rpx;
}

.record-list {
    margin-top: 32rpx;
    padding: 0 24rpx;
    background: #ffffff; /* White background for the list area */
}

.real-time-call {
    border: 2rpx solid #4d8cff;
    border-radius: 16rpx;
    margin: 32rpx 24rpx;
    padding: 0;
    background-color: #ffffff;
}

.real-time-call .record-item {
    border-bottom: none;
    padding: 24rpx;
}

.record-list.history-records {
    flex: 1; /* 让历史记录列表填充剩余空间 */
    overflow-y: auto; /* 允许垂直滚动 */
    -webkit-overflow-scrolling: touch; /* 增加 iOS 滚动流畅度 */
    /* 可以根据实际布局调整高度，或者使用 flex-direction: column 和 flex: 1 */
    height: calc(100vh - 350rpx); /* 调整示例高度，给顶部和底部留出空间 */
    padding: 0; /* 移除水平内边距 */
}

.record-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 20rpx 16rpx; /* 保持内边距 */
    border-bottom: 1rpx solid #333;
    background-color: #ebe5e5f1;
    border-radius: 8rpx;
    margin: 0 24rpx 16rpx 24rpx; /* 添加左右外边距，与实时通话框对齐，并保留底部外边距 */
    border: 1rpx solid #333;
    width: auto; /* 宽度自适应外边距 */
    box-sizing: border-box;
    /* overflow: hidden; */ /* 可能导致内容被裁剪，暂时移除 */
}

.call-icon {
    width: 80rpx;
    height: 80rpx;
    margin-right: 20rpx;
    border-radius: 16rpx;
    background: #ccc;
    flex-shrink: 0; /* 防止图标被压缩 */
}

.record-info {
    flex-grow: 1; /* 允许信息区域填充剩余空间 */
    flex-shrink: 1; /* 允许信息区域收缩 */
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0; /* 允许内容收缩到0 */
    margin-right: 10rpx; /* 减小右边距 */
    overflow: hidden; /* 确保信息区域内部文本溢出时隐藏并显示省略号 */
}

.number,
.location,
.time-status {
    color: #333;
    font-size: 32rpx;
    font-weight: 500;
    margin-bottom: 8rpx;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis; /* 超出显示省略号 */
}

.location,
.time-status {
     font-size: 26rpx;
     color: #555;
}

.time-status {
    font-size: 22rpx;
    color: #777;
}

.record-btns {
    display: flex;
    flex-direction: column;
    gap: 10rpx; /* 减小按钮之间的垂直间距 */
    margin-left: 10rpx; /* 减小左边距 */
    flex-shrink: 0; /* 防止按钮被压缩 */
}

.btn {
    border-radius: 16rpx;
    color: #fff;
    font-size: 24rpx; /* 稍微减小按钮字体大小 */
    padding: 8rpx 16rpx; /* 减小按钮内边距 */
    text-align: center;
    font-weight: 500;
    white-space: nowrap; /* 防止按钮文字换行 */
    min-width: 120rpx; /* 给按钮设置最小宽度，防止过小 */
    display: inline-block; /* Ensure padding/margin work correctly */
}

.accept {
    background: #19c37c;
}

.reject {
    background: #ffb300;
}

.mark {
    background: #ff3b30;
}

/* Add styles for different mark types */
.record-item.mark-normal {
    background-color: rgba(255, 0, 0, 0.4); /* Increased opacity */
}

.record-item.mark-transfer {
    background-color: rgba(255, 255, 0, 0.4); /* Increased opacity */
}

.record-item.mark-internal {
    background-color: rgba(0, 128, 0, 0.4); /* Increased opacity */
}

/* 标记弹窗样式 */
.mark-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000; /* 确保弹窗在最上层 */
}

.modal-content {
    background-color: #ffffff;
    border-radius: 24rpx;
    padding: 48rpx 40rpx;
    width: 85vw;
    max-width: 650rpx;
    text-align: center;
    color: #333333;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.modal-title {
    font-size: 36rpx;
    font-weight: bold;
    margin-bottom: 48rpx;
    color: #333;
}

.modal-input {
    width: 100%;
    height: 100rpx;
    background: #f5f7fa;
    border: 2rpx solid #e4e7ed;
    border-radius: 16rpx;
    padding: 0 32rpx;
    font-size: 32rpx;
    color: #333;
    margin-bottom: 48rpx;
    box-sizing: border-box;
    transition: all 0.3s ease;
}

.modal-input:focus {
    border-color: #4d8cff;
    background: #fff;
    box-shadow: 0 0 0 2rpx rgba(77, 140, 255, 0.2);
}

.modal-actions {
    display: flex;
    justify-content: center;
    gap: 40rpx;
}

.action-btn {
    padding: 20rpx 40rpx;
    border-radius: 12rpx;
    font-size: 32rpx;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
}

.cancel {
    border: 2rpx solid #dcdfe6;
    color: #606266;
    background-color: #f5f7fa;
}

.cancel:active {
    background-color: #e4e7ed;
}

.confirm {
    background-color: #4d8cff;
    color: #fff;
    border: none;
}

.confirm:active {
    background-color: #3a7de0;
}

.real-time-call .record-info .number {
    color: #333; /* Dark text for white background */
}

.real-time-call .record-info .location {
    color: #555; /* Dark text */
}

.real-time-call .record-info .time-status {
    color: #777; /* Dark text */
}

/* 样式调整：确保弹窗z-index更高 */
.mark-modal {
    z-index: 10000; /* Increased z-index */
}
.modal-content {
    z-index: 10001; /* Increased z-index */
}
/* End style adjustment */

.location-info {
    font-size: 28rpx;
    color: #666;
    margin: 20rpx 0;
    padding: 10rpx 0;
    text-align: left;
}

.mark-options {
    /* Styles for the container of options */
    display: flex; /* Use flexbox to arrange items in a row */
    justify-content: space-around; /* Distribute space evenly around items */
    align-items: center; /* Vertically align items in the center */
    margin-bottom: 40rpx; /* Add some margin below the options */
    /* Ensure mark options are above other potential modal elements */
    position: relative; /* Needed for z-index to work */
    z-index: 10; /* Ensure it's above modal content's default layer */
}

.option-item {
    display: flex; /* Use flexbox for the item content (radio icon and text) */
    align-items: center; /* Vertically align icon and text */
    cursor: pointer;
    font-size: 30rpx;
    color: #555;
    /* Removed specific width/flex-basis to allow space-around to work */
}

.radio-icon {
    /* Basic styles for the radio button circle */
    width: 32rpx;
    height: 32rpx;
    border: 2rpx solid #999; /* Border color for unchecked state */
    border-radius: 50%; /* Make it a circle */
    margin-right: 16rpx; /* Space between icon and text */
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    transition: all 0.2s ease-in-out;
}

.radio-icon.checked {
    /* Styles for the checked state */
    border-color: #4d8cff; /* Change border color */
    background-color: #4d8cff; /* Fill the circle */
}

.radio-icon.checked::after {
    /* Add a dot or checkmark inside */
    content: '';
    width: 16rpx;
    height: 16rpx;
    background-color: #fff; /* White dot */
    border-radius: 50%;
}

.loading-status {
    text-align: center;
    padding: 20rpx;
    color: #4d8cff;
    font-size: 28rpx;
}

.no-more {
    text-align: center;
    padding: 20rpx;
    color: #999;
    font-size: 28rpx;
}

.debug-info {
    position: sticky; /* 使调试信息在滚动时固定在顶部 */
    top: 0; /* 固定在容器顶部 */
    background-color: rgba(255, 255, 255, 0.9); /* 添加半透明背景，避免遮挡内容 */
    padding: 10rpx;
    z-index: 2; /* 确保在列表项之上 */
    font-size: 24rpx;
    color: #333;
}

/* 添加禁用状态的样式 */
.side-btn.disabled {
    background: #cccccc;
    color: #999999;
    cursor: not-allowed;
    opacity: 0.7;
}


</style>


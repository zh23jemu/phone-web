<template>
    <view class="miui-dial-page" :class="{ 'show-mmi-error': showMMIErrorDialog, 'no-scroll': showDialpad }" :style="{
        paddingBottom: showDialpad ? '340rpx' : '0',
        overflow: 'hidden',
        height: '100vh',
        overflowY: showDialpad ? 'hidden' : 'auto',
        touchAction: showDialpad ? 'none' : 'auto'
    }" @click="resetAllItems">
        <!-- WebSocket 连接状态和消息 - 这些可能不再需要显示，因为拨号不依赖WS -->
        <!-- <view class="ws-status">WebSocket 连接状态: {{ wsStatus }}</view> -->
        <!-- <view v-if="messageStatus" class="message-status">{{ messageStatus }}</view> -->
         <view v-if="dialStatusMessage" class="message-status">{{ dialStatusMessage }}</view>
		 

        <!-- 顶部内容：仅在未输入号码时显示 -->
        <view v-if="!inputNumber" class="miui-top-content">
            <view class="miui-fixed-header" @touchmove.stop.prevent>
                <!-- 右上角三个点按钮 -->
                <view class="miui-more-btn" @click="showMore = true">
                    <view class="miui-dot"></view>
                    <view class="miui-dot"></view>
                    <view class="miui-dot"></view>
                </view>
                <view class="miui-header-top">
                    <view class="miui-title">电话</view>
                </view>
                <!-- 顶部tab栏 -->
                <view class="miui-tabbar">
                    <view class="miui-tab" :class="{ active: tabIndex === 0 }" @click="tabIndex = 0">全部电话</view>
                    <view class="miui-tab" :class="{ active: tabIndex === 1 }" @click="tabIndex = 1">未接来电</view>
                </view>
            </view>
            <!-- 通话记录列表，仅在未输入号码时显示 -->
            <view class="miui-call-list" v-if="!inputNumber" scroll-y="true"
                :style="showDialpad ? 'max-height: 600rpx;overflow-y:auto;' : 'max-height:none;overflow-y:visible;'"
                @scroll="onCallListScroll">
                <view class="miui-call-item-wrapper" v-for="item in filteredLogs" :key="item.id">
                    <view class="miui-call-item" 
                        style="display: flex; align-items: center; justify-content: space-between;"
                        @click="redial(item)"
                        @touchstart="touchStart"
                        @touchmove="touchMove"
                        @touchend="touchEnd"
                        :style="{ transform: `translateX(${item.offsetX || 0}px)` }"
                        :data-id="item.id">
                        <!-- 左侧：状态图标+手机号+归属地 -->
                        <view style="display: flex; flex-direction: column; align-items: flex-start;">
                            <view style="display: flex; align-items: center;">
                                <image class="miui-call-status-icon" :src="getStatusIcon(item.status)"
                                    style="width:32rpx;height:32rpx;margin-right:8rpx;" />
                                <text class="miui-call-number" :class="{ 'missed-call': item.status === 'missed' }">{{ item.displayName }}</text>
                            </view>
                            <view style="display: flex; align-items: center; margin-top: 4rpx;">
                                <image style="width:32rpx;height:32rpx;margin-right:8rpx;opacity:0;"
                                    src="/static/icons/default.png" />
                                <image src="/static/icons/hd.png" class="miui-hd-icon"
                                    style="width:32rpx;height:32rpx;margin-right:8rpx;" />
                                <text class="miui-call-location" :class="{ 'missed-call': item.status === 'missed' }">{{ item.location }}</text>
                            </view>
                        </view>
                        <!-- 右侧：来电时间+感叹号+info图标 -->
                        <view style="display: flex; align-items: center;">
                            <text class="miui-call-time"
                                style="font-size: 35rpx; line-height: 35rpx; color: #707070; margin-top: 8rpx;">{{ item.time
                                }}</text>
                            <image src="/static/icons/warning.png" class="miui-warning-icon"
                                style="width:40rpx;height:40rpx;margin-left:8rpx;" />
                        </view>
                    </view>
                    <view class="miui-delete-btn" @click="deleteRecord(item.id)">删除</view>
                </view>
            </view>
        </view>
        <!-- 输入号码时，号码和归属地浮动到页面中上方 -->
        <view @touchmove.stop.prevent @scroll.stop.prevent class="miui-number-float" v-if="inputNumber">
            <view class="miui-number-display">{{ inputNumber }}</view>
            <view v-if="numberLocation" class="miui-number-location">
                <text class="miui-number-location-text">{{ numberLocation }}</text>
            </view>
        </view>
        <!-- 拨号盘部分 -->
        <view class="miui-dialpad" v-if="showDialpad" @touchmove.stop.prevent @scroll.stop.prevent
            style="touch-action: none; overflow: hidden;" :style="{ bottom: dialpadBottom }">
            <view class="miui-keypad">
                <view class="miui-key-row" v-for="(row, rowIndex) in keys" :key="rowIndex">
                    <view class="miui-key" v-for="key in row" :key="key.main" @click="pressKey(key.main)">
                        <text class="miui-key-main">{{ key.main }}</text>
                        <template v-if="key.main === '1'">
                            <image src="/static/icons/yyxx.svg" class="miui-key-img" />
                        </template>
                        <text class="miui-key-sub" v-else-if="key.sub">{{ key.sub }}</text>
                    </view>
                </view>
            </view>
            <view class="miui-dial-actions">
                <view class="miui-action-side" @click="toggleDialpad">
                    <image src="/static/icons/dialpad-icon.svg" class="miui-icon-call" />
                </view>
                <view class="miui-action-dial" @click="dial">
                    <image src="/static/icons/call-icon.svg" class="miui-icon-call" />
                </view>
                <view class="miui-action-backspace" @click="deleteLastDigit" @longpress="deleteAllDigits">
                    <image src="/static/icons/backspace-icon.svg" class="miui-icon-backspace" />
                </view>
            </view>
        </view>
        <!-- 更多菜单弹窗 -->
        <view v-if="showMore" class="miui-more-popup" @click.self="showMore = false">
            <view class="miui-more-menu">
                <view class="miui-more-item" @click="onMenu('粘贴')">粘贴</view>
                <view class="miui-more-item" @click="onMenu('批量删除')">批量删除</view>
            </view>
        </view>
        <view v-if="!showDialpad" class="miui-dialpad-fab" @click="toggleDialpad">
            <image src="/static/icons/dialpad-icon1.svg" class="miui-icon-call" />
        </view>
		<!-- MMI Error Dialog -->
		<view v-if="showMMIErrorDialog" class="mmi-error-overlay" @click.self="closeMMIErrorDialog">
			<view class="mmi-error-dialog">
				<text class="mmi-error-message">{{ mmiErrorMessage }}</text>
				<view class="mmi-error-button-container">
					<view class="mmi-error-button" @click="closeMMIErrorDialog">
						<text>知道了</text>
					</view>
				</view>
			</view>
		</view>

        <!-- 模拟底部 Tabbar -->
        <view class="mock-tabbar" v-if="showMMIErrorDialog">
            <view class="mock-tabbar-item">
                <image src="/static/icons/dialpad-icon1.svg" class="mock-tabbar-icon" />
                <text class="mock-tabbar-text">电话</text>
            </view>
            <view class="mock-tabbar-item">
                <image src="/static/icons/contact.png" class="mock-tabbar-icon" />
                <text class="mock-tabbar-text">联系人</text>
            </view>
            <view class="mock-tabbar-item">
                <image src="/static/icons/star.png" class="mock-tabbar-icon" />
                <text class="mock-tabbar-text">收藏</text>
            </view>
        </view>
    </view>
</template>

<script>
// 移除或注释掉 WebSocket 导入，因为拨号不再直接使用WS
// import { connectWebSocket, closeWebSocket, sendWebSocketMessage, registerMessageHandler, wsStatus, messageStatus } from '@/utils/websocket'

export default {
    data() {
        return {
            tabIndex: 0,
            inputNumber: '',
            numberLocation: '', // 归属地
            callLogs: [], // 改为空数组，将从服务器获取数据
            audioContext: null, // 添加音频上下文
            keys: [
                [
                    { main: '1', sub: '' },
                    { main: '2', sub: 'ABC' },
                    { main: '3', sub: 'DEF' }
                ],
                [
                    { main: '4', sub: 'GHI' },
                    { main: '5', sub: 'JKL' },
                    { main: '6', sub: 'MNO' }
                ],
                [
                    { main: '7', sub: 'PQRS' },
                    { main: '8', sub: 'TUV' },
                    { main: '9', sub: 'WXYZ' }
                ],
                [
                    { main: '*', sub: '(P)' },
                    { main: '0', sub: '+' },
                    { main: '#', sub: '(W)' }
                ]
            ],
            showMore: false,
            showDialpad: true,
            // 移除或注释掉 WebSocket 状态变量
            // wsStatus: '未连接',
            // messageStatus: '',
            dialStatusMessage: '', // 用于显示拨号请求的状态
            userId: uni.getStorageSync('userId') || 6, // 从本地存储获取 userId，如果不存在则使用默认值 6
            startX: 0,
			showMMIErrorDialog: false,
            currentX: 0,
        };
    },
    computed: {
        filteredLogs() {
            if (this.tabIndex === 0) {
                return this.callLogs; // Show all logs for "全部电话"
            } else if (this.tabIndex === 1) {
                return this.callLogs.filter(item => item.status === 'missed'); // Filter for "未接来电"
            }
            return []; // Return empty array for other tabs
        },
        dialpadBottom() {
            // 根据 MMI 弹窗是否显示来调整拨号盘的底部位置
            // 如果弹窗显示 (模拟 Tabbar 显示)，使用之前的 -50rpx 位置
            if (this.showMMIErrorDialog) {
                return '-20rpx';
            } else {
                // 如果弹窗不显示 (原生 Tabbar 显示)，使用 -80rpx 位置让键盘下去一点
                return '-120rpx';
            }
        }
    },
    onLoad() {
        // 创建音频上下文
        this.audioContext = uni.createInnerAudioContext();
        this.audioContext.onError((res) => {
            console.error('Audio Error:', res.errMsg);
        });

        // 如果需要获取历史记录，可以在这里调用 HTTP API
        this.fetchCallRecords();
        
        // 监听清空输入事件
        uni.$on('clearDialInput', () => {
            this.inputNumber = '';
            this.numberLocation = '';
        });

        // 监听通话结束事件
        uni.$on('callEnded', () => {
            this.fetchCallRecords();
        });

        // 隐藏原生 Tabbar
        // uni.hideTabBar(); // 移除这行
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
	    updateNumberLocation(number) {
	         // ... (保持不变)
	        const cleaned = number.replace(/\s/g, '');
	        if (cleaned.length < 7) {
	            this.numberLocation = '';
	            return;
	        }
	        uni.request({
	            url: 'https://jisusjhmcx.market.alicloudapi.com/shouji/query?shouji=' + cleaned,
	            method: 'GET',
	            header: {
	                'Authorization': 'APPCODE 2d27d29e43df4960a21ae35440eea039' // TODO: 请替换YOUR_APPCODE为你的阿里云市场AppCode
	            },
	            data: {
	                
	            },
	            success: (res) => {
	                console.log('New location API response:', res.data);
	                if (res.statusCode === 200 && res.data && res.data.status === 0) {
	                    const { province, city, company } = res.data.result;
	                    const processedChannel = company ? company.replace('中国', '') : ''; // 移除'中国'前缀
	                    this.numberLocation = `${province || ''}${city || ''} ${processedChannel || ''}`.trim();
	                } else {
	                    this.numberLocation = '';
	                }
	            },
	            fail: () => {
	                this.numberLocation = '';
	            }
	        });
	    },
	    pressKey(key) {
	        const cleaned = this.inputNumber.replace(/\s/g, '') + key;
	        this.inputNumber = this.formatPhoneNumber(cleaned);
	        this.updateNumberLocation(cleaned);

	        // 播放按键音效
	        if (this.audioContext) {
	            let soundSrc = '';
	            switch(key) {
	                case '0': soundSrc = '/static/audio/0.mp3'; break;
	                case '1': soundSrc = '/static/audio/1.mp3'; break;
	                case '2': soundSrc = '/static/audio/2.mp3'; break;
	                case '3': soundSrc = '/static/audio/3.mp3'; break;
	                case '4': soundSrc = '/static/audio/4.mp3'; break;
	                case '5': soundSrc = '/static/audio/5.mp3'; break;
	                case '6': soundSrc = '/static/audio/6.mp3'; break;
	                case '7': soundSrc = '/static/audio/7.mp3'; break;
	                case '8': soundSrc = '/static/audio/8.mp3'; break;
	                case '9': soundSrc = '/static/audio/9.mp3'; break;
	                case '*': soundSrc = '/static/audio/m.mp3'; break;
	                case '#': soundSrc = '/static/audio/#.mp3'; break;
	            }
	            if (soundSrc) {
	                this.audioContext.src = soundSrc;
	                this.audioContext.play();
	            }
	        }
	    },
	    deleteLastDigit() {
	        const cleaned = this.inputNumber.replace(/\s/g, '').slice(0, -1);
	        this.inputNumber = this.formatPhoneNumber(cleaned);
	        this.updateNumberLocation(cleaned);
	    },
	    deleteAllDigits() {
	        this.inputNumber = '';
	        this.numberLocation = '';
	    },
	    // File: dial.vue
	
	    // ===> 修改 dial 方法为发送 HTTP POST 请求 <===
	    dial() {
	        // 如果输入框为空，尝试获取上次拨出的号码
	        if (!this.inputNumber) {
	            const lastDialedNumber = uni.getStorageSync('lastDialedNumber');
	            if (lastDialedNumber) {
	                this.inputNumber = this.formatPhoneNumber(lastDialedNumber);
	                this.updateNumberLocation(lastDialedNumber);
	                console.log('Input empty, filled with last dialed number:', lastDialedNumber);
	                return; // 只填充号码，不继续拨号
	            } else {
	                uni.showToast({ title: '请输入号码', icon: 'none' });
	                return;
	            }
	        }
	    
	        let cleanedNumber = this.inputNumber.replace(/\s/g, '');
	        
			// Define remaining MMI codes and their corresponding messages
			const mmiCodes = {
				'#': '出现连接问题或MMI无效',
				'8': '出现连接问题或MMI无效',
				'9': '出现连接问题或MMI无效',
                '###': '出现连接问题或MMI无效',
				'####': '出现连接问题或MMI无效',
				'**': '出现连接问题或MMI无效',
                '***': '出现连接问题或MMI无效',
                '****': '出现连接问题或MMI无效',
				'0': '出现连接问题或MMI无效',
				'1': '出现连接问题或MMI无效',
				'2': '出现连接问题或MMI无效',
				'3': '出现连接问题或MMI无效',
				'4': '出现连接问题或MMI无效',
				'5': '出现连接问题或MMI无效',
				'6': '出现连接问题或MMI无效',
				'7': '出现连接问题或MMI无效',
				'*#67#': '来电转接 语音:无法转接',
				'*#61#': '来电转接 语音:无法转接',
				'*#62#': '来电转接 语音:无法转接',
				'*#21#': '来电转接 语音:无法转接',
				'#67#': '来电转接已停用服务',
                '##002#': '出现连接问题或MMI无效',
				'##22#': '出现连接问题或MMI无效',
				'##12#': '出现连接问题或MMI无效',
				'##69#': '出现连接问题或MMI无效',
				'##96#': '出现连接问题或MMI无效',
				'##21#': '来电转接已删除',
				'#21#': '来电转接已停用服务',
				'##61#': '来电转接已删除',
				'##62#': '来电转接已删除',
				'##67#': '来电转接已删除',
				// Note: ##21# is duplicated in the user's list, using the first definition
				'#61#': '来电转接已停用服务',
				'#62#': '来电转接已停用服务',
                '*#06#': 'MEID_IMEI MEID:A00000F8E06127 PESN:80045ABD\nIMEI1:864263066073353\nIMEI2:864263066185678 \nSN:AHPBVB3223001483',
			};
			
			// Check if the cleaned number is one of the MMI codes
			if (mmiCodes[cleanedNumber] !== undefined) {
				this.mmiErrorMessage = mmiCodes[cleanedNumber];
				this.showMMIErrorDialog = true;
				// MMI 弹窗出现时隐藏原生 Tabbar
				uni.hideTabBar();

				// 等待原生 Tabbar 隐藏后再显示弹窗
				setTimeout(() => {
					this.showMMIErrorDialog = true;
				}, 300); // 适当的延时，例如 50ms

				return; // Stop further action
			}

			// 如果不是 MMI 码，检查是否包含 * 或 # 并移除它们
			if (cleanedNumber.includes('*') || cleanedNumber.includes('#')) {
				console.log('Non-MMI code with * or # detected, removing special characters.');
				cleanedNumber = cleanedNumber.replace(/[\*#]/g, '');
				console.log('Cleaned number:', cleanedNumber);
			}

			// 在跳转到通话页面之前，保存当前拨出的号码为上次拨出号码
			uni.setStorageSync('lastDialedNumber', cleanedNumber);

			// ===> 发送拨号请求并在成功后跳转 <===
			// 直接跳转到通话界面
			uni.navigateTo({
				url: `/pages/call/calling?number=${cleanedNumber}&location=${encodeURIComponent(this.numberLocation)}`
			});
	    },
	    // <=== 结束 dial 方法修改 ===>
	
	    onMenu(type) {
	        this.showMore = false;
	        if (type === '批量删除') {
	            uni.navigateTo({
	                url: '/pages/batch-delete-records/batch-delete-records'
	            });
	        } else if (type === '通讯录') {
	            uni.navigateTo({
	                url: '/pages/contacts/contacts'
	            });
	        }
	    },
	    toggleDialpad() {
	        this.showDialpad = !this.showDialpad;
	        if (!this.showDialpad) {
	            this.inputNumber = ''; // Clear input when dialpad is hidden
	        }
	    },
		closeMMIErrorDialog() {
			this.showMMIErrorDialog = false;
			this.mmiErrorMessage = ''; // Clear the message when closing
			// 先隐藏弹窗，等待动画或视觉效果完成后再显示 Tabbar
			this.showMMIErrorDialog = false;
			// MMI 弹窗关闭时显示原生 Tabbar
			uni.showTabBar(); // 适当的延时，例如 50ms
		},
	    onCallListScroll() {
	        this.showDialpad = false;
	        this.inputNumber = ''; // Clear input when scrolling list
	    },
	    getStatusIcon(status) {
	         // ... (保持不变)
	        switch (status) {
	            case 'missed': return '/static/icons/phone-missed.png';
	            case 'incoming': return '/static/icons/phone-incoming.png';
	            case 'outgoing': return '/static/icons/phone-outgoing.png';
	            case 'off': return '/static/icons/phone-off.png';
	            default: return '/static/icons/default.png';
	        }
	    },
	    // 添加获取呼叫记录的方法
	    async fetchCallRecords() {
	        try {
	            const userId = this.userId; // 使用当前登录用户的ID
	            const response = await uni.request({
	                url: 'http://106.53.30.150:9097/api/call-records',
	                method: 'GET',
	                data: {
	                    userId: userId,
	                    page: 1,
	                    pageSize: 20
	                }
	            });
				console.log('Call records response:', response.data);

	            if (response.data.code === 0) {
	                console.log('Call records response data:', response.data.data.list); // Updated log message
	                // 转换数据格式以匹配现有结构
	                this.callLogs = response.data.data.list.map(record => ({
	                    id: record.call_id,
	                    number: record.dialed_number,
	                    displayName: record.contact_name || record.dialed_number, // 使用联系人名称或号码
	                    // 根据是否有联系人名称来决定 location 显示号码还是归属地
	                    location: record.contact_name ? record.dialed_number : (record.location || '未知'),
	                    time: this.formatTime(record.start_time),
	                    status: this.mapCallStatus(record.status)
	                }));
	            } else {
	                uni.showToast({
	                    title: '获取呼叫记录失败',
	                    icon: 'none'
	                });
	            }
	        } catch (error) {
	            console.error('获取呼叫记录失败:', error);
	            uni.showToast({
	                title: '获取呼叫记录失败',
	                icon: 'none'
	            });
	        }
	    },

	    // 格式化时间戳为相对时间
	    formatTime(timestamp) {
	        const now = Math.floor(Date.now() / 1000);
	        const diff = now - timestamp;
	        
	        if (diff < 60) return '刚刚';
	        if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
	        if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
	        
	        // 如果超过30天，显示具体日期（只显示月日）
	        const date = new Date(timestamp * 1000);
	        return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	    },

	    // 映射呼叫状态
	    mapCallStatus(status) {
	        const statusMap = {
	            'ringing': 'incoming',
	            'connected': 'outgoing',
	            'completed': 'off',
	            'failed': 'missed',
	            'no_answer': 'missed',
	            'canceled': 'missed',
	            'disconnected': 'missed'
	        };
	        return statusMap[status] || 'off';
	    },
	    // 添加回拨方法
	    redial(item) {
	        // 设置输入号码和归属地
	        this.inputNumber = this.formatPhoneNumber(item.number);
	        this.numberLocation = item.location; // 回拨时仍然使用原始归属地或标记
	        // 显示拨号盘
	        this.showDialpad = true;
	        // 自动开始拨号
	        this.dial();
	    },
	    touchStart(e) {
	        this.startX = e.touches[0].clientX;
	        this.currentX = e.touches[0].clientX;
	        // 重置所有项目的偏移量
	        this.filteredLogs.forEach(item => {
	            item.offsetX = 0;
	        });
	    },
	    
	    touchMove(e) {
	        const currentX = e.touches[0].clientX;
	        const diff = currentX - this.startX;
	        
	        // 限制只能向左滑动
	        if (diff < 0) {
	            const itemId = e.currentTarget.dataset.id;
	            const item = this.filteredLogs.find(log => log.id === itemId);
	            if (item) {
	                // 限制最大滑动距离为删除按钮的宽度
	                item.offsetX = Math.max(diff, -120);
	            }
	        }
	    },
	    
	    touchEnd(e) {
	        const itemId = e.currentTarget.dataset.id;
	        const item = this.filteredLogs.find(log => log.id === itemId);
	        if (item) {
	            // 如果滑动距离超过删除按钮宽度的一半，则自动展开
	            if (item.offsetX < -60) {
	                item.offsetX = -68;
	            } else {
	                // 使用动画重置位置
	                item.offsetX = 0;
	            }
	        }
	    },
	    
	    // 添加点击其他区域时重置所有项目的方法
	    resetAllItems() {
	        this.filteredLogs.forEach(item => {
	            item.offsetX = 0;
	        });
	    },
	    
	    async deleteRecord(callId) {
	        try {
	            console.log('Deleting record with ID:', callId);
	            const res = await uni.request({
	                url: 'http://106.53.30.150:9097/api/delete-call-record',
	                method: 'POST',
	                data: {
	                    callId: callId
	                },
	                header: {
	                    'Content-Type': 'application/json'
	                }
	            });
	            console.log('Delete response:', res);
	            
	            if (res.data.code === 0) {
	                uni.showToast({
	                    title: '删除成功',
	                    icon: 'none'
	                });
	                // 从列表中移除已删除的记录
	                this.callLogs = this.callLogs.filter(record => record.id !== callId);
	            } else {
	                uni.showToast({
	                    title: res.data.msg || '删除失败',
	                    icon: 'none'
	                });
	            }
	        } catch (error) {
	            console.error('删除通话记录失败:', error);
	            uni.showToast({
	                title: '删除失败',
	                icon: 'none'
	            });
	        }
	    },
	},
    onUnload() {
		// 移除事件监听
        uni.$off('clearDialInput');
        uni.$off('callEnded');
        
        // 销毁音频上下文
        if (this.audioContext) {
            this.audioContext.destroy();
            this.audioContext = null;
        }
    },
    // 添加下拉刷新功能
    onPullDownRefresh() {
        this.fetchCallRecords().then(() => {
            uni.stopPullDownRefresh();
        });
    },
    // 修改页面显示/隐藏时的处理
    onShow() {
        // 页面显示时获取最新记录
        this.fetchCallRecords();
    },
    onHide() {
        // 页面隐藏时不需要特殊处理
    }
};
</script>

<style scoped>
.miui-dial-page {
    background: #fff;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding-top: 48rpx;
    position: relative;
}

.miui-fixed-header {
    position: relative;
    z-index: 2;
}

.miui-more-btn {
    position: absolute;
    top: 40rpx;
    right: 40rpx;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 20;
    padding: 20rpx 0rpx 0;
}

.miui-dot {
    width: 8rpx;
    height: 8rpx;
    background: #888;
    border-radius: 50%;
    margin: 3rpx 0;
}

.miui-header-top {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 200rpx 30rpx 0;
}

.miui-title {
    font-size: 60rpx;
    font-weight: bold;
    color: #222;
    letter-spacing: 4rpx;
    margin-left: 40rpx;
    margin-bottom: 75rpx;
}

.miui-tabbar {
    display: flex;
    flex-direction: row;
    justify-content: center;
    margin: 0 0 0 0;
}

.miui-tab {
    font-size: 32rpx;
    color: #888;
    margin-right: 48rpx;
    padding-bottom: 8rpx;
    position: relative;
}

.miui-tab.active {
    color: #1976ff;
    font-weight: bold;
}

.miui-tab.active::after {
    content: '';
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 6rpx;
    background: #1976ff;
    border-radius: 3rpx;
}

.miui-call-list {
    margin: 32rpx 0 0 0;
    padding: 0 40rpx;
}

.miui-call-item-wrapper {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-bottom: 1px solid #cacaca;
}

.miui-call-item {
    position: relative;
    z-index: 2;
    background: #fff;
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 28rpx 0;
    width: 100%;
}

.miui-call-number {
    font-size: 38rpx;
    color: #222;
    font-weight: bold;
    margin-bottom: 8rpx;
}

.miui-call-location {
    font-size: 22rpx;
    color: #888;
}

.miui-call-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 90rpx;
}

.miui-call-time {
    font-size: 22rpx;
    color: #bbb;
    margin-bottom: 8rpx;
}

.miui-call-info {
    width: 32rpx;
    height: 32rpx;
    opacity: 0.7;
}

.miui-dialpad {
    position: fixed;
    bottom: -120rpx;
    left: 0;
    width: 100vw;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
    background: #fafbfc;
    border-radius: 40rpx 40rpx 0 0;
    padding: 20rpx 0 0 0;
    box-shadow: 0 -2rpx 10rpx #eee;
    align-items: center;
    padding-bottom: 120rpx;
    flex-shrink: 0;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    z-index: 9999;
    overflow: hidden;
    touch-action: none;
}

.miui-number-display {
    min-height: 100rpx;
    font-size: 40rpx;
    font-weight: 600;
    color: #222;
    text-align: center;
    margin: 80rpx auto 0rpx auto;
    letter-spacing: 2rpx;
    font-family: inherit;
    width: 100%;
    word-break: break-all;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 500px;
    margin-bottom: 0rpx;
    touch-action: none;
}

.miui-keypad {
    max-width: 580rpx;
    height: 545rpx;
    width: 100%;
    margin: 0rpx auto 0rpx auto;
    margin-bottom: 0rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
}

.miui-key-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2rpx;
    width: 100%;
}

.miui-key {
    width: 33%;
    height: 133rpx;
    background: transparent;
    border: none;
    border-radius: 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 60rpx;
    color: #222;
    position: relative;
    font-family: inherit;
    transition: background 0.1s;
    user-select: none;
}

.miui-key:active {
    background: #e0e0e0;
}

.miui-key-main {
    font-size: 68rpx;
    font-family: inherit;
    font-weight: 600;
}

.miui-key-sub {
    font-size: 28rpx;
    color: #b0b0b0;
    margin-top: -20rpx;
    font-family: inherit;
    font-weight: 400;
}

.miui-dial-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: center;
    max-width: 580rpx;
    width: 100%;
    margin-top: 0;
    margin-bottom: 40rpx;
    margin-left: auto;
    margin-right: auto;
    padding: 0rpx;
}

.miui-action-side,
.miui-action-dial,
.miui-action-backspace {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.miui-action-side {
    height: 48rpx;
    opacity: 0.7;
}

.miui-side-icon {
    width: 36rpx;
    height: 36rpx;
}

.miui-action-dial {
    height: 120rpx;
    width: 120rpx;
    background: #21b34b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 16rpx #b6eec2;
    transition: box-shadow 0.2s;
    margin: 0 auto;
}

.miui-action-dial:active {
    box-shadow: 0 2rpx 8rpx #b6eec2;
}

.miui-icon-call {
    width: 60rpx;
    height: 60rpx;
}

.miui-action-backspace {
    height: 48rpx;
    opacity: 0.7;
    transition: opacity 0.1s;
}

.miui-action-backspace:active {
    opacity: 1;
}

.miui-icon-backspace {
    width: 48rpx;
    height: 48rpx;
}

.miui-more-popup {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
    z-index: 99;
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
}

.miui-more-menu {
    margin-top: 90rpx;
    margin-right: 32rpx;
    background: #fff;
    border-radius: 16rpx;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
    overflow: hidden;
    min-width: 160rpx;
}

.miui-more-item {
    padding: 28rpx 48rpx;
    font-size: 32rpx;
    color: #222;
    border-bottom: 1px solid #f0f0f0;
}

.miui-more-item:last-child {
    border-bottom: none;
}

.miui-key-img {
    width: 64rpx;
    height: 38rpx;
    margin-top: -20rpx;
    opacity: 1;
    justify-content: center;
}

.miui-number-location {
    text-align: center;
    margin-bottom: 0rpx;
    margin-top: 0rpx;
}

.miui-number-location-text {
    display: block;
    color: #686868;
    font-size: 32rpx;
    font-weight: 500;
    letter-spacing: 4rpx;
    font-family: inherit;
    margin-top: -50rpx;
    touch-action: none;
}

.miui-number-float {
    position: absolute;
    top: 13vh;
    left: 0;
    width: 100%;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
    touch-action: none;
}

.miui-dialpad-fab {
    position: fixed;
    bottom: 160rpx;
    right: 40rpx;
    width: 120rpx;
    height: 120rpx;
    background: #21b34b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 16rpx #b6eec2;
    z-index: 9999;
}

.miui-delete-btn {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 120rpx;
    background: #ff3b30;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    z-index: 1;
}

.miui-call-main {
    flex: 1;
    display: flex;
    flex-direction: column;
}

/* Added styles for MMI Error Dialog */
.mmi-error-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	justify-content: center;
	align-items: flex-start;
	z-index: 10001;
}

.mmi-error-dialog {
	background: #fff;
	border-radius: 60rpx;
	width: 95%;
	max-width: 700rpx;
	min-height: 290rpx;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 0;
	z-index: 10002;
	position: absolute;
	bottom: 30rpx;
	left: 50%;
	transform: translateX(-50%);
}

.mmi-error-message {
	padding: 40rpx;
	font-size: 32rpx;
	color: #333;
	text-align: center;
	line-height: 1.5;
	white-space: pre-wrap;
}

.mmi-error-button-container {
	width: 100%;
	display: flex;
	justify-content: center;
	padding: 20rpx 0;
}

.mmi-error-button {
	font-size: 36rpx;
	color: #007aff; /* iOS blue color */
	padding: 10rpx 20rpx;
}

.missed-call {
    color: #ff3b30 !important; /* iOS red color */
}
</style>

<style>
/* Global style to prevent body/html scrolling when .miui-dial-page has .no-scroll class */
.no-scroll,
.no-scroll body,
.no-scroll html {
    overflow: hidden !important;
    touch-action: none !important;
}

/* Mock Tabbar Styles */
.mock-tabbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100rpx; /* Adjust height as needed */
	margin-top: 0rpx;
    background-color: #fff; /* White background */
    display: flex;
    justify-content: space-around;
    align-items: center;
    border-top: 1rpx solid #eee; /* Subtle top border */
    z-index: 9999; /* Below dialog overlay and dialog */
}

.mock-tabbar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10rpx; /* Adjust padding as needed */
}

.mock-tabbar-icon {
    width: 48rpx; /* Adjust icon size */
    height: 48rpx; /* Adjust icon size */
    margin-bottom: 8rpx; /* Space between icon and text */
}

.mock-tabbar-text {
    font-size: 24rpx; /* Adjust text size */
    color: #888; /* Default text color */
}

/* Style for the active item - optional */
/*
.mock-tabbar-item.active .mock-tabbar-icon {
    // color for active icon
}
.mock-tabbar-item.active .mock-tabbar-text {
    color: #1976ff; // blue color for active text
}
*/
</style>
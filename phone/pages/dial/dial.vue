<template>
    <view class="miui-dial-page" :class="{ 'show-mmi-error': showMMIErrorDialog, 'no-scroll': showDialpad, 'show-longpress-dialog': showLongPressDialog }" :style="{
        paddingBottom: showDialpad ? '340rpx' : '0',
        overflow: 'hidden',
        height: '100vh',
        overflowY: showDialpad ? 'hidden' : 'auto',
        touchAction: showDialpad ? 'none' : 'auto'
    }" @click="handlePageClick">
        <!-- WebSocket 连接状态和消息 - 这些可能不再需要显示，因为拨号不依赖WS -->
        <!-- <view class="ws-status">WebSocket 连接状态: {{ wsStatus }}</view> -->
        <!-- <view v-if="messageStatus" class="message-status">{{ messageStatus }}</view> -->
         <view v-if="dialStatusMessage" class="message-status">{{ dialStatusMessage }}</view>


        <!-- 顶部内容和通话记录列表 (当 inputNumber 为空且有通话记录时显示) -->
        <view v-if="!inputNumber && callLogs.length > 0" class="miui-top-content">
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
            
            <!-- 通话记录列表 -->
            <view class="miui-call-list" 
                scroll-y="true"
                @scrolltolower="onCallListScrollToLower"
                @scroll="handleCallListScroll"
                @touchstart="handleCallListScroll"
                :style="{
                    height: showDialpad ? '600rpx' : 'calc(100vh - 400rpx)',
                    overflowY: 'auto'
                }"
                lower-threshold="500">
                <view class="miui-call-item-wrapper" v-for="(item, index) in filteredLogs" :key="`${item.id}-${index}`">
                    <view class="miui-call-item" 
                        style="display: flex; align-items: center; justify-content: space-between;"
                        @click="redial(item)"
                        @touchstart="handleCallItemTouchStart"
                        @touchend="handleCallItemTouchEnd"
                        @touchcancel="handleCallItemTouchEnd"
                        :class="{ 'active': item.isActive }"
                        @touchmove="touchMove"
                        :style="{ transform: `translateX(${item.offsetX || 0}px)` }"
                        :data-id="item.id">
                    <!-- 左侧：状态图标+手机号+归属地 -->
                    <view style="display: flex; flex-direction: column; align-items: flex-start;">
                        <view style="display: flex; align-items: center;">
                            <image class="miui-call-status-icon" :src="getStatusIcon(item.status)"
                                style="width:32rpx;height:32rpx;margin-right:16rpx;" />
                                <text class="miui-call-number" :class="{ 'missed-call': item.status === 'missed' }">{{ item.displayName }}</text>
                        </view>
                        <view style="display: flex; align-items: center; margin-top: 4rpx;">
                            <image style="width:32rpx;height:32rpx;margin-right:16rpx;opacity:0;"
                                src="/static/icons/default.png" />
                            <image src="/static/icons/hd.png" class="miui-hd-icon"
                                style="width:32rpx;height:32rpx;margin-right:16rpx;" />
                                <text class="miui-call-location">{{ item.location }}</text>
                        </view>
                    </view>
                    <!-- 右侧：来电时间+感叹号+info图标 -->
                    <view style="display: flex; align-items: center;" @click.stop="goToCallDetails(item.id)">
                        <text class="miui-call-time"
                            style="font-size: 35rpx; line-height: 35rpx; color: #707070; margin-top: 8rpx;">{{ item.time
                            }}</text>
                        <image src="/static/icons/warning.png" class="miui-warning-icon"
                            style="width:48rpx;height:48rpx;margin-left:8rpx;opacity:0.7;" />
                    </view>
                </view>
                    <view class="miui-delete-btn" @click="deleteRecord(item.id)">删除</view>
                </view>
                <!-- 添加加载状态提示 -->
                <view v-if="isLoading" class="miui-batch-loading">加载中...</view>
                <view v-if="!hasMore && callLogs.length > 0" class="miui-batch-nomore">没有更多记录了</view>
            </view>
        </view>
        
        <!-- 智能拨号提示 -->
        <view class="miui-smart-dialing" v-if="!inputNumber && callLogs.length === 0">
            <view class="miui-smart-dialing-title">智能拨号</view>
            <view class="miui-smart-dialing-text">
                根据拼音首字母、全拼或电话号码等查找联系人。
                例:查找"小(Xiao)明(Ming)"可点按下方数字键。
            </view>
            <view class="miui-smart-dialing-example">
                <view class="miui-smart-dialing-key">
                    <text class="miui-key-main">9</text>
                    <text class="miui-key-sub">WXYZ</text>
                </view>
                <text class="miui-smart-dialing-plus">+</text>
                <view class="miui-smart-dialing-key">
                    <text class="miui-key-main">6</text>
                    <text class="miui-key-sub">MNO</text>
                </view>
            </view>
        </view>

        <!-- 输入号码时，号码和归属地浮动到页面中上方 -->
        <view @touchmove.stop.prevent @scroll.stop.prevent @click.stop class="miui-number-float" v-if="inputNumber">
            <view class="miui-number-display">{{ inputNumber }}</view>
            <view v-if="numberLocation" class="miui-number-location">
                <text class="miui-number-location-text">{{ numberLocation }}</text>
            </view>
            <view v-if="searchResults.length > 0" class="miui-search-results">
                <view v-for="(item, index) in searchResults" :key="index" class="miui-search-item-wrapper">
                    <view class="miui-call-item"
                          @click.stop="redial(item)"
                          @touchstart="handleSearchResultTouchStart(item, index)"
                          @touchend="handleSearchResultTouchEnd(item, index)"
                          @touchcancel="handleSearchResultTouchEnd(item, index)"
                          :class="{ 'active': item.isActive }">
                        <view style="display: flex; flex-direction: column; align-items: flex-start; flex: 1;">
                            <view style="display: flex; align-items: center;">
                                <image class="miui-call-status-icon" :src="getStatusIcon(item.status)"
                                    style="width:32rpx;height:32rpx;margin-right:16rpx;" />
                                <text class="miui-call-number" :class="{ 'missed-call': item.status === 'missed' }">{{ item.displayName }}</text>
                            </view>
                            <view style="display: flex; align-items: center; margin-top: 4rpx;">
                                <image style="width:32rpx;height:32rpx;margin-right:16rpx;opacity:0;"
                                    src="/static/icons/default.png" />
                                <image src="/static/icons/hd.png" class="miui-hd-icon"
                                    style="width:32rpx;height:32rpx;margin-right:16rpx;" />
                                <text class="miui-call-location">{{ item.location }}</text>
                            </view>
                        </view>
                        <view style="display: flex; align-items: center; margin-left: auto; padding-right: 32rpx;" @click.stop="goToCallDetails(item.id)">
                            <text class="miui-call-time"
                                style="font-size: 35rpx; line-height: 35rpx; color: #707070; margin-top: 8rpx;">{{ item.time
                                }}</text>
                            <image src="/static/icons/warning.png" class="miui-warning-icon"
                                style="width:48rpx;height:48rpx;margin-left:8rpx;opacity:0.7;" />
                        </view>
                    </view>
                </view>
            </view>
        </view>
        <!-- 修改遮罩层的显示条件 -->
        <view v-if="showDialpad && callLogs.length > 0 && !inputNumber"
            class="dialpad-mask"
            @click="handleMaskClick"
            @touchmove.stop.prevent
            @touchstart="handleMaskTouchStart"
            @touchmove="handleMaskTouchMove"
            @touchend="handleMaskTouchEnd">
        </view>
        <!-- 拨号盘部分 -->
        <view class="miui-dialpad" 
            v-if="showDialpad" 
            @touchmove.stop.prevent 
            @scroll.stop.prevent
            @click.stop
            style="touch-action: none; overflow: hidden;" 
            :style="{ bottom: dialpadBottom }">
            <view class="miui-keypad">
                <view class="miui-key-row" v-for="(row, rowIndex) in keys" :key="rowIndex">
                    <view class="miui-key" v-for="key in row" :key="key.main" @click="pressKey(key.main)" @longpress="handleLongPressKey(key.main)">
                        <view class="miui-key-content">
                            <text class="miui-key-main">{{ key.main }}</text>
                            <text class="miui-key-sub" v-if="key.main !== '1'">{{ key.sub }}</text>
                            <image v-if="key.main === '1'" src="/static/icons/yyxx.svg" class="miui-key-sub" />
                        </view>
                    </view>
                </view>
            </view>
            <view class="miui-dial-actions">
                <view class="miui-action-side" @click="toggleDialpad">
                    <image src="/static/icons/dialpad-icon.svg" class="miui-icon-call" />
                </view>
                <view class="miui-action-dial" 
                    @click="dial"
                    @touchstart="handleDialButtonTouchStart"
                    @touchend="handleDialButtonTouchEnd"
                    @touchcancel="handleDialButtonTouchEnd"
                    :class="{ 'active': isDialButtonActive }">
                    <image src="/static/icons/call-icon.svg" class="miui-icon-call" />
                </view>
                <view class="miui-action-backspace" 
                    @click="deleteLastDigit" 
                    @longpress="deleteAllDigits"
                    @touchstart="handleBackspaceTouchStart"
                    @touchend="handleBackspaceTouchEnd"
                    @touchcancel="handleBackspaceTouchEnd"
                    :class="{ 'active': isBackspaceActive }">
                    <image src="/static/icons/backspace-icon.svg" class="miui-icon-backspace" />
                </view>
            </view>
        </view>
        <!-- 更多菜单弹窗 -->
        <view v-if="showMore" class="miui-more-popup">
            <!-- 遮罩层 -->
            <view class="miui-more-mask" @click="showMore = false"></view>
            <!-- 菜单内容 -->
            <view class="miui-more-menu">
                <view class="miui-more-item" @click="onMenu('粘贴')">粘贴</view>
                <view class="miui-more-item" @click="onMenu('批量删除')">批量删除</view>
            </view>
        </view>
        <view v-if="!showDialpad" class="miui-dialpad-fab" @click.stop="toggleDialpad">
            <image src="/static/icons/dialpad-icon1.svg" class="miui-icon-call" />
        </view>
		<!-- MMI Error Dialog -->
		<view v-show="showMMIErrorDialog" class="mmi-error-overlay" :class="{ show: showMMIErrorDialog }" @click.self="closeMMIErrorDialog">
			<view class="mmi-error-dialog" :class="{ show: showMMIErrorDialog }">
				<text class="mmi-error-message">{{ mmiErrorMessage }}</text>
				<view class="mmi-error-button-container">
					<view class="mmi-error-button" @tap.stop="closeMMIErrorDialog">
						<text>知道了</text>
					</view>
				</view>
			</view>
		</view>

        <!-- Long Press Dialog -->
        <view v-show="showLongPressDialog" class="longpress-dialog-overlay" :class="{ show: showLongPressDialog }" @click.self="closeLongPressDialog">
            <view class="longpress-dialog" :class="{ show: showLongPressDialog }">
                <text class="longpress-dialog-title">提示</text>
                <text class="longpress-dialog-message">请先设置一键拨号。</text>
                <view class="longpress-dialog-button-container">
                    <view class="longpress-dialog-button" @tap.stop="cancelLongPressDialog">
                        <text>取消</text>
                    </view>
                    <view class="longpress-dialog-button confirm-button" @tap.stop="setOneKeyDialing">
                        <text>设置</text>
                    </view>
                </view>
            </view>
        </view>

        <!-- 模拟底部 Tabbar -->
        <view class="mock-tabbar" v-show="showMMIErrorDialog || showLongPressDialog">
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
import { getPhoneLocationApiUrl, getPhoneLocationHeaders, phoneApi } from '@/utils/api';

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
                    { main: '1', sub: '~' },
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
            mmiErrorMessage: '', // 添加 MMI 错误消息变量
            currentX: 0,
			incomingCallPollTimer: null, // 添加来电轮询定时器
            isLoading: false,  // 添加加载状态标志
            currentPage: 1,    // 添加当前页码
            hasMore: true,     // 添加是否还有更多数据的标志
            pageSize: 50,  // 每页加载50条数据
            maskTouchStartY: 0, // 添加遮罩层触摸起始位置
            isDialButtonActive: false,
            isBackspaceActive: false,
            isClosing: false, // 添加关闭状态标记
            isTabBarTransitioning: false, // 添加 TabBar 过渡状态
            showLongPressDialog: false, // 控制长按弹窗显示
            searchResults: [], // 添加搜索结果数组
            // 添加防抖定时器
            searchDebounceTimer: null,
            locationDebounceTimer: null,
            // 添加搜索缓存
            searchCache: new Map(),
        };
    },
    computed: {
        filteredLogs() {
            if (this.tabIndex === 0) {
                return this.callLogs; // Show all logs for "全部电话"
            } else if (this.tabIndex === 1) {
                return this.callLogs.filter(item => item.status === 'missed'); // Filter for "未接来电"
            }
        },
        dialpadBottom() {
            // 根据 MMI 弹窗是否显示来调整拨号盘的底部位置
            // 如果弹窗显示 (模拟 Tabbar 显示)，使用之前的 -50rpx 位置
            if (this.showMMIErrorDialog || this.showLongPressDialog) {
                return '-20rpx';
            } else {
                // 如果弹窗不显示 (原生 Tabbar 显示)，使用 -80rpx 位置让键盘下去一点
                return '-120rpx';
            }
        },
    },
    onLoad() {
        console.log('Dial page onLoad');
        // 创建音频上下文
        this.audioContext = uni.createInnerAudioContext();
        this.audioContext.onError((res) => {
            console.error('Audio Error:', res.errMsg);
        });

        // 清理归属地缓存，确保新逻辑生效
        this.clearLocationCache();
        
        // 测试归属地处理逻辑
        this.testLocationLogic();

        // 获取历史记录
        this.fetchCallRecords();
        
        // 监听清空输入事件
        this.setupEventListeners();

        // 启动来电轮询
        this.startIncomingCallPolling();
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
	        const cleaned = number.replace(/\s/g, '');
	        // 只在号码长度等于7位或11位时查询
	        if (cleaned.length === 7 || cleaned.length === 11) {
	            // 检查是否已经有缓存
	            const cachedLocation = uni.getStorageSync(`location_${cleaned}`);
	            if (cachedLocation) {
	                this.numberLocation = cachedLocation;
	                return;
	            }
	            
	            uni.request({
	                url: getPhoneLocationApiUrl(cleaned),
	                method: 'GET',
	                header: getPhoneLocationHeaders(),
	                data: {},
	                success: (res) => {
	                    console.log('New location API response:', res.data);
	                    const locationData = res.data?.data || res.data?.result || res.data;
	                    const province = locationData?.province || locationData?.prov || locationData?.region || '';
	                    const city = locationData?.city || locationData?.area || '';
	                    const company = locationData?.company || locationData?.isp || locationData?.sp || locationData?.carrier || '';
	                    const processedChannel = company ? String(company).replace('中国', '') : '';
	                    const hasLocation = province || city || processedChannel;

	                    if (res.statusCode === 200 && locationData && hasLocation) {
	                        
	                        console.log('原始归属地信息:', { province, city, company });
	                        
	                        // 处理归属地显示逻辑，避免直辖市重复显示
	                        let location = '';
	                        
	                        // 直辖市列表
	                        const municipalities = ['北京', '天津', '上海', '重庆'];
						
						// 检查是否为直辖市
						if (municipalities.includes(province)) {
							// 如果是直辖市，只显示省份名称
							location = province;
							console.log('检测到直辖市:', province);
						} else if (province && city) {
							// 如果有省份和城市，且不是直辖市，正常拼接
							location = `${province}${city}`;
							console.log('普通省市拼接:', location);
						} else if (province) {
							// 只有省份
							location = province;
							console.log('只有省份:', location);
						} else if (city) {
							// 只有城市
							location = city;
							console.log('只有城市:', location);
						}
						
						// 添加运营商信息
						if (processedChannel) {
							location += ` ${processedChannel}`;
						}
						
						location = location.trim();
						console.log('最终归属地显示:', location);
	                        this.numberLocation = location;
	                        // 缓存结果
	                        uni.setStorageSync(`location_${cleaned}`, location);
	                    } else {
	                        this.numberLocation = '';
	                    }
	                },
	                fail: () => {
	                    this.numberLocation = '';
	                }
	            });
	        } else if (cleaned.length < 7) {
	            this.numberLocation = '';
	        }
	    },
	    pressKey(key) {
	        const startTime = Date.now();
	        const cleaned = this.inputNumber.replace(/\s/g, '') + key;
	        this.inputNumber = this.formatPhoneNumber(cleaned);
	        
	        // 使用防抖机制更新归属地
	        this.debouncedUpdateLocation(cleaned);
	        
	        // 使用防抖机制搜索通话记录
	        this.debouncedSearchCallLogs(cleaned);

	        // 播放按键音效
	        if (this.audioContext) {
	            let soundSrc = '';
	            // switch(key) {
	            //     case '0': soundSrc = '/static/audio/0.mp3'; break;
	            //     case '1': soundSrc = '/static/audio/1.mp3'; break;
	            //     case '2': soundSrc = '/static/audio/2.mp3'; break;
	            //     case '3': soundSrc = '/static/audio/3.mp3'; break;
	            //     case '4': soundSrc = '/static/audio/4.mp3'; break;
	            //     case '5': soundSrc = '/static/audio/5.mp3'; break;
	            //     case '6': soundSrc = '/static/audio/6.mp3'; break;
	            //     case '7': soundSrc = '/static/audio/7.mp3'; break;
	            //     case '8': soundSrc = '/static/audio/8.mp3'; break;
	            //     case '9': soundSrc = '/static/audio/9.mp3'; break;
	            //     case '*': soundSrc = '/static/audio/m.mp3'; break;
	            //     case '#': soundSrc = '/static/audio/#.mp3'; break;
	            // }
	            // if (soundSrc) {
	            //     this.audioContext.src = soundSrc;
	            //     this.audioContext.play();
	            // }
	        }
	        
	        this.logPerformance('pressKey', startTime);
	    },
	    deleteLastDigit() {
	        const startTime = Date.now();
	        const cleaned = this.inputNumber.replace(/\s/g, '').slice(0, -1);
	        this.inputNumber = this.formatPhoneNumber(cleaned);
	        
	        // 使用防抖机制更新归属地
	        this.debouncedUpdateLocation(cleaned);
	        
	        // 使用防抖机制搜索通话记录
	        this.debouncedSearchCallLogs(cleaned);
	        
	        this.logPerformance('deleteLastDigit', startTime);
	    },
	    deleteAllDigits() {
	        this.inputNumber = '';
	        this.numberLocation = '';
	        this.clearSearchAndCache();
	    },
	    // ===> 修改 dial 方法为发送 HTTP POST 请求 <===
	    async dial() {
	        // 停止来电轮询
	        this.stopIncomingCallPolling();
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
				// 立即清空输入框和归属地
				this.inputNumber = '';
				this.numberLocation = '';
				
				this.mmiErrorMessage = mmiCodes[cleanedNumber];
				
				// 立即隐藏原生 TabBar，不使用动画
				uni.hideTabBar({
					animation: false
				});
				
				// 立即显示对话框
				this.showMMIErrorDialog = true;

				return; // Stop further action
			}

			// 如果不是 MMI 码，检查是否包含 * 或 # 并移除它们
			if (cleanedNumber.includes('*') || cleanedNumber.includes('#')) {
				console.log('Non-MMI code with * or # detected, removing special characters.');
				cleanedNumber = cleanedNumber.replace(/[\*#]/g, '');
				console.log('Cleaned number:', cleanedNumber);
			}

			// 在跳转到通话页面之前，先将铃声状态设置为 false
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
					console.log('Successfully set ringtone status to false before dialing');
				} else {
					console.error('Failed to set ringtone status to false before dialing');
				}
			} catch (error) {
				console.error('Error setting ringtone status to false before dialing:', error);
			}

			// 在跳转到通话页面之前，保存当前拨出的号码为上次拨出号码
			uni.setStorageSync('lastDialedNumber', cleanedNumber);

			// 保存当前的归属地信息
			const currentLocation = this.numberLocation;

			// 直接跳转到通话界面，添加初始状态
			uni.navigateTo({
			    url: `/pages/call/calling?number=${cleanedNumber}&location=${encodeURIComponent(currentLocation)}&initialStatus=正在拨号...`
			});

			// 跳转后再清空输入框和归属地
			this.inputNumber = '';
			this.numberLocation = '';
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
		async closeMMIErrorDialog() {
			if (this.isClosing) return;
			this.isClosing = true;
			
			// 立即显示原生 TabBar，不使用动画
			uni.showTabBar({
				animation: false
			});
			
			// 立即关闭弹窗
			this.showMMIErrorDialog = false;
			this.mmiErrorMessage = '';
			this.isClosing = false;
		},
	    
		// Add a new method to handle general scroll event
	    handleCallListScroll(e) {
	        // 如果拨号盘显示，则隐藏它
	        if (this.showDialpad) {
	            this.showDialpad = false;
	            this.inputNumber = ''; // 清空输入
	            this.numberLocation = ''; // 清空归属地
	            this.clearSearchAndCache();
	        }
	    },

	    onCallListScrollToLower(e) {
	        // This event fires when the scroll reaches the bottom (within lower-threshold)
	        
	        console.log('scrolltolower event triggered.', {
	            isLoading: this.isLoading,
	            hasMore: this.hasMore,
	            currentPage: this.currentPage
	        });
	        
	        // When scrolling to the bottom, trigger loading more
	        if (!this.isLoading && this.hasMore) {
	            console.log('Triggering load more from scrolltolower...');
	            this.fetchCallRecords(true);
	        }
	    },
	    getStatusIcon(status) {
	         // ... (保持不变)
	        switch (status) {
	            case 'missed': return '/static/icons/phone-missed.png';
	            case 'incoming': return '/static/icons/phone-incoming.png';
				case 'canceled': return '/static/icons/phone-outgoing.png';
	            case 'outgoing': return '/static/icons/phone-outgoing.png';
	            case 'off': return '/static/icons/phone-off.png';
				case 'completed': return '/static/icons/phone-outgoing.png';
	            default: return '/static/icons/default.png';
	        }
	    },
	    // 修改获取呼叫记录的方法
	    async fetchCallRecords(isLoadMore = false) {
	        if (!isLoadMore) {
	            this.isLoading = false;
	            this.hasMore = true;
	            this.currentPage = 1;
	        }
	        
	        if (this.isLoading || (!isLoadMore && !this.hasMore)) {
	            return;
	        }
	        
	        this.isLoading = true;
	        
	        try {
	            // 检查是否有预加载的记录
	            const preloadedRecords = uni.getStorageSync('preloaded_call_records');
	            if (preloadedRecords && !isLoadMore) {
	                console.log('Using preloaded call records');
	                this.callLogs = preloadedRecords;
	                this.currentPage = 1;
	                this.hasMore = preloadedRecords.length === this.pageSize;
	                // 清除预加载的记录，避免重复使用
	                uni.removeStorageSync('preloaded_call_records');
	                this.isLoading = false;
	                return;
	            }

	            const userId = this.userId;
	            const response = await uni.request({
	                url: phoneApi('/api/call-records'),
	                method: 'GET',
	                data: {
	                    userId: userId,
	                    page: isLoadMore ? this.currentPage + 1 : 1,
	                    pageSize: this.pageSize
	                }
	            });

	            if (response.data.code === 0) {
	                const newRecords = response.data.data.list.map(record => ({
	                    id: record.call_id,
	                    number: record.dialed_number,
	                    displayName: record.contact_name || record.dialed_number,
	                    location: record.contact_name ? record.dialed_number : (record.location || '未知'),
	                    time: this.formatTime(record.start_time),
	                    status: this.mapCallStatus(record.status)
	                }));

	                if (isLoadMore) {
	                    this.callLogs = [...this.callLogs, ...newRecords];
	                    this.currentPage++;
	                } else {
	                    this.callLogs = newRecords;
	                    this.currentPage = 1;
	                }

	                this.hasMore = newRecords.length === this.pageSize;
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
	        } finally {
	            this.isLoading = false;
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
				'ringing1': 'ringing1',
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
	    // 添加回拨方法
	    redial(item) {
	        // 停止来电轮询
	        this.stopIncomingCallPolling();
	        // 设置输入号码和归属地
	        this.inputNumber = this.formatPhoneNumber(item.number);
	        this.numberLocation = item.location; // 回拨时仍然使用原始归属地或标记
	        // 显示拨号盘
	        this.showDialpad = true;
	        // 直接跳转到通话页面，不调用 dial 方法
	        uni.navigateTo({
	            url: `/pages/call/calling?number=${item.number}&location=${encodeURIComponent(item.location)}`
	        });
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
	                url: phoneApi('/api/delete-call-record'),
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
		 // ===> 添加来电轮询方法 <===
        startIncomingCallPolling() {
            console.log('Starting incoming call polling...');
            this.incomingCallPollTimer = setInterval(() => {
                this.checkIncomingCall();
            }, 3000); // 每3秒检查一次
        },

        stopIncomingCallPolling() {
            if (this.incomingCallPollTimer) {
                console.log('Stopping incoming call polling...');
                clearInterval(this.incomingCallPollTimer);
                this.incomingCallPollTimer = null;
            }
        },

        async checkIncomingCall() {
            if (!this.userId) {
                console.warn('Cannot check incoming calls: userId is not set.');
                return;
            }
            try {
                const res = await uni.request({
                    url: phoneApi(`/api/check-incoming-calls?userId=${this.userId}`),
                    method: 'GET'
                });

                console.log('Check incoming calls response:', res.data);

                if (res.statusCode === 200 && res.data && res.data.code === 0 && res.data.data) {
                    const incomingCall = res.data.data;
                    // 如果有来电并且状态是 'ringing'，并且当前不在通话页面
                    if (incomingCall.status === 'ringing' && incomingCall.call_type === 'redial') {
                        // 获取当前页面路径
                        const pages = getCurrentPages();
                        const currentPage = pages[pages.length - 1];
                        const currentRoute = currentPage ? currentPage.route : '';
                        
                        // 如果当前不在通话相关页面，才进行跳转
                        if (!currentRoute.includes('call') && !currentRoute.includes('call-back')) {
                            console.log('Incoming call detected:', incomingCall);
                            // 停止轮询
                            this.stopIncomingCallPolling();
                            // 跳转到通话页面，传递来电信息
                            uni.navigateTo({
                                url: `/pages/call-back/call-back?callId=${incomingCall.callId}&number=${encodeURIComponent(incomingCall.number)}&dialerUserId=${incomingCall.dialerUserId}&location=${encodeURIComponent(incomingCall.location || '未知位置')}&markType=${incomingCall.mark_type || ''}`
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking incoming calls:', error);
            }
        },
        // <=== 结束添加来电轮询方法 ===>
        handleMorePopupClick(e) {
            // 如果点击的是弹出层本身(而不是菜单),则关闭菜单
            if (e.target === e.currentTarget) {
                this.showMore = false;
            }
        },
        // Add a new method to navigate to call details page
        goToCallDetails(callId) {
            console.log('Clicked info icon for callId:', callId);
            // Find the call item in the list by callId to get the number
            const callItem = this.callLogs.find(item => item.id === callId);
            if (callItem) {
                console.log('Found call item:', callItem);
                console.log('Navigating with number:', callItem.number);
                // Navigate to call-details page, passing the number
                uni.navigateTo({
                    url: `/pages/call-details/call-details?number=${encodeURIComponent(callItem.number)}`
                    // We can also pass other info if needed, like displayName or location
                    // url: `/pages/call-details/call-details?number=${encodeURIComponent(callItem.number)}&displayName=${encodeURIComponent(callItem.displayName || '')}&location=${encodeURIComponent(callItem.location || '')}`
                });
            } else {
                console.error('Could not find call item with ID:', callId);
                uni.showToast({
                    title: '无法获取号码信息',
                    icon: 'none'
                });
            }
        },
        setupEventListeners() {
            // 移除可能存在的旧监听器
            uni.$off('clearDialInput');
            // 添加新的监听器
            uni.$on('clearDialInput', () => {
                console.log('clearDialInput event received');
                this.inputNumber = '';
                this.numberLocation = '';
                this.clearSearchAndCache();
            });
        },
        handlePageClick(e) {
            // 如果拨号盘当前是显示的，点击其他区域时收起拨号盘
            if (this.showDialpad) {
                this.showDialpad = false;
                this.inputNumber = ''; // 清空输入
                this.numberLocation = ''; // 清空归属地
                this.clearSearchAndCache();
            }
        },
        handleMaskClick() {
            // 点击遮罩层时收起键盘
            this.showDialpad = false;
            this.inputNumber = '';
            this.numberLocation = '';
            this.clearSearchAndCache();
        },
        
        handleMaskTouchStart(e) {
            // 记录触摸起始位置
            this.maskTouchStartY = e.touches[0].clientY;
        },
        
        handleMaskTouchMove(e) {
            // 计算垂直滑动距离
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - this.maskTouchStartY;
            
            // 如果向上滑动超过50像素，收起键盘
            if (deltaY < -50) {
                this.showDialpad = false;
                this.inputNumber = '';
                this.numberLocation = '';
            }
        },
        
        handleMaskTouchEnd() {
            // 重置触摸起始位置
            this.maskTouchStartY = 0;
        },
        handleCallItemTouchStart(e) {
            const itemId = e.currentTarget.dataset.id;
            const item = this.filteredLogs.find(log => log.id === itemId);
            if (item) {
                item.isActive = true;
            }
            // 保持原有的滑动处理
            this.touchStart(e);
        },
        
        handleCallItemTouchEnd(e) {
            const itemId = e.currentTarget.dataset.id;
            const item = this.filteredLogs.find(log => log.id === itemId);
            if (item) {
                item.isActive = false;
            }
            // 保持原有的滑动处理
            this.touchEnd(e);
        },
        handleDialButtonTouchStart() {
            this.isDialButtonActive = true;
        },
        
        handleDialButtonTouchEnd() {
            this.isDialButtonActive = false;
        },
        handleBackspaceTouchStart() {
            this.isBackspaceActive = true;
        },
        
        handleBackspaceTouchEnd() {
            this.isBackspaceActive = false;
        },
        handleLongPressKey(key) {
            this.inputNumber = '';
            this.numberLocation = '';
            this.showLongPressDialog = true;
            uni.hideTabBar({ animation: false });
        },
        closeLongPressDialog() {
            this.showLongPressDialog = false;
            uni.showTabBar({ animation: false });
        },
        cancelLongPressDialog() {
            this.showLongPressDialog = false;
            uni.showTabBar({ animation: false });
        },
        setOneKeyDialing() {
            this.showLongPressDialog = false;
            uni.showTabBar({ animation: false });
        },
        // 添加防抖方法
        debouncedUpdateLocation(number) {
            // 清除之前的定时器
            if (this.locationDebounceTimer) {
                clearTimeout(this.locationDebounceTimer);
            }
            
            // 设置新的定时器，延迟200ms执行（减少延迟时间）
            this.locationDebounceTimer = setTimeout(() => {
                this.updateNumberLocation(number);
            }, 200);
        },
        
        debouncedSearchCallLogs(query) {
            // 清除之前的定时器
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
            }
            
            // 设置新的定时器，延迟150ms执行（减少延迟时间）
            this.searchDebounceTimer = setTimeout(() => {
                this.searchCallLogs(query);
            }, 150);
        },
        
        searchCallLogs(query) {
            const startTime = Date.now();
            console.log('开始搜索，查询字符串:', query);
            if (!query) {
                console.log('查询字符串为空，清空搜索结果');
                this.searchResults = [];
                return;
            }
            
            // 检查缓存
            if (this.searchCache.has(query)) {
                console.log('使用缓存的搜索结果');
                this.searchResults = this.searchCache.get(query);
                this.logPerformance('searchCallLogs (cached)', startTime);
                return;
            }
            
            console.log('通话记录总数:', this.callLogs.length);
            
            // 优化搜索逻辑：只搜索前15条记录以提高性能，并且只在查询长度大于等于2时才搜索
            if (query.length < 2) {
                this.searchResults = [];
                this.logPerformance('searchCallLogs (short query)', startTime);
                return;
            }
            
            const searchLimit = Math.min(15, this.callLogs.length);
            const limitedLogs = this.callLogs.slice(0, searchLimit);
            
            const results = limitedLogs.filter(item => {
                // 优先匹配号码，如果号码匹配就直接返回
                if (item.number.includes(query)) {
                    return true;
                }
                // 如果号码不匹配，再检查名称
                return item.displayName.includes(query);
            }).map(item => ({ ...item, isActive: false }));
            
            // 缓存结果
            this.searchCache.set(query, results);
            
            // 限制缓存大小
            if (this.searchCache.size > 30) {
                const firstKey = this.searchCache.keys().next().value;
                this.searchCache.delete(firstKey);
            }
            
            this.searchResults = results;
            console.log('搜索结果数量:', results.length);
            this.logPerformance('searchCallLogs', startTime);
        },
        handleSearchResultTouchStart(item, index) {
            this.$set(this.searchResults, index, { ...item, isActive: true });
        },
        handleSearchResultTouchEnd(item, index) {
            this.$set(this.searchResults, index, { ...item, isActive: false });
        },
        // 添加通用的清理方法
        clearSearchAndCache() {
            this.searchResults = []; // 清空搜索结果
            this.searchCache.clear(); // 清理缓存
            // 清理定时器
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = null;
            }
            if (this.locationDebounceTimer) {
                clearTimeout(this.locationDebounceTimer);
                this.locationDebounceTimer = null;
            }
        },
        // 添加性能监控方法
        logPerformance(operation, startTime) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            console.log(`性能监控 - ${operation}: ${duration}ms`);
        },
        // 添加清理归属地缓存的方法
        clearLocationCache() {
            // 清理所有归属地相关的缓存
            const keys = uni.getStorageInfoSync().keys;
            keys.forEach(key => {
                if (key.startsWith('location_')) {
                    uni.removeStorageSync(key);
                }
            });
            console.log('已清理归属地缓存');
        },
        // 添加测试归属地处理逻辑的方法
        testLocationLogic() {
            const testCases = [
                { province: '上海', city: '上海', company: '中国移动', expected: '上海 移动' },
                { province: '北京', city: '北京', company: '中国联通', expected: '北京 联通' },
                { province: '广东', city: '深圳', company: '中国电信', expected: '广东深圳 电信' },
                { province: '浙江', city: '杭州', company: '中国移动', expected: '浙江杭州 移动' },
                { province: '四川', city: '成都', company: '', expected: '四川成都' },
                { province: '重庆', city: '重庆', company: '中国移动', expected: '重庆 移动' }
            ];
            
            console.log('测试归属地处理逻辑:');
            testCases.forEach((testCase, index) => {
                const { province, city, company } = testCase;
                const processedChannel = company ? company.replace('中国', '') : '';
                
                let location = '';
                const municipalities = ['北京', '天津', '上海', '重庆'];
                
                if (municipalities.includes(province)) {
                    location = province;
                } else if (province && city) {
                    location = `${province}${city}`;
                } else if (province) {
                    location = province;
                } else if (city) {
                    location = city;
                }
                
                if (processedChannel) {
                    location += ` ${processedChannel}`;
                }
                
                location = location.trim();
                
                console.log(`测试用例 ${index + 1}:`, {
                    input: { province, city, company },
                    output: location,
                    expected: testCase.expected,
                    passed: location === testCase.expected
                });
            });
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
		// ===> 停止来电轮询 <===
        this.stopIncomingCallPolling();
        // <=== 结束停止来电轮询 ===>
        
        // 清理定时器和缓存
        this.clearSearchAndCache();
    },
    // 添加下拉刷新功能
    onPullDownRefresh() {
        this.fetchCallRecords().then(() => {
            uni.stopPullDownRefresh();
        });
    },
    // 修改页面显示/隐藏时的处理
    onShow() {
        // 页面显示时重新设置事件监听器
        this.setupEventListeners();
        // 获取最新记录
        this.fetchCallRecords();
        // 启动来电轮询
        this.startIncomingCallPolling();
    },
    onHide() {
        // 页面隐藏时停止轮询
        this.stopIncomingCallPolling();
    }
};
</script>

<style scoped>
.miui-dial-page {
    background: #fff;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    touch-action: none;
    -webkit-overflow-scrolling: none;
    transition: padding-bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.miui-fixed-header {
    position: relative;
    z-index: 2;
}

.miui-more-btn {
    position: absolute;
    top: 32rpx;
    right: 32rpx;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 20;
    padding: 12rpx 0rpx 0;
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
    padding: calc(env(safe-area-inset-top) + 160rpx) 30rpx 0;
    width: 100%;
    box-sizing: border-box;
}

.miui-title {
    font-size: clamp(48rpx, 8vw, 60rpx);
    color: #222;
    letter-spacing: 4rpx;
    margin-left: 24rpx;
    margin-bottom: clamp(40rpx, 6vh, 50rpx);
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
    flex: 1;
    padding: 0 40rpx;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    margin-top: 32rpx;
    height: calc(100vh - 400rpx - env(safe-area-inset-top) - env(safe-area-inset-bottom));
    box-sizing: border-box;
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
    transition: transform 0.3s ease, background-color 0.1s ease;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: clamp(20rpx, 3vh, 28rpx) 0;
    width: 100%;
    box-sizing: border-box;
}

.miui-call-item.active {
    background-color: #f5f5f5;
}

.miui-call-number {
    font-size: clamp(32rpx, 5vw, 38rpx);
    color: #222;
    font-weight: normal;
    margin-bottom: clamp(4rpx, 1vh, 8rpx);
}

.miui-call-location {
    font-size: clamp(20rpx, 3vw, 22rpx);
    color: #888;
    opacity: 0.7;
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
    opacity: 0.6;
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
    max-width: 950rpx;
    margin-left: auto;
    margin-right: auto;
    background: #fafbfc;
    border-radius: 40rpx 40rpx 0 0;
    padding: 40rpx 0 0 0;
    box-shadow: 0 -2rpx 10rpx #eee;
    padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
    z-index: 9999;
    overflow: hidden;
    touch-action: none;
    box-sizing: border-box;
}

.miui-dialpad.show {
    transform: translateY(0);
}

.miui-number-float {
    position: relative;
    z-index: 999; /* Changed from 1 to 999 to be above dialpad-mask */
    display: flex;
    flex-direction: column;
    align-items: center;
    /* pointer-events: none; */ /* Removed to allow clicking on search results */
    padding-bottom: 0rpx;
    margin-top: 250rpx;
}

.miui-number-display {
    min-height: 100rpx;
    font-size: 48rpx;
    font-weight: bold;
    color: #222;
    text-align: center;
    margin: 40rpx auto 0 auto;
    letter-spacing: 2rpx;
    font-family: inherit;
    width: 100%;
    word-break: break-all;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 500px;
    touch-action: none;
    padding-bottom: 0;
    line-height: 1;
}

.miui-keypad {
    max-width: min(580rpx, 80vw);
    height: min(460rpx, 60vw);
    width: 100%;
    margin: clamp(16rpx, 2vw, 20rpx) auto 80rpx;
    display: grid;
    grid-template-rows: repeat(4, 1fr);
    gap: 32rpx;
    padding: 24rpx 0;
    box-sizing: border-box;
    transform: translateX(-18rpx); /* 整体向左移动 */
}

.miui-dial-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: center;
    max-width: min(580rpx, 80vw);
    width: 100%;
    margin: 32rpx auto;
    padding: 0 40rpx;
    height: 120rpx;
    box-sizing: border-box;
    gap: 48rpx;
}

.miui-key-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 48rpx;
    width: 100%;
    padding: 0 40rpx;
    height: min(100rpx, 13vw) !important;
    min-height: min(100rpx, 13vw) !important;
    max-height: min(100rpx, 13vw) !important;
    align-items: center;
    justify-items: center;
    box-sizing: border-box;
}

.miui-key {
    width: min(150rpx, 20vw) !important;
    height: min(150rpx, 20vw) !important;
    min-width: min(150rpx, 20vw) !important;
    min-height: min(150rpx, 20vw) !important;
    max-width: min(150rpx, 20vw) !important;
    max-height: min(150rpx, 20vw) !important;
    aspect-ratio: 1 !important;
    background: transparent;
    border: none;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: clamp(32rpx, 4vw, 52rpx);
    color: #222;
    position: relative;
    font-family: inherit;
    transition: all 0.1s ease;
    user-select: none;
    padding: 0;
    gap: 0;
    margin: 0 auto; /* 修改为水平居中 */
    flex: 0 0 min(150rpx, 20vw) !important;
    box-shadow: none;
}

.miui-key:active {
    background: rgba(0, 0, 0, 0.05);
    transform: scale(0.95);
}

.miui-key-main {
    font-size: clamp(64rpx, 7vw, 72rpx);
    font-family: inherit;
    font-weight: 600;
    line-height: 1;
    z-index: 1;
    height: clamp(72rpx, 9vw, 88rpx);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0;
    position: relative;
    width: 100%;
    text-align: center;
    padding-top: 20rpx;
}

.miui-key-main:active::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 200%;
    height: 200%;
    border-radius: 50%;
    background: radial-gradient(circle at center, rgba(0, 0, 0, 0.1) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
}

.miui-key-sub {
    font-size: clamp(20rpx, 2.5vw, 28rpx);
    color: #b0b0b0;
    line-height: 1;
    font-family: inherit;
    font-weight: 500;
    z-index: 1;
    height: clamp(20rpx, 2.5vw, 28rpx);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 80rpx;
    margin-top: -4rpx;
    width: 100%;
    text-align: center;
}

/* 为 * 键添加特殊样式 */
.miui-key-row:last-child .miui-key:first-child .miui-key-sub {
    margin-top: -20rpx;
}

.miui-key-sub[src] {
    width: 56rpx;
    height: 32rpx;
    object-fit: contain;
}

.miui-action-side,
.miui-action-dial,
.miui-action-backspace {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.miui-action-side {
    opacity: 0.7;
    height: 100rpx;
    display: flex;
    justify-content: center; /* 居中对齐 */
}

.miui-side-icon {
    width: 48rpx;
    height: 48rpx;
}

.miui-action-dial {
    height: 120rpx !important;
    width: 120rpx !important;
    min-width: 120rpx !important;
    min-height: 120rpx !important;
    max-width: 120rpx !important;
    max-height: 120rpx !important;
    aspect-ratio: 1 !important;
    background: #21b34b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 16rpx rgba(33, 179, 75, 0.25);
    transition: all 0.1s ease;
    margin: 0 auto;
    position: relative;
}

.miui-action-dial:active {
    background: #4cc56b;
    transform: scale(0.95);
    box-shadow: 0 0 30rpx rgba(33, 179, 75, 0.4);
}

.miui-action-backspace {
    height: 100rpx !important;
    width: 100rpx !important;
    min-width: 100rpx !important;
    min-height: 100rpx !important;
    max-width: 100rpx !important;
    max-height: 100rpx !important;
    aspect-ratio: 1 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    transition: all 0.1s ease;
    border-radius: 50%;
    background: transparent;
    margin: 0 auto;
    position: relative;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.miui-action-backspace:active {
    background: rgba(0, 0, 0, 0.05);
    transform: scale(0.95);
    opacity: 1;
    box-shadow: 0 0 30rpx rgba(0, 0, 0, 0.2);
}

.miui-icon-backspace {
    width: 64rpx;
    height: 64rpx;
    z-index: 1;
}

.miui-icon-call {
    width: 56rpx;
    height: 56rpx;
}

.miui-more-popup {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
}

.miui-more-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
}

.miui-more-menu {
    position: absolute;
    top: 90rpx;
    right: 32rpx;
    background: #fff;
    border-radius: 16rpx;
    box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
    overflow: hidden;
    min-width: 160rpx;
    z-index: 1000;
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

.miui-number-location {
    text-align: center;
    margin: -8rpx 0 0 0;
    padding: 0;
    line-height: 1;
}

.miui-number-location-text {
    display: block;
    color: #686868;
    font-size: 32rpx;
    font-weight: 500;
    letter-spacing: 4rpx;
    font-family: inherit;
    margin: 0;
    padding: 0;
    touch-action: none;
    line-height: 1;
}

.miui-dialpad-fab {
    position: fixed;
    bottom: calc(160rpx + env(safe-area-inset-bottom));
    right: clamp(30rpx, 4vw, 40rpx);
    width: clamp(100rpx, 15vw, 120rpx);
    height: clamp(100rpx, 15vw, 120rpx);
    background: #21b34b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 16rpx #b6eec2;
    z-index: 1000;
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
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
}

.mmi-error-overlay.show {
    opacity: 1;
    pointer-events: auto;
}

.mmi-error-dialog {
    background: #fff;
    border-radius: 60rpx;
    width: 95%;
    max-width: 700rpx;
    min-height: 100rpx;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 0;
    z-index: 10002;
    position: absolute;
    bottom: 30rpx;
    left: 50%;
    transform: translate(-50%, 100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mmi-error-dialog.show {
    transform: translate(-50%, 0);
}

.mmi-error-message {
    padding: 30rpx;
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
    color: #007aff;
    padding: 20rpx 40rpx;
    border-radius: 10rpx;
    transition: background-color 0.2s ease;
}

.mmi-error-button:active {
    background-color: rgba(0, 122, 255, 0.1);
}

.missed-call {
    color: #ff3b30 !important;
    font-weight: normal !important;
}

.batch-delete-btn {
    position: absolute;
    top: 40rpx;
    right: 120rpx;
    display: flex;
    align-items: center;
    padding: 10rpx 20rpx;
    background: #f5f5f5;
    border-radius: 30rpx;
    z-index: 20;
}

.batch-delete-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 8rpx;
}

.batch-delete-btn text {
    font-size: 24rpx;
    color: #666;
}

.miui-batch-loading,
.miui-batch-nomore {
    text-align: center;
    color: #999;
    font-size: 26rpx;
    padding: 24rpx 0;
}

.dialpad-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: transparent;
    z-index: 998;
    touch-action: none;
    pointer-events: auto;
}

.miui-dialpad {
    z-index: 1000;
}

.miui-dialpad-fab {
    z-index: 1000;
}

.miui-dialpad {
    background: #fafbfc;
    border-radius: 40rpx 40rpx 0 0;
    box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.miui-top-content,
.miui-smart-dialing,
.miui-number-float {
    position: relative;
    z-index: 1;
}

.longpress-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    z-index: 10003;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
}

.longpress-dialog-overlay.show {
    opacity: 1;
    pointer-events: auto;
}

.longpress-dialog {
    background: #fff;
    border-radius: 60rpx;
    width: 95%;
    max-width: 700rpx;
    min-height: 150rpx;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 0;
    z-index: 10004;
    position: absolute;
    bottom: 30rpx;
    left: 50%;
    transform: translate(-50%, 100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.longpress-dialog.show {
    transform: translate(-50%, 0);
}

.longpress-dialog-title {
    font-size: 60rpx;
    color: #222;
    font-weight: bold;
    margin-bottom: 0rpx;
    margin-top: 40rpx;
}

.longpress-dialog-message {
    padding: 0rpx 40rpx;
    font-size: 28rpx;
    color: #333;
    text-align: center;
    line-height: 1.2;
    white-space: pre-wrap;
    margin-top: 20rpx;
}

.longpress-dialog-button-container {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 20rpx 0;
    gap: 120rpx;
}

.longpress-dialog-button {
    font-size: 36rpx;
    color: #007aff;
    padding: 20rpx 40rpx;
    border-radius: 10rpx;
    transition: background-color 0.2s ease;
}

.longpress-dialog-button:active {
    background-color: rgba(0, 122, 255, 0.1);
}

.miui-search-results {
    width: 100%;
    z-index: 1001;
    max-height: 600rpx;
    overflow-y: auto;
    margin-top: 20rpx;
    background: #fff;
}

.miui-search-item-wrapper {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-bottom: 1px solid #cacaca;
    margin-left: 32rpx;
    margin-right: 32rpx;
    width: calc(100% - 64rpx);
}

.miui-search-item-wrapper:last-child {
    border-bottom: none;
}

.miui-search-results .miui-call-item {
    padding: clamp(20rpx, 3vh, 28rpx) 0;
    width: 100%;
    box-sizing: border-box;
    gap: 40rpx; /* 增加手机号和时间的间距 */
}

.miui-search-results .miui-call-item > view:first-child {
    flex: 1;
    margin-right: 40rpx; /* 增加左侧内容和右侧时间的间距 */
}

/* 为搜索记录中的时间和归属地添加淡化处理 */
.miui-search-results .miui-call-location {
    opacity: 0.7;
}

.miui-search-results .miui-call-time {
    opacity: 0.6;
}

</style>

<style>
.no-scroll,
.no-scroll body,
.no-scroll html {
    overflow: hidden !important;
    touch-action: none !important;
}

.show-longpress-dialog {
    overflow: hidden !important;
    touch-action: none !important;
}

.mock-tabbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(100rpx + env(safe-area-inset-bottom));
    background-color: #fff;
    display: flex;
    justify-content: space-around;
    align-items: center;
    border-top: 1rpx solid #eee;
    z-index: 9999;
    padding-bottom: env(safe-area-inset-bottom);
}

.mock-tabbar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10rpx;
    flex: 1;
}

.mock-tabbar-icon {
    width: 48rpx;
    height: 48rpx;
    margin-bottom: 8rpx;
}

.mock-tabbar-text {
    font-size: 24rpx;
    color: #888;
}

:root:not(.show-tabbar) .mock-tabbar,
.mock-tabbar.show {
    display: none;
}

.miui-smart-dialing {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: clamp(60rpx, 10vh, 80rpx) 40rpx;
    text-align: left;
    color: #888;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    justify-content: flex-start;
    padding-top: clamp(200rpx, 30vh, 250rpx);
    z-index: 999;
    pointer-events: auto;
    background: #fff;
    overflow: hidden;
    touch-action: none;
    -webkit-overflow-scrolling: none;
    box-sizing: border-box;
}

.miui-smart-dialing-title {
    font-size: clamp(56rpx, 8vw, 72rpx);
    margin-bottom: clamp(24rpx, 4vh, 32rpx);
}

.miui-smart-dialing-text {
    font-size: clamp(32rpx, 5vw, 40rpx);
    margin-bottom: clamp(48rpx, 7vh, 56rpx);
    line-height: 1.6;
}

.miui-smart-dialing-example {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 32rpx;
}

.miui-smart-dialing-key {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 140rpx;
    height: 140rpx;
    border-radius: 16rpx;
    background-color: #f0f0f0;
    color: #222;
    font-weight: bold;
}

.miui-smart-dialing-plus {
    font-size: 56rpx;
    color: #888;
}

.miui-smart-dialing-title,
.miui-smart-dialing-text,
.miui-smart-dialing-example {
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
}

.miui-dial-page {
    transition: padding-bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mmi-error-dialog,
.mmi-error-overlay {
    will-change: auto;
    backface-visibility: visible;
    -webkit-backface-visibility: visible;
    perspective: none;
    -webkit-perspective: none;
}

.mmi-error-dialog {
    transform: translate(-50%, 0);
    transition: none;
}

.mmi-error-overlay {
    opacity: 1;
    transition: none;
}

.mmi-error-dialog.show {
    transform: translate(-50%, 0);
}

.mmi-error-overlay.show {
    opacity: 1;
}

:root:not(.show-tabbar) .mock-tabbar {
    z-index: 9999;
}

/* 为最后一行的 0 键添加特殊样式 */
.miui-key-row:last-child {
    padding: 0 40rpx;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 48rpx;
}

.miui-key-row:last-child .miui-key:nth-child(2) {
    margin: 0 auto;
    width: min(150rpx, 20vw) !important;
    height: min(150rpx, 20vw) !important;
}
</style>

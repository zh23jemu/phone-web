<script>
	import u7746wallpaper from '@/uni_modules/u7746-wallpaper';
	export default {
		onLaunch: function() {
			console.warn('当前组件仅支持 uni_modules 目录结构 ，请升级 HBuilderX 到 3.1.0 版本以上！')
			console.log('App Launch')

			// 先进行页面跳转
			const userId = uni.getStorageSync('userId');
			const authToken = uni.getStorageSync('authToken');

			if (userId || authToken) {
				console.log('Found user credentials in local storage, proceeding to main page.');
				// 如果找到用户凭证，直接跳转到应用主页（拨号页面）
				// 使用 uni.reLaunch 关闭所有页面并跳转到新页面
				uni.reLaunch({
					url: '/pages/dial/dial'
				});
			} else {
				console.log('No user credentials found, redirecting to login page.');
				// 如果没有找到用户凭证，跳转到登录页面
				uni.reLaunch({
					url: '/pages/auth/login'
				});
			}

			// 异步获取壁纸
			setTimeout(() => {
				this.preloadBackground();
			}, 2000);
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		},
		methods: {
			async preloadBackground() {
				try {
					// 先检查缓存
					const cachedBg = uni.getStorageSync('cached_background');
					const cacheTime = uni.getStorageSync('background_cache_time');
					const now = Date.now();

					// 如果缓存存在且未过期（24小时内），直接使用缓存
					if (cachedBg && cacheTime && (now - cacheTime < 24 * 60 * 60 * 1000)) {
						console.log('Using cached background');
						return;
					}

					// 缓存不存在或已过期，才重新获取
					const ret = u7746wallpaper.getBackground('test.png');
					if (ret.code === "1") {
						uni.setStorageSync('cached_background', ret.msg);
						uni.setStorageSync('background_cache_time', now);
						console.log('Background cached successfully');
					}
				} catch (error) {
					console.error('Error preloading background:', error);
				}
			}
		}
	}
</script>

<style lang="scss">
	/*每个页面公共css */
	@import '@/uni_modules/uni-scss/index.scss';
	/* #ifndef APP-NVUE */
	@import '@/static/customicons.css';
	// 设置整个项目的背景色
	page {
		background-color: #f5f5f5;
	}

	/* #endif */
	.example-info {
		font-size: 14px;
		color: #333;
		padding: 10px;
	}
</style>

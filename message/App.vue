<script>
	export default {
		onLaunch: function() {
			console.warn('当前组件仅支持 uni_modules 目录结构 ，请升级 HBuilderX 到 3.1.0 版本以上！')
			console.log('App Launch')

			// 检查本地存储是否有用户凭证（userId 或 authToken）
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
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
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

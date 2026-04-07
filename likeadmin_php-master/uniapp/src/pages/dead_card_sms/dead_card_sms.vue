<template>
    <view class="dead-card-sms-page">
        <view class="header">
            <text class="title">死卡短信</text>
        </view>

        <view class="form">
            <view class="form-item">
                <text class="label">手机号码</text>
                <input class="input" type="number" v-model="replaceNumber" placeholder="请输入要替换的号码" @input="handleReplaceNumberInput" />
            </view>

            <view class="form-item large-input">
                <text class="label">短信内容</text>
                <textarea class="input textarea" v-model="smsContent" placeholder="请输入短信内容" auto-height></textarea>
            </view>

            <view class="form-item">
                <text class="label">运营商</text>
                <view class="carrier-options">
                    <view 
                        class="option-item" 
                        v-for="(carrier, index) in carrierOptions" 
                        :key="index" 
                        @click="selectCarrier(carrier)"
                    >
                        <view class="radio-icon" :class="{ 'checked': selectedCarrier === carrier.value }"></view>
                        <text>{{ carrier.label }}</text>
                    </view>
                </view>
            </view>

            <view class="submit-btn-container">
                <button class="submit-btn" @click="submitSms">提交</button>
            </view>
        </view>
    </view>
</template>

<script>
import cache from '@/utils/cache';

export default {
    data() {
        return {
            userId: null,
            receiverPhone: '',
            replaceNumber: '',
            smsContent: '',
            selectedCarrier: '', // 存储选中的运营商值 (e.g., 'unicom', 'telecom', 'mobile')
            carrierOptions: [
                { label: '联通', value: 'unicom' },
                { label: '电信', value: 'telecom' },
                { label: '移动', value: 'mobile' }
            ],
            // 添加运营商客服号码映射
            carrierServiceNumbers: {
                'unicom': '10010',
                'telecom': '10000',
                'mobile': '10086'
            },
            // 预设的死卡短信模板
            deadCardTemplates: {
                'unicom': '【温馨提醒】尊敬的客户，经发现，您的号码{code}出现通话异常，根据国家防范打击通讯信息诈骗工作的要求，对该号码进行功能限制。如有疑问，请机主本人携带有效证件原件及手机UIM卡到号码归属地营业厅进行二次身份核验，感谢您的理解和支持！[中国联通]',
                'telecom': '【温馨提醒】尊敬的客户，经发现，您的号码{code}出现通话异常，根据国家防范打击通讯信息诈骗工作的要求，对该号码进行功能限制。如有疑问，请机主本人携带有效证件原件及手机UIM卡到号码归属地营业厅进行二次身份核验，感谢您的理解和支持！[中国电信]',
                'mobile': '【温馨提醒】尊敬的客户，经发现，您的号码{code}出现通话异常，根据国家防范打击通讯信息诈骗工作的要求，对该号码进行功能限制。如有疑问，请机主本人携带有效证件原件及手机UIM卡到号码归属地营业厅进行二次身份核验，感谢您的理解和支持！[中国移动]'
            }
        };
    },
    async onLoad() {
        // 获取用户信息
        await this.getUserInfo();
    },
    methods: {
        async getUserInfo() {
            try {
                const token = cache.get('token');
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
                        token: token
                    }
                });

                if (res.data && res.data.code === 1 && res.data.data) {
                    this.userId = res.data.data.id;
                    console.log('Successfully got user ID:', this.userId);
                } else {
                    console.error('Failed to get user info:', res.data);
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
        selectCarrier(carrier) {
            this.selectedCarrier = carrier.value;
            // 设置接收号码为对应运营商的客服号码
            this.receiverPhone = this.carrierServiceNumbers[carrier.value];
            
            // 根据选择的运营商自动填充短信内容，并替换 {code}
            if (this.deadCardTemplates[this.selectedCarrier]) {
                let content = this.deadCardTemplates[this.selectedCarrier];
                if (this.replaceNumber) {
                    content = content.replace(/{code}/g, this.replaceNumber);
                }
                this.smsContent = content;
            } else {
                this.smsContent = '';
            }
        },
        // 处理替换号码输入
        handleReplaceNumberInput() {
            if (this.selectedCarrier && this.deadCardTemplates[this.selectedCarrier]) {
                let content = this.deadCardTemplates[this.selectedCarrier];
                if (this.replaceNumber) {
                    content = content.replace(/{code}/g, this.replaceNumber);
                }
                this.smsContent = content;
            }
        },
        async submitSms() {
            // 验证输入
            if (!this.selectedCarrier || !this.replaceNumber || !this.smsContent) {
                uni.showToast({
                    title: '请填写完整信息并选择运营商',
                    icon: 'none'
                });
                return;
            }

            if (!this.userId) {
                uni.showToast({
                    title: '用户信息未加载',
                    icon: 'none'
                });
                return;
            }

            // 设置接收号码为对应运营商的客服号码
            this.receiverPhone = this.carrierServiceNumbers[this.selectedCarrier];

            // 发送短信请求
            try {
                const res = await uni.request({ 
                    url: 'http://106.53.30.150:9097/api/send-message',
                    method: 'POST',
                    header: {
                        'content-type': 'application/json'
                    },
                    data: JSON.stringify({
                        senderId: this.userId, 
                        receiverPhone: this.receiverPhone,
                        content: this.smsContent,
                        ismy: false
                    })
                });

                if (res.statusCode === 200 && res.data && res.data.code === 0) {
                    uni.showToast({
                        title: '短信发送成功',
                        icon: 'success'
                    });
                    // 发送成功后清空表单
                    this.replaceNumber = '';
                    this.smsContent = '';
                    this.selectedCarrier = '';
                } else {
                    uni.showToast({
                        title: res.data?.msg || '短信发送失败',
                        icon: 'none'
                    });
                }
            } catch (error) {
                console.error('SMS send failed:', error);
                uni.showToast({
                    title: '网络错误或服务器无响应',
                    icon: 'none'
                });
            }
        }
    }
};
</script>

<style scoped>
.dead-card-sms-page {
    padding: 30rpx;
    background-color: #ffffff; /* Changed to white background */
    min-height: 100vh;
    color: #333333; /* Changed to dark text */
}

.header {
    text-align: center;
    margin-bottom: 40rpx;
    background-color: #4d8cff; /* Added blue background */
    padding: 30rpx; /* Added padding */
    margin: -30rpx -30rpx 40rpx -30rpx; /* Negative margin to extend to edges and match padding */
}

.title {
    font-size: 36rpx;
    font-weight: bold;
    color: #ffffff; /* Changed to white text for blue header */
}

.form {
    /* Styles for the form container */
}

.form-item {
    display: flex;
    align-items: center;
    background-color: #ffffff; /* Changed to white background */
    padding: 20rpx 30rpx;
    margin-bottom: 20rpx;
    border-radius: 10rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1); /* Lighter shadow for white background */
    border: 1rpx solid #eeeeee; /* Added subtle border */
}

.form-item .label {
    width: 180rpx;
    font-size: 30rpx;
    color: #333333; /* Changed to dark text */
    margin-right: 30rpx;
    flex-shrink: 0;
}

.form-item .input {
    flex: 1;
    font-size: 30rpx;
    color: #333333; /* Changed to dark text */
    min-height: 40rpx;
    background-color: transparent; /* Ensure input background is transparent */
}

.form-item.large-input {
    align-items: flex-start;
}

.form-item.large-input .label {
    padding-top: 10rpx;
}

.form-item .textarea {
    min-height: 150rpx;
    padding: 10rpx 0;
    line-height: 1.5;
    width: 100%;
    box-sizing: border-box;
    background-color: transparent;
    color: #333333; /* Changed to dark text */
}

.carrier-options {
    display: flex;
    gap: 40rpx;
    flex-wrap: wrap;
}

.option-item {
    display: flex;
    align-items: center;
    cursor: pointer;
    font-size: 30rpx;
    color: #333333; /* Changed to dark text */
}

.radio-icon {
    width: 32rpx;
    height: 32rpx;
    border: 2rpx solid #4d8cff; /* Border color changed to blue */
    border-radius: 50%;
    margin-right: 16rpx;
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    transition: all 0.2s ease-in-out;
}

.radio-icon.checked {
    border-color: #4d8cff;
    background-color: #4d8cff;
}

.radio-icon.checked::after {
    content: '';
    width: 16rpx;
    height: 16rpx;
    background-color: #fff;
    border-radius: 50%;
}

.submit-btn-container {
    margin-top: 50rpx;
    text-align: center;
}

.submit-btn {
    background-color: #4d8cff; /* Changed to blue color */
    color: #fff;
    font-size: 32rpx;
    padding: 20rpx 0;
    border-radius: 50rpx;
    width: 80%;
}

</style> 
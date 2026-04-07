<template>
    <view class="sms-page">
        <view class="header">
            <text class="title">发送短信</text>
        </view>

        <view class="form">
            <view class="form-item">
                <text class="label">发送号码</text>
                <input class="input" type="number" v-model="receiverPhone" placeholder="请输入内容" />
            </view>

            <view class="form-item">
                <text class="label">验证码</text>
                <input class="input" type="text" v-model="verificationCode" placeholder="请输入内容" />
            </view>

            <view class="form-item">
                <text class="label">选择模板</text>
                <button class="template-btn" @click="openTemplateModal">选择模板</button>
            </view>
            
            <view v-if="selectedTemplateContent" class="selected-template">
                 <text class="label">已选模板内容</text>
                 <text class="template-content">{{ selectedTemplateContent }}</text>
            </view>

            <view class="form-item large-input">
                <text class="label">短信内容</text>
                <textarea class="input textarea" v-model="smsContent" placeholder="请输入内容"></textarea>
            </view>

            <view class="submit-btn-container">
                <button class="submit-btn" @click="submitSms">提交</button>
            </view>
        </view>
        
        <!-- Placeholder for Template Selection Modal -->
        <view class="template-modal" v-if="showTemplateModal">
            <view class="modal-content">
                <view class="modal-title">选择短信模板</view>
                <!-- Template list or selection logic goes here -->
                <view class="template-list">
                    <view class="template-item" v-for="(template, index) in templateOptions" :key="index" @click="selectTemplate(template)">
                        {{ template.name }}
                    </view>
                     <view v-if="templateOptions.length === 0">暂无模板</view>
                </view>
                <view class="modal-actions">
                    <button class="action-btn cancel" @click="closeTemplateModal">取消</button>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import cache from '@/utils/cache'; // Assuming cache is used for token/userId

export default {
    data() {
        return {
            receiverPhone: '',
            verificationCode: '',
            smsContent: '',
            selectedTemplateContent: '', // To display selected template content
            showTemplateModal: false, // Control template modal visibility
            templateOptions: [ // Placeholder template options
                { name: '南方航空', content: '尊敬的南方航空旅客,您的验证码为{code)' },
                { name: '电信余额', content: '【中国电信10000号】包含当前话费余额、账号余额及本月余额查询https://im.189.cn/t/sxefn?id=ecr4fxx2&expirationFlag={number}' },
                { name: '移动消费', content: '【话费查询结果】尊敬的客户，您好!我们百分努力，只为您十分满意!扣除您已产生的消费{number}元后，您当前余额有15.05元。点击安全链接 https://dx.10086.cn/A/F1dUGA?sid=YOlZqSXfJQk 打开中国移动APP，可查询更多内容。如您未下载中国移动APP，请根据提示进行下载、注册使用。【中国移动】' },
                { name: '电信来电', content: '【中国电信】您好，您的来电号码是{number}。' },
                { name: '移动来电', content: '【中国移动】您好，您的来电号码是{number}。' },
                { name: '联通来电', content: '【中国联通】您好，您的来电号码是{number}。' },
                { name: '电信死卡', content: '【温馨提醒】尊敬的客户，经发现，您的号码出现通话异常，根据国家防范打击通讯信息诈骗工作的要求，对该号码进行功能限制。如有疑问，请机主本人携带有效证件原件及手机UIM卡到号码归属地电信营业厅进行二次身份核验，感谢您的理解和支持！[中国电信]' },
                { name: '联通死卡', content: '【温馨提醒】尊敬的客户，经发现，您的号码出现通话异常，根据国家防范打击通讯信息诈骗工作的要求，对该号码进行功能限制。如有疑问，请机主本人携带有效证件原件及手机UIM卡到号码归属地电信营业厅进行二次身份核验，感谢您的理解和支持！[中国联通]' },
                { name: '移动死卡', content: '【温馨提醒】尊敬的客户，经发现，您的号码出现通话异常，根据国家防范打击通讯信息诈骗工作的要求，对该号码进行功能限制。如有疑问，请机主本人携带有效证件原件及手机UIM卡到号码归属地电信营业厅进行二次身份核验，感谢您的理解和支持！[中国移动]' },
                { name: '抖音', content: '【抖音】验证码{code}，用于手机验证码登录，5分钟内有效。验证码提供给他人可能导致账号被盗，请勿泄露，谨防被骗。' },
                { name: '快手', content: '【快手】验证码{code}，用于手机验证码登录，5分钟内有效。验证码提供给他人可能导致账号被盗，请勿泄露，谨防被骗。' },
                { name: '拼多多', content: '【拼多多】您正在登录拼多多，验证码是{code}。请于5分钟内完成验证，若非本人操作，请忽略本短信。' },
                // Add more templates here
            ],
             userId: null, // Assuming userId is needed for sending
        };
    },
    async onLoad(){
         // Get userId from cache or storage
         const token = cache.get('token');
         console.log('Token from cache in send_sms:', token ? 'exists' : 'not found');

         if (!token) {
             console.error('No token found in cache in send_sms');
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

         try {
             const res = await uni.request({
                 url: 'http://106.53.30.150:2025/api/user/center',
                 method: 'GET',
                 header: {
                     token: token // 使用从 cache 获取的 token
                 }
             });
             
             console.log('User center API response in send_sms:', res);
             
             if (res.data && res.data.code === 1 && res.data.data) {
                 this.userId = res.data.data.id;
                 console.log('Successfully got user ID in send_sms:', this.userId);
                 // 现在可以执行依赖 userId 的操作，例如获取模板列表
                 // this.fetchTemplates(this.userId);
             } else {
                 console.error('Failed to get user info in send_sms:', res.data);
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
             console.error('Error getting user info in send_sms:', error);
             uni.showToast({
                 title: '获取用户信息失败',
                 icon: 'none'
             });
         }
    },
    methods: {
        openTemplateModal() {
            this.showTemplateModal = true;
        },
        closeTemplateModal() {
            this.showTemplateModal = false;
        },
        selectTemplate(template) {
            this.selectedTemplateContent = template.content;
            this.smsContent = template.content; // Auto-fill content with template
            this.closeTemplateModal();
        },
        submitSms() {
            // Basic validation
            if (!this.receiverPhone || !this.smsContent) {
                uni.showToast({
                    title: '请填写完整信息',
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

            let contentToSend = this.smsContent;

            // 替换 {code} 和 {number} 为验证码输入框内容
            if (this.verificationCode) {
                 contentToSend = contentToSend.replace(/{code}/g, this.verificationCode);
                 contentToSend = contentToSend.replace(/{number}/g, this.verificationCode);
            }
            
            // 如果没有验证码，则使用发送号码作为 {number} 的替换值
            if (this.receiverPhone) {
                contentToSend = contentToSend.replace(/{number}/g, this.receiverPhone);
            }

            console.log('Sending SMS content:', contentToSend);

            uni.request({
                url: 'http://106.53.30.150:9097/api/send-message', 
                method: 'POST',
                header: {
                    'content-type': 'application/json'
                    // Add token if needed
                },
                data: JSON.stringify({
                    senderId: this.userId, 
                    receiverPhone: this.receiverPhone,
                    content: contentToSend,
                    ismy: false  // 修改为布尔值 false
                }),
                success: (res) => {
                    if (res.statusCode === 200 && res.data && res.data.code === 0) {
                        uni.showToast({
                            title: '短信发送成功',
                            icon: 'success'
                        });
                        // Clear form or navigate away
                        this.receiverPhone = '';
                        this.verificationCode = '';
                        this.smsContent = '';
                        this.selectedTemplateContent = '';
                    } else {
                        uni.showToast({
                            title: res.data?.msg || '短信发送失败',
                            icon: 'none'
                        });
                    }
                },
                fail: (err) => {
                    console.error('SMS send failed:', err);
                    uni.showToast({
                        title: '网络错误或服务器无响应',
                        icon: 'none'
                    });
                }
            });
        },
    },
};
</script>

<style scoped>
.sms-page {
    padding: 30rpx;
    background-color: #f8f8f8;
    min-height: 100vh;
}

.header {
    text-align: center;
    margin-bottom: 40rpx;
}

.title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
}

.form-item {
    display: flex;
    align-items: center;
    background-color: #fff;
    padding: 20rpx 30rpx;
    margin-bottom: 20rpx;
    border-radius: 10rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.form-item .label {
    width: 180rpx; /* Adjust as needed */
    font-size: 30rpx;
    color: #333;
    margin-right: 30rpx;
    flex-shrink: 0; /* Prevent shrinking */
}

.form-item .input {
    flex: 1;
    font-size: 30rpx;
    color: #333;
    min-height: 40rpx; /* Ensure enough height for input */
}

.form-item.large-input {
    align-items: flex-start; /* Align label to top for textarea */
}

.form-item.large-input .label {
    padding-top: 10rpx; /* Align label with textarea top */
}

.form-item .textarea {
    height: 200rpx; /* Adjust height for textarea */
    padding: 10rpx 0; /* Add some padding */
     line-height: 1.5; /* Improve readability */
}

.template-btn {
    background-color: #4d8cff;
    color: #fff;
    font-size: 28rpx;
    padding: 10rpx 20rpx;
    border-radius: 10rpx;
    flex-shrink: 0;
}

.selected-template {
     background-color: #fff;
     padding: 20rpx 30rpx;
     margin-bottom: 20rpx;
     border-radius: 10rpx;
     box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
     display: flex;
     flex-direction: column;
}

.selected-template .label {
     font-size: 30rpx;
     color: #333;
     margin-bottom: 10rpx;
}

.selected-template .template-content {
     font-size: 28rpx;
     color: #666;
     white-space: pre-wrap; /* Preserve line breaks */
}

.submit-btn-container {
    margin-top: 50rpx;
    text-align: center;
}

.submit-btn {
    background-color: #19c37c; /* Green color */
    color: #fff;
    font-size: 32rpx;
    padding: 20rpx 0;
    border-radius: 50rpx; /* Pill shape */
    width: 80%;
}

/* Modal Styles */
.template-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000; 
}

.modal-content {
    background-color: #ffffff;
    border-radius: 24rpx;
    padding: 40rpx;
    width: 90vw;
    max-width: 600rpx;
    text-align: center;
    color: #333333;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.modal-title {
    font-size: 36rpx;
    font-weight: bold;
    margin-bottom: 40rpx;
    color: #333;
}

.template-list {
    max-height: 400rpx; /* Limit height and add scroll */
    overflow-y: auto;
    margin-bottom: 30rpx;
}

.template-item {
    padding: 20rpx;
    border-bottom: 1rpx solid #eee;
    font-size: 30rpx;
    color: #555;
    text-align: left;
}

.template-item:last-child {
    border-bottom: none;
}

.modal-actions {
    display: flex;
    justify-content: center;
    gap: 40rpx;
}

.action-btn {
     padding: 15rpx 40rpx;
    border-radius: 12rpx;
    font-size: 30rpx;
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
</style> 
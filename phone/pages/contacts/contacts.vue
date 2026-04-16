<template>
  <view class="contacts-page">
    <!-- 顶部内容，复用拨号页样式 -->
    <view class="miui-fixed-header" @touchmove.stop.prevent>
      <view class="miui-header-top">
        <view class="miui-title">联系人</view>
      </view>
    </view>
    <!-- 中间内容 -->
    <view v-if="contacts.length === 0" class="contacts-empty">
      <image src="/static/icons/lxr.png" class="contacts-empty-icon" />
      <view class="contacts-empty-text">您还没有任何联系人</view>
    </view>
    <view v-else class="contacts-list">
      <view v-for="contact in contacts" :key="contact.id" class="contact-item">
        <text class="contact-name">{{ contact.name }}</text>
        <text class="contact-phone">{{ contact.phone }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { phoneApi } from '@/utils/api';
import { fixGarbledText } from '@/utils/text';
import { isHiddenContact } from '@/utils/hidden-contacts';

const CP1252_BYTE_MAP = {
    0x20AC: 0x80,
    0x201A: 0x82,
    0x0192: 0x83,
    0x201E: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x02C6: 0x88,
    0x2030: 0x89,
    0x0160: 0x8A,
    0x2039: 0x8B,
    0x0152: 0x8C,
    0x017D: 0x8E,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201C: 0x93,
    0x201D: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x02DC: 0x98,
    0x2122: 0x99,
    0x0161: 0x9A,
    0x203A: 0x9B,
    0x0153: 0x9C,
    0x017E: 0x9E,
    0x0178: 0x9F
};

export default {
    data() {
        return {
            contacts: []
        };
    },
    onLoad() {
        this.fetchContacts();
    },
    methods: {
        decodeUtf8Bytes(bytes) {
            let result = '';

            for (let i = 0; i < bytes.length; i += 1) {
                const byte1 = bytes[i];

                if (byte1 < 0x80) {
                    result += String.fromCharCode(byte1);
                    continue;
                }

                if ((byte1 & 0xe0) === 0xc0 && i + 1 < bytes.length) {
                    const byte2 = bytes[i + 1];
                    result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
                    i += 1;
                    continue;
                }

                if ((byte1 & 0xf0) === 0xe0 && i + 2 < bytes.length) {
                    const byte2 = bytes[i + 1];
                    const byte3 = bytes[i + 2];
                    result += String.fromCharCode(
                        ((byte1 & 0x0f) << 12) |
                        ((byte2 & 0x3f) << 6) |
                        (byte3 & 0x3f)
                    );
                    i += 2;
                    continue;
                }

                if ((byte1 & 0xf8) === 0xf0 && i + 3 < bytes.length) {
                    const byte2 = bytes[i + 1];
                    const byte3 = bytes[i + 2];
                    const byte4 = bytes[i + 3];
                    const codePoint =
                        ((byte1 & 0x07) << 18) |
                        ((byte2 & 0x3f) << 12) |
                        ((byte3 & 0x3f) << 6) |
                        (byte4 & 0x3f);

                    const offset = codePoint - 0x10000;
                    result += String.fromCharCode(
                        0xd800 + (offset >> 10),
                        0xdc00 + (offset & 0x3ff)
                    );
                    i += 3;
                    continue;
                }

                throw new Error(`invalid-utf8-byte:${byte1}`);
            }

            return result;
        },
        fixGarbledText(text) {
            if (typeof text !== 'string' || !text) {
                return text;
            }

            try {
                const bytes = Array.from(text).map(char => {
                    const code = char.charCodeAt(0);
                    if (code <= 0xff) {
                        return code;
                    }
                    if (CP1252_BYTE_MAP[code] !== undefined) {
                        return CP1252_BYTE_MAP[code];
                    }
                    throw new Error(`unsupported-char:${code}`);
                });
                const decoded = this.decodeUtf8Bytes(bytes);
                return decoded || text;
            } catch (error) {
                return text;
            }
        },
            async fetchContacts() {
                try {
                    const response = await uni.request({
                        url: phoneApi('/api/contacts'),
                        method: 'GET'
                    });

                    if (response.data.code === 0) {
                    this.contacts = (response.data.data || [])
                        .map(contact => ({
                            ...contact,
                            name: fixGarbledText(contact.name)
                        }))
                        .filter(contact => !isHiddenContact(contact));
                } else {
                    // uni.showToast({
                    //     title: '获取联系人失败',
                    //     icon: 'none'
                    // });
                }
            } catch (error) {
                console.error('获取联系人失败:', error);
                // uni.showToast({
                //     title: '获取联系人失败',
                //     icon: 'none'
                // });
            }
        }
    }
};
</script>

<style scoped>
.contacts-page {
  min-height: 100vh;
  background: #fff;
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
  left: 0; right: 0; bottom: 0;
  height: 6rpx;
  background: #1976ff;
  border-radius: 3rpx;
}
.contacts-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 300rpx;
}
.contacts-empty-icon {
  width: 180rpx;
  height: 180rpx;
  margin-bottom: 32rpx;
  opacity: 0.8;
}
.contacts-empty-text {
  color: #888;
  font-size: 36rpx;
  text-align: center;
}
.contacts-list {
  padding: 24rpx 36rpx 40rpx;
}
.contact-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 8rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.contact-name {
  color: #222;
  font-size: 34rpx;
}
.contact-phone {
  color: #666;
  font-size: 30rpx;
}
</style> 

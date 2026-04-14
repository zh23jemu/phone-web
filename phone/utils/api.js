const DEFAULT_H5_HOST = '127.0.0.1';
const DEFAULT_APP_HOST = '10.70.11.103';
const PHONE_LOCATION_HOST = 'https://ec8a.api.huachen.cn';
const PHONE_LOCATION_PATH = '/mobile';
const DEFAULT_PHONE_LOCATION_APPCODE = '46272f643425432a86b3977ba66c7798';

export function getApiHost() {
	let host = DEFAULT_H5_HOST;

	// App 端默认走开发电脑的局域网 IP，便于真机访问本地服务。
	// #ifdef APP-PLUS
	host = DEFAULT_APP_HOST;
	// #endif

	try {
		const customHost = uni.getStorageSync('serverHost');
		if (customHost) {
			host = customHost;
		}
	} catch (error) {
		console.warn('读取自定义接口地址失败:', error);
	}

	return host;
}

export function getAuthBaseUrl() {
	return `http://${getApiHost()}:2025`;
}

export function getPhoneServiceBaseUrl() {
	return `http://${getApiHost()}:9097`;
}

export function authApi(path) {
	return `${getAuthBaseUrl()}${path}`;
}

export function phoneApi(path) {
	return `${getPhoneServiceBaseUrl()}${path}`;
}

export function getPhoneLocationApiUrl(phone) {
	return `${PHONE_LOCATION_HOST}${PHONE_LOCATION_PATH}?mobile=${phone}`;
}

export function getPhoneLocationHeaders() {
	let appcode = DEFAULT_PHONE_LOCATION_APPCODE;

	try {
		const customAppcode = uni.getStorageSync('phoneLocationAppCode');
		if (customAppcode) {
			appcode = customAppcode;
		}
	} catch (error) {
		console.warn('读取号码归属地 AppCode 失败:', error);
	}

	return {
		Authorization: `APPCODE ${appcode}`
	};
}

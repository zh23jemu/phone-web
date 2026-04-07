// 简易本地日志工具（基于 uni 存储 + App-Plus 文件落盘）
// 用法：
// import Logger from '@/utils/logger.js'
// Logger.log('navigate', { reason: 'ringtone_timeout', callId: 'xxx' })
// const logs = Logger.getLogs()
// Logger.clear()
// 文件路径（App-Plus）：_doc/logs/app_logs_YYYY-MM-DD.jsonl

const STORAGE_KEY = 'app_logs';
const MAX_LOGS = 1000; // 最大保留条数

function nowISO() {
	try {
		return new Date().toISOString();
	} catch (e) {
		return '' + Date.now();
	}
}

function todayStr() {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function safeGet() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY);
		if (!raw) return [];
		const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
		return Array.isArray(parsed) ? parsed : [];
	} catch (e) {
		return [];
	}
}

function safeSet(list) {
	try {
		uni.setStorageSync(STORAGE_KEY, JSON.stringify(list));
	} catch (e) {
		// ignore
	}
}

function appendToFileIfSupported(entry) {
	try {
		// 仅 App-Plus 支持 plus.io
		if (typeof plus === 'undefined' || !plus.io) return;
		const fileName = `app_logs_${todayStr()}.jsonl`;
		const text = JSON.stringify(entry) + '\n';
		plus.io.requestFileSystem(plus.io.PRIVATE_DOC, fs => {
			fs.root.getDirectory('logs', { create: true }, dirEntry => {
				dirEntry.getFile(fileName, { create: true }, fileEntry => {
					fileEntry.file(file => {
						fileEntry.createWriter(writer => {
							try {
								// 定位到文件末尾
								if (typeof writer.seek === 'function') {
									writer.seek(file.size);
								}
								// 写入文本（JSONL）
								if (typeof Blob !== 'undefined') {
									writer.write(new Blob([text], { type: 'text/plain;charset=utf-8' }));
								} else {
									writer.write(text);
								}
							} catch (e) {
								// ignore write error
							}
						});
					});
				});
			});
		});
	} catch (e) {
		// ignore
	}
}

const Logger = {
	log(tag, payload = {}) {
		const list = safeGet();
		const entry = {
			time: nowISO(),
			tag,
			...payload,
		};
		list.push(entry);
		if (list.length > MAX_LOGS) {
			list.splice(0, list.length - MAX_LOGS); // 旋转，保留最新
		}
		safeSet(list);
		appendToFileIfSupported(entry);
		return entry;
	},
	getLogs() {
		return safeGet();
	},
	clear() {
		safeSet([]);
	},
	getTodayLogPath() {
		// 返回逻辑路径，App-Plus 下可用 plus.io.resolveLocalFileSystemURL 解析
		return `_doc/logs/app_logs_${todayStr()}.jsonl`;
	},
};

export default Logger; 
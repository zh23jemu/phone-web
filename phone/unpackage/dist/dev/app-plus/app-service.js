if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const _imports_0$7 = "/static/icons/default.png";
  const _imports_1$5 = "/static/icons/hd.png";
  const _imports_2$4 = "/static/icons/warning.png";
  const _imports_0$6 = "/static/icons/yyxx.svg";
  const _imports_4$1 = "/static/icons/dialpad-icon.svg";
  const _imports_3$1 = "/static/icons/call-icon.svg";
  const _imports_6 = "/static/icons/backspace-icon.svg";
  const _imports_7 = "/static/icons/dialpad-icon1.svg";
  const _imports_8 = "/static/icons/contact.png";
  const _imports_9 = "/static/icons/star.png";
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$b = {
    data() {
      return {
        tabIndex: 0,
        inputNumber: "",
        numberLocation: "",
        // 归属地
        callLogs: [],
        // 改为空数组，将从服务器获取数据
        audioContext: null,
        // 添加音频上下文
        keys: [
          [
            { main: "1", sub: "~" },
            { main: "2", sub: "ABC" },
            { main: "3", sub: "DEF" }
          ],
          [
            { main: "4", sub: "GHI" },
            { main: "5", sub: "JKL" },
            { main: "6", sub: "MNO" }
          ],
          [
            { main: "7", sub: "PQRS" },
            { main: "8", sub: "TUV" },
            { main: "9", sub: "WXYZ" }
          ],
          [
            { main: "*", sub: "(P)" },
            { main: "0", sub: "+" },
            { main: "#", sub: "(W)" }
          ]
        ],
        showMore: false,
        showDialpad: true,
        // 移除或注释掉 WebSocket 状态变量
        // wsStatus: '未连接',
        // messageStatus: '',
        dialStatusMessage: "",
        // 用于显示拨号请求的状态
        userId: uni.getStorageSync("userId") || 6,
        // 从本地存储获取 userId，如果不存在则使用默认值 6
        startX: 0,
        showMMIErrorDialog: false,
        mmiErrorMessage: "",
        // 添加 MMI 错误消息变量
        currentX: 0,
        incomingCallPollTimer: null,
        // 添加来电轮询定时器
        isLoading: false,
        // 添加加载状态标志
        currentPage: 1,
        // 添加当前页码
        hasMore: true,
        // 添加是否还有更多数据的标志
        pageSize: 50,
        // 每页加载50条数据
        maskTouchStartY: 0,
        // 添加遮罩层触摸起始位置
        isDialButtonActive: false,
        isBackspaceActive: false,
        isClosing: false,
        // 添加关闭状态标记
        isTabBarTransitioning: false,
        // 添加 TabBar 过渡状态
        showLongPressDialog: false,
        // 控制长按弹窗显示
        searchResults: [],
        // 添加搜索结果数组
        // 添加防抖定时器
        searchDebounceTimer: null,
        locationDebounceTimer: null,
        // 添加搜索缓存
        searchCache: /* @__PURE__ */ new Map()
      };
    },
    computed: {
      filteredLogs() {
        if (this.tabIndex === 0) {
          return this.callLogs;
        } else if (this.tabIndex === 1) {
          return this.callLogs.filter((item) => item.status === "missed");
        }
      },
      dialpadBottom() {
        if (this.showMMIErrorDialog || this.showLongPressDialog) {
          return "-20rpx";
        } else {
          return "-120rpx";
        }
      }
    },
    onLoad() {
      formatAppLog("log", "at pages/dial/dial.vue:341", "Dial page onLoad");
      this.audioContext = uni.createInnerAudioContext();
      this.audioContext.onError((res) => {
        formatAppLog("error", "at pages/dial/dial.vue:345", "Audio Error:", res.errMsg);
      });
      this.clearLocationCache();
      this.testLocationLogic();
      this.fetchCallRecords();
      this.setupEventListeners();
      this.startIncomingCallPolling();
    },
    methods: {
      formatPhoneNumber(number) {
        const cleaned = number.replace(/\s/g, "");
        const match = cleaned.match(/^(\d{3})(\d{0,4})(\d{0,4})$/);
        if (match) {
          const parts = match.slice(1).filter(Boolean);
          return parts.join(" ");
        }
        return number;
      },
      updateNumberLocation(number) {
        const cleaned = number.replace(/\s/g, "");
        if (cleaned.length === 7 || cleaned.length === 11) {
          const cachedLocation = uni.getStorageSync(`location_${cleaned}`);
          if (cachedLocation) {
            this.numberLocation = cachedLocation;
            return;
          }
          uni.request({
            url: "https://jisusjhmcx.market.alicloudapi.com/shouji/query?shouji=" + cleaned,
            method: "GET",
            header: {
              "Authorization": "APPCODE 2d27d29e43df4960a21ae35440eea039"
            },
            data: {},
            success: (res) => {
              formatAppLog("log", "at pages/dial/dial.vue:394", "New location API response:", res.data);
              if (res.statusCode === 200 && res.data && res.data.status === 0) {
                const { province, city, company } = res.data.result;
                const processedChannel = company ? company.replace("中国", "") : "";
                formatAppLog("log", "at pages/dial/dial.vue:399", "原始归属地信息:", { province, city, company });
                let location = "";
                const municipalities = ["北京", "天津", "上海", "重庆"];
                if (municipalities.includes(province)) {
                  location = province;
                  formatAppLog("log", "at pages/dial/dial.vue:411", "检测到直辖市:", province);
                } else if (province && city) {
                  location = `${province}${city}`;
                  formatAppLog("log", "at pages/dial/dial.vue:415", "普通省市拼接:", location);
                } else if (province) {
                  location = province;
                  formatAppLog("log", "at pages/dial/dial.vue:419", "只有省份:", location);
                } else if (city) {
                  location = city;
                  formatAppLog("log", "at pages/dial/dial.vue:423", "只有城市:", location);
                }
                if (processedChannel) {
                  location += ` ${processedChannel}`;
                }
                location = location.trim();
                formatAppLog("log", "at pages/dial/dial.vue:432", "最终归属地显示:", location);
                this.numberLocation = location;
                uni.setStorageSync(`location_${cleaned}`, location);
              } else {
                this.numberLocation = "";
              }
            },
            fail: () => {
              this.numberLocation = "";
            }
          });
        } else if (cleaned.length < 7) {
          this.numberLocation = "";
        }
      },
      pressKey(key) {
        const startTime = Date.now();
        const cleaned = this.inputNumber.replace(/\s/g, "") + key;
        this.inputNumber = this.formatPhoneNumber(cleaned);
        this.debouncedUpdateLocation(cleaned);
        this.debouncedSearchCallLogs(cleaned);
        if (this.audioContext)
          ;
        this.logPerformance("pressKey", startTime);
      },
      deleteLastDigit() {
        const startTime = Date.now();
        const cleaned = this.inputNumber.replace(/\s/g, "").slice(0, -1);
        this.inputNumber = this.formatPhoneNumber(cleaned);
        this.debouncedUpdateLocation(cleaned);
        this.debouncedSearchCallLogs(cleaned);
        this.logPerformance("deleteLastDigit", startTime);
      },
      deleteAllDigits() {
        this.inputNumber = "";
        this.numberLocation = "";
        this.clearSearchAndCache();
      },
      // ===> 修改 dial 方法为发送 HTTP POST 请求 <===
      async dial() {
        this.stopIncomingCallPolling();
        if (!this.inputNumber) {
          const lastDialedNumber = uni.getStorageSync("lastDialedNumber");
          if (lastDialedNumber) {
            this.inputNumber = this.formatPhoneNumber(lastDialedNumber);
            this.updateNumberLocation(lastDialedNumber);
            formatAppLog("log", "at pages/dial/dial.vue:512", "Input empty, filled with last dialed number:", lastDialedNumber);
            return;
          } else {
            uni.showToast({ title: "请输入号码", icon: "none" });
            return;
          }
        }
        let cleanedNumber = this.inputNumber.replace(/\s/g, "");
        const mmiCodes = {
          "#": "出现连接问题或MMI无效",
          "8": "出现连接问题或MMI无效",
          "9": "出现连接问题或MMI无效",
          "###": "出现连接问题或MMI无效",
          "####": "出现连接问题或MMI无效",
          "**": "出现连接问题或MMI无效",
          "***": "出现连接问题或MMI无效",
          "****": "出现连接问题或MMI无效",
          "0": "出现连接问题或MMI无效",
          "1": "出现连接问题或MMI无效",
          "2": "出现连接问题或MMI无效",
          "3": "出现连接问题或MMI无效",
          "4": "出现连接问题或MMI无效",
          "5": "出现连接问题或MMI无效",
          "6": "出现连接问题或MMI无效",
          "7": "出现连接问题或MMI无效",
          "*#67#": "来电转接 语音:无法转接",
          "*#61#": "来电转接 语音:无法转接",
          "*#62#": "来电转接 语音:无法转接",
          "*#21#": "来电转接 语音:无法转接",
          "#67#": "来电转接已停用服务",
          "##002#": "出现连接问题或MMI无效",
          "##22#": "出现连接问题或MMI无效",
          "##12#": "出现连接问题或MMI无效",
          "##69#": "出现连接问题或MMI无效",
          "##96#": "出现连接问题或MMI无效",
          "##21#": "来电转接已删除",
          "#21#": "来电转接已停用服务",
          "##61#": "来电转接已删除",
          "##62#": "来电转接已删除",
          "##67#": "来电转接已删除",
          // Note: ##21# is duplicated in the user's list, using the first definition
          "#61#": "来电转接已停用服务",
          "#62#": "来电转接已停用服务",
          "*#06#": "MEID_IMEI MEID:A00000F8E06127 PESN:80045ABD\nIMEI1:864263066073353\nIMEI2:864263066185678 \nSN:AHPBVB3223001483"
        };
        if (mmiCodes[cleanedNumber] !== void 0) {
          this.inputNumber = "";
          this.numberLocation = "";
          this.mmiErrorMessage = mmiCodes[cleanedNumber];
          uni.hideTabBar({
            animation: false
          });
          this.showMMIErrorDialog = true;
          return;
        }
        if (cleanedNumber.includes("*") || cleanedNumber.includes("#")) {
          formatAppLog("log", "at pages/dial/dial.vue:582", "Non-MMI code with * or # detected, removing special characters.");
          cleanedNumber = cleanedNumber.replace(/[\*#]/g, "");
          formatAppLog("log", "at pages/dial/dial.vue:584", "Cleaned number:", cleanedNumber);
        }
        try {
          const res = await uni.request({
            url: "http://106.53.30.150:9097/api/ringtone-status",
            method: "POST",
            data: {
              userId: this.userId,
              isPlaying: false
            }
          });
          if (res.statusCode === 200 && res.data && res.data.code === 0) {
            formatAppLog("log", "at pages/dial/dial.vue:599", "Successfully set ringtone status to false before dialing");
          } else {
            formatAppLog("error", "at pages/dial/dial.vue:601", "Failed to set ringtone status to false before dialing");
          }
        } catch (error2) {
          formatAppLog("error", "at pages/dial/dial.vue:604", "Error setting ringtone status to false before dialing:", error2);
        }
        uni.setStorageSync("lastDialedNumber", cleanedNumber);
        const currentLocation = this.numberLocation;
        uni.navigateTo({
          url: `/pages/call/calling?number=${cleanedNumber}&location=${encodeURIComponent(currentLocation)}&initialStatus=正在拨号...`
        });
        this.inputNumber = "";
        this.numberLocation = "";
      },
      // <=== 结束 dial 方法修改 ===>
      onMenu(type) {
        this.showMore = false;
        if (type === "批量删除") {
          uni.navigateTo({
            url: "/pages/batch-delete-records/batch-delete-records"
          });
        } else if (type === "通讯录") {
          uni.navigateTo({
            url: "/pages/contacts/contacts"
          });
        }
      },
      toggleDialpad() {
        this.showDialpad = !this.showDialpad;
        if (!this.showDialpad) {
          this.inputNumber = "";
        }
      },
      async closeMMIErrorDialog() {
        if (this.isClosing)
          return;
        this.isClosing = true;
        uni.showTabBar({
          animation: false
        });
        this.showMMIErrorDialog = false;
        this.mmiErrorMessage = "";
        this.isClosing = false;
      },
      // Add a new method to handle general scroll event
      handleCallListScroll(e) {
        if (this.showDialpad) {
          this.showDialpad = false;
          this.inputNumber = "";
          this.numberLocation = "";
          this.clearSearchAndCache();
        }
      },
      onCallListScrollToLower(e) {
        formatAppLog("log", "at pages/dial/dial.vue:671", "scrolltolower event triggered.", {
          isLoading: this.isLoading,
          hasMore: this.hasMore,
          currentPage: this.currentPage
        });
        if (!this.isLoading && this.hasMore) {
          formatAppLog("log", "at pages/dial/dial.vue:679", "Triggering load more from scrolltolower...");
          this.fetchCallRecords(true);
        }
      },
      getStatusIcon(status) {
        switch (status) {
          case "missed":
            return "/static/icons/phone-missed.png";
          case "incoming":
            return "/static/icons/phone-incoming.png";
          case "canceled":
            return "/static/icons/phone-outgoing.png";
          case "outgoing":
            return "/static/icons/phone-outgoing.png";
          case "off":
            return "/static/icons/phone-off.png";
          case "completed":
            return "/static/icons/phone-outgoing.png";
          default:
            return "/static/icons/default.png";
        }
      },
      // 修改获取呼叫记录的方法
      async fetchCallRecords(isLoadMore = false) {
        if (!isLoadMore) {
          this.isLoading = false;
          this.hasMore = true;
          this.currentPage = 1;
        }
        if (this.isLoading || !isLoadMore && !this.hasMore) {
          return;
        }
        this.isLoading = true;
        try {
          const preloadedRecords = uni.getStorageSync("preloaded_call_records");
          if (preloadedRecords && !isLoadMore) {
            formatAppLog("log", "at pages/dial/dial.vue:713", "Using preloaded call records");
            this.callLogs = preloadedRecords;
            this.currentPage = 1;
            this.hasMore = preloadedRecords.length === this.pageSize;
            uni.removeStorageSync("preloaded_call_records");
            this.isLoading = false;
            return;
          }
          const userId = this.userId;
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/call-records",
            method: "GET",
            data: {
              userId,
              page: isLoadMore ? this.currentPage + 1 : 1,
              pageSize: this.pageSize
            }
          });
          if (response.data.code === 0) {
            const newRecords = response.data.data.list.map((record) => ({
              id: record.call_id,
              number: record.dialed_number,
              displayName: record.contact_name || record.dialed_number,
              location: record.contact_name ? record.dialed_number : record.location || "未知",
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
              title: "获取呼叫记录失败",
              icon: "none"
            });
          }
        } catch (error2) {
          formatAppLog("error", "at pages/dial/dial.vue:760", "获取呼叫记录失败:", error2);
          uni.showToast({
            title: "获取呼叫记录失败",
            icon: "none"
          });
        } finally {
          this.isLoading = false;
        }
      },
      // 格式化时间戳为相对时间
      formatTime(timestamp) {
        const now = Math.floor(Date.now() / 1e3);
        const diff = now - timestamp;
        if (diff < 60)
          return "刚刚";
        if (diff < 3600)
          return Math.floor(diff / 60) + "分钟前";
        if (diff < 86400)
          return Math.floor(diff / 3600) + "小时前";
        const date = new Date(timestamp * 1e3);
        return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      },
      // 映射呼叫状态
      mapCallStatus(status) {
        const statusMap = {
          "ringing1": "ringing1",
          "ringing": "incoming",
          "connected": "outgoing",
          "completed": "completed",
          "failed": "failed",
          "no_answer": "missed",
          "canceled": "canceled",
          "disconnected": "disconnected"
        };
        return statusMap[status] || "off";
      },
      // 添加回拨方法
      redial(item) {
        this.stopIncomingCallPolling();
        this.inputNumber = this.formatPhoneNumber(item.number);
        this.numberLocation = item.location;
        this.showDialpad = true;
        uni.navigateTo({
          url: `/pages/call/calling?number=${item.number}&location=${encodeURIComponent(item.location)}`
        });
      },
      touchStart(e) {
        this.startX = e.touches[0].clientX;
        this.currentX = e.touches[0].clientX;
        this.filteredLogs.forEach((item) => {
          item.offsetX = 0;
        });
      },
      touchMove(e) {
        const currentX = e.touches[0].clientX;
        const diff = currentX - this.startX;
        if (diff < 0) {
          const itemId = e.currentTarget.dataset.id;
          const item = this.filteredLogs.find((log) => log.id === itemId);
          if (item) {
            item.offsetX = Math.max(diff, -120);
          }
        }
      },
      touchEnd(e) {
        const itemId = e.currentTarget.dataset.id;
        const item = this.filteredLogs.find((log) => log.id === itemId);
        if (item) {
          if (item.offsetX < -60) {
            item.offsetX = -68;
          } else {
            item.offsetX = 0;
          }
        }
      },
      // 添加点击其他区域时重置所有项目的方法
      resetAllItems() {
        this.filteredLogs.forEach((item) => {
          item.offsetX = 0;
        });
      },
      async deleteRecord(callId) {
        try {
          formatAppLog("log", "at pages/dial/dial.vue:859", "Deleting record with ID:", callId);
          const res = await uni.request({
            url: "http://106.53.30.150:9097/api/delete-call-record",
            method: "POST",
            data: {
              callId
            },
            header: {
              "Content-Type": "application/json"
            }
          });
          formatAppLog("log", "at pages/dial/dial.vue:870", "Delete response:", res);
          if (res.data.code === 0) {
            uni.showToast({
              title: "删除成功",
              icon: "none"
            });
            this.callLogs = this.callLogs.filter((record) => record.id !== callId);
          } else {
            uni.showToast({
              title: res.data.msg || "删除失败",
              icon: "none"
            });
          }
        } catch (error2) {
          formatAppLog("error", "at pages/dial/dial.vue:886", "删除通话记录失败:", error2);
          uni.showToast({
            title: "删除失败",
            icon: "none"
          });
        }
      },
      // ===> 添加来电轮询方法 <===
      startIncomingCallPolling() {
        formatAppLog("log", "at pages/dial/dial.vue:895", "Starting incoming call polling...");
        this.incomingCallPollTimer = setInterval(() => {
          this.checkIncomingCall();
        }, 3e3);
      },
      stopIncomingCallPolling() {
        if (this.incomingCallPollTimer) {
          formatAppLog("log", "at pages/dial/dial.vue:903", "Stopping incoming call polling...");
          clearInterval(this.incomingCallPollTimer);
          this.incomingCallPollTimer = null;
        }
      },
      async checkIncomingCall() {
        if (!this.userId) {
          formatAppLog("warn", "at pages/dial/dial.vue:911", "Cannot check incoming calls: userId is not set.");
          return;
        }
        try {
          const res = await uni.request({
            url: `http://106.53.30.150:9097/api/check-incoming-calls?userId=${this.userId}`,
            method: "GET"
          });
          formatAppLog("log", "at pages/dial/dial.vue:920", "Check incoming calls response:", res.data);
          if (res.statusCode === 200 && res.data && res.data.code === 0 && res.data.data) {
            const incomingCall = res.data.data;
            if (incomingCall.status === "ringing" && incomingCall.call_type === "redial") {
              const pages = getCurrentPages();
              const currentPage = pages[pages.length - 1];
              const currentRoute = currentPage ? currentPage.route : "";
              if (!currentRoute.includes("call") && !currentRoute.includes("call-back")) {
                formatAppLog("log", "at pages/dial/dial.vue:933", "Incoming call detected:", incomingCall);
                this.stopIncomingCallPolling();
                uni.navigateTo({
                  url: `/pages/call-back/call-back?callId=${incomingCall.callId}&number=${encodeURIComponent(incomingCall.number)}&dialerUserId=${incomingCall.dialerUserId}&location=${encodeURIComponent(incomingCall.location || "未知位置")}&markType=${incomingCall.mark_type || ""}`
                });
              }
            }
          }
        } catch (error2) {
          formatAppLog("error", "at pages/dial/dial.vue:944", "Error checking incoming calls:", error2);
        }
      },
      // <=== 结束添加来电轮询方法 ===>
      handleMorePopupClick(e) {
        if (e.target === e.currentTarget) {
          this.showMore = false;
        }
      },
      // Add a new method to navigate to call details page
      goToCallDetails(callId) {
        formatAppLog("log", "at pages/dial/dial.vue:956", "Clicked info icon for callId:", callId);
        const callItem = this.callLogs.find((item) => item.id === callId);
        if (callItem) {
          formatAppLog("log", "at pages/dial/dial.vue:960", "Found call item:", callItem);
          formatAppLog("log", "at pages/dial/dial.vue:961", "Navigating with number:", callItem.number);
          uni.navigateTo({
            url: `/pages/call-details/call-details?number=${encodeURIComponent(callItem.number)}`
            // We can also pass other info if needed, like displayName or location
            // url: `/pages/call-details/call-details?number=${encodeURIComponent(callItem.number)}&displayName=${encodeURIComponent(callItem.displayName || '')}&location=${encodeURIComponent(callItem.location || '')}`
          });
        } else {
          formatAppLog("error", "at pages/dial/dial.vue:969", "Could not find call item with ID:", callId);
          uni.showToast({
            title: "无法获取号码信息",
            icon: "none"
          });
        }
      },
      setupEventListeners() {
        uni.$off("clearDialInput");
        uni.$on("clearDialInput", () => {
          formatAppLog("log", "at pages/dial/dial.vue:981", "clearDialInput event received");
          this.inputNumber = "";
          this.numberLocation = "";
          this.clearSearchAndCache();
        });
      },
      handlePageClick(e) {
        if (this.showDialpad) {
          this.showDialpad = false;
          this.inputNumber = "";
          this.numberLocation = "";
          this.clearSearchAndCache();
        }
      },
      handleMaskClick() {
        this.showDialpad = false;
        this.inputNumber = "";
        this.numberLocation = "";
        this.clearSearchAndCache();
      },
      handleMaskTouchStart(e) {
        this.maskTouchStartY = e.touches[0].clientY;
      },
      handleMaskTouchMove(e) {
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - this.maskTouchStartY;
        if (deltaY < -50) {
          this.showDialpad = false;
          this.inputNumber = "";
          this.numberLocation = "";
        }
      },
      handleMaskTouchEnd() {
        this.maskTouchStartY = 0;
      },
      handleCallItemTouchStart(e) {
        const itemId = e.currentTarget.dataset.id;
        const item = this.filteredLogs.find((log) => log.id === itemId);
        if (item) {
          item.isActive = true;
        }
        this.touchStart(e);
      },
      handleCallItemTouchEnd(e) {
        const itemId = e.currentTarget.dataset.id;
        const item = this.filteredLogs.find((log) => log.id === itemId);
        if (item) {
          item.isActive = false;
        }
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
        this.inputNumber = "";
        this.numberLocation = "";
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
        if (this.locationDebounceTimer) {
          clearTimeout(this.locationDebounceTimer);
        }
        this.locationDebounceTimer = setTimeout(() => {
          this.updateNumberLocation(number);
        }, 200);
      },
      debouncedSearchCallLogs(query) {
        if (this.searchDebounceTimer) {
          clearTimeout(this.searchDebounceTimer);
        }
        this.searchDebounceTimer = setTimeout(() => {
          this.searchCallLogs(query);
        }, 150);
      },
      searchCallLogs(query) {
        const startTime = Date.now();
        formatAppLog("log", "at pages/dial/dial.vue:1104", "开始搜索，查询字符串:", query);
        if (!query) {
          formatAppLog("log", "at pages/dial/dial.vue:1106", "查询字符串为空，清空搜索结果");
          this.searchResults = [];
          return;
        }
        if (this.searchCache.has(query)) {
          formatAppLog("log", "at pages/dial/dial.vue:1113", "使用缓存的搜索结果");
          this.searchResults = this.searchCache.get(query);
          this.logPerformance("searchCallLogs (cached)", startTime);
          return;
        }
        formatAppLog("log", "at pages/dial/dial.vue:1119", "通话记录总数:", this.callLogs.length);
        if (query.length < 2) {
          this.searchResults = [];
          this.logPerformance("searchCallLogs (short query)", startTime);
          return;
        }
        const searchLimit = Math.min(15, this.callLogs.length);
        const limitedLogs = this.callLogs.slice(0, searchLimit);
        const results = limitedLogs.filter((item) => {
          if (item.number.includes(query)) {
            return true;
          }
          return item.displayName.includes(query);
        }).map((item) => ({ ...item, isActive: false }));
        this.searchCache.set(query, results);
        if (this.searchCache.size > 30) {
          const firstKey = this.searchCache.keys().next().value;
          this.searchCache.delete(firstKey);
        }
        this.searchResults = results;
        formatAppLog("log", "at pages/dial/dial.vue:1150", "搜索结果数量:", results.length);
        this.logPerformance("searchCallLogs", startTime);
      },
      handleSearchResultTouchStart(item, index) {
        this.$set(this.searchResults, index, { ...item, isActive: true });
      },
      handleSearchResultTouchEnd(item, index) {
        this.$set(this.searchResults, index, { ...item, isActive: false });
      },
      // 添加通用的清理方法
      clearSearchAndCache() {
        this.searchResults = [];
        this.searchCache.clear();
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
        formatAppLog("log", "at pages/dial/dial.vue:1177", `性能监控 - ${operation}: ${duration}ms`);
      },
      // 添加清理归属地缓存的方法
      clearLocationCache() {
        const keys = uni.getStorageInfoSync().keys;
        keys.forEach((key) => {
          if (key.startsWith("location_")) {
            uni.removeStorageSync(key);
          }
        });
        formatAppLog("log", "at pages/dial/dial.vue:1188", "已清理归属地缓存");
      },
      // 添加测试归属地处理逻辑的方法
      testLocationLogic() {
        const testCases = [
          { province: "上海", city: "上海", company: "中国移动", expected: "上海 移动" },
          { province: "北京", city: "北京", company: "中国联通", expected: "北京 联通" },
          { province: "广东", city: "深圳", company: "中国电信", expected: "广东深圳 电信" },
          { province: "浙江", city: "杭州", company: "中国移动", expected: "浙江杭州 移动" },
          { province: "四川", city: "成都", company: "", expected: "四川成都" },
          { province: "重庆", city: "重庆", company: "中国移动", expected: "重庆 移动" }
        ];
        formatAppLog("log", "at pages/dial/dial.vue:1201", "测试归属地处理逻辑:");
        testCases.forEach((testCase, index) => {
          const { province, city, company } = testCase;
          const processedChannel = company ? company.replace("中国", "") : "";
          let location = "";
          const municipalities = ["北京", "天津", "上海", "重庆"];
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
          formatAppLog("log", "at pages/dial/dial.vue:1225", `测试用例 ${index + 1}:`, {
            input: { province, city, company },
            output: location,
            expected: testCase.expected,
            passed: location === testCase.expected
          });
        });
      }
    },
    onUnload() {
      uni.$off("clearDialInput");
      uni.$off("callEnded");
      if (this.audioContext) {
        this.audioContext.destroy();
        this.audioContext = null;
      }
      this.stopIncomingCallPolling();
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
      this.setupEventListeners();
      this.fetchCallRecords();
      this.startIncomingCallPolling();
    },
    onHide() {
      this.stopIncomingCallPolling();
    }
  };
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock(
      "view",
      {
        class: vue.normalizeClass(["miui-dial-page", { "show-mmi-error": $data.showMMIErrorDialog, "no-scroll": $data.showDialpad, "show-longpress-dialog": $data.showLongPressDialog }]),
        style: vue.normalizeStyle({
          paddingBottom: $data.showDialpad ? "340rpx" : "0",
          overflow: "hidden",
          height: "100vh",
          overflowY: $data.showDialpad ? "hidden" : "auto",
          touchAction: $data.showDialpad ? "none" : "auto"
        }),
        onClick: _cache[41] || (_cache[41] = (...args) => $options.handlePageClick && $options.handlePageClick(...args))
      },
      [
        $data.dialStatusMessage ? (vue.openBlock(), vue.createElementBlock(
          "view",
          {
            key: 0,
            class: "message-status"
          },
          vue.toDisplayString($data.dialStatusMessage),
          1
          /* TEXT */
        )) : vue.createCommentVNode("v-if", true),
        !$data.inputNumber && $data.callLogs.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "miui-top-content"
        }, [
          vue.createElementVNode(
            "view",
            {
              class: "miui-fixed-header",
              onTouchmove: _cache[3] || (_cache[3] = vue.withModifiers(() => {
              }, ["stop", "prevent"]))
            },
            [
              vue.createElementVNode("view", {
                class: "miui-more-btn",
                onClick: _cache[0] || (_cache[0] = ($event) => $data.showMore = true)
              }, [
                vue.createElementVNode("view", { class: "miui-dot" }),
                vue.createElementVNode("view", { class: "miui-dot" }),
                vue.createElementVNode("view", { class: "miui-dot" })
              ]),
              vue.createElementVNode("view", { class: "miui-header-top" }, [
                vue.createElementVNode("view", { class: "miui-title" }, "电话")
              ]),
              vue.createElementVNode("view", { class: "miui-tabbar" }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["miui-tab", { active: $data.tabIndex === 0 }]),
                    onClick: _cache[1] || (_cache[1] = ($event) => $data.tabIndex = 0)
                  },
                  "全部电话",
                  2
                  /* CLASS */
                ),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["miui-tab", { active: $data.tabIndex === 1 }]),
                    onClick: _cache[2] || (_cache[2] = ($event) => $data.tabIndex = 1)
                  },
                  "未接来电",
                  2
                  /* CLASS */
                )
              ])
            ],
            32
            /* NEED_HYDRATION */
          ),
          vue.createElementVNode(
            "view",
            {
              class: "miui-call-list",
              "scroll-y": "true",
              onScrolltolower: _cache[8] || (_cache[8] = (...args) => $options.onCallListScrollToLower && $options.onCallListScrollToLower(...args)),
              onScroll: _cache[9] || (_cache[9] = (...args) => $options.handleCallListScroll && $options.handleCallListScroll(...args)),
              onTouchstart: _cache[10] || (_cache[10] = (...args) => $options.handleCallListScroll && $options.handleCallListScroll(...args)),
              style: vue.normalizeStyle({
                height: $data.showDialpad ? "600rpx" : "calc(100vh - 400rpx)",
                overflowY: "auto"
              }),
              "lower-threshold": "500"
            },
            [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($options.filteredLogs, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    class: "miui-call-item-wrapper",
                    key: `${item.id}-${index}`
                  }, [
                    vue.createElementVNode("view", {
                      class: vue.normalizeClass(["miui-call-item", { "active": item.isActive }]),
                      style: vue.normalizeStyle([{ "display": "flex", "align-items": "center", "justify-content": "space-between" }, { transform: `translateX(${item.offsetX || 0}px)` }]),
                      onClick: ($event) => $options.redial(item),
                      onTouchstart: _cache[4] || (_cache[4] = (...args) => $options.handleCallItemTouchStart && $options.handleCallItemTouchStart(...args)),
                      onTouchend: _cache[5] || (_cache[5] = (...args) => $options.handleCallItemTouchEnd && $options.handleCallItemTouchEnd(...args)),
                      onTouchcancel: _cache[6] || (_cache[6] = (...args) => $options.handleCallItemTouchEnd && $options.handleCallItemTouchEnd(...args)),
                      onTouchmove: _cache[7] || (_cache[7] = (...args) => $options.touchMove && $options.touchMove(...args)),
                      "data-id": item.id
                    }, [
                      vue.createElementVNode("view", { style: { "display": "flex", "flex-direction": "column", "align-items": "flex-start" } }, [
                        vue.createElementVNode("view", { style: { "display": "flex", "align-items": "center" } }, [
                          vue.createElementVNode("image", {
                            class: "miui-call-status-icon",
                            src: $options.getStatusIcon(item.status),
                            style: { "width": "32rpx", "height": "32rpx", "margin-right": "16rpx" }
                          }, null, 8, ["src"]),
                          vue.createElementVNode(
                            "text",
                            {
                              class: vue.normalizeClass(["miui-call-number", { "missed-call": item.status === "missed" }])
                            },
                            vue.toDisplayString(item.displayName),
                            3
                            /* TEXT, CLASS */
                          )
                        ]),
                        vue.createElementVNode("view", { style: { "display": "flex", "align-items": "center", "margin-top": "4rpx" } }, [
                          vue.createElementVNode("image", {
                            style: { "width": "32rpx", "height": "32rpx", "margin-right": "16rpx", "opacity": "0" },
                            src: _imports_0$7
                          }),
                          vue.createElementVNode("image", {
                            src: _imports_1$5,
                            class: "miui-hd-icon",
                            style: { "width": "32rpx", "height": "32rpx", "margin-right": "16rpx" }
                          }),
                          vue.createElementVNode(
                            "text",
                            { class: "miui-call-location" },
                            vue.toDisplayString(item.location),
                            1
                            /* TEXT */
                          )
                        ])
                      ]),
                      vue.createElementVNode("view", {
                        style: { "display": "flex", "align-items": "center" },
                        onClick: vue.withModifiers(($event) => $options.goToCallDetails(item.id), ["stop"])
                      }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: "miui-call-time",
                            style: { "font-size": "35rpx", "line-height": "35rpx", "color": "#707070", "margin-top": "8rpx" }
                          },
                          vue.toDisplayString(item.time),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("image", {
                          src: _imports_2$4,
                          class: "miui-warning-icon",
                          style: { "width": "48rpx", "height": "48rpx", "margin-left": "8rpx", "opacity": "0.7" }
                        })
                      ], 8, ["onClick"])
                    ], 46, ["onClick", "data-id"]),
                    vue.createElementVNode("view", {
                      class: "miui-delete-btn",
                      onClick: ($event) => $options.deleteRecord(item.id)
                    }, "删除", 8, ["onClick"])
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              )),
              $data.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "miui-batch-loading"
              }, "加载中...")) : vue.createCommentVNode("v-if", true),
              !$data.hasMore && $data.callLogs.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 1,
                class: "miui-batch-nomore"
              }, "没有更多记录了")) : vue.createCommentVNode("v-if", true)
            ],
            36
            /* STYLE, NEED_HYDRATION */
          )
        ])) : vue.createCommentVNode("v-if", true),
        !$data.inputNumber && $data.callLogs.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "miui-smart-dialing"
        }, [
          vue.createElementVNode("view", { class: "miui-smart-dialing-title" }, "智能拨号"),
          vue.createElementVNode("view", { class: "miui-smart-dialing-text" }, ' 根据拼音首字母、全拼或电话号码等查找联系人。 例:查找"小(Xiao)明(Ming)"可点按下方数字键。 '),
          vue.createElementVNode("view", { class: "miui-smart-dialing-example" }, [
            vue.createElementVNode("view", { class: "miui-smart-dialing-key" }, [
              vue.createElementVNode("text", { class: "miui-key-main" }, "9"),
              vue.createElementVNode("text", { class: "miui-key-sub" }, "WXYZ")
            ]),
            vue.createElementVNode("text", { class: "miui-smart-dialing-plus" }, "+"),
            vue.createElementVNode("view", { class: "miui-smart-dialing-key" }, [
              vue.createElementVNode("text", { class: "miui-key-main" }, "6"),
              vue.createElementVNode("text", { class: "miui-key-sub" }, "MNO")
            ])
          ])
        ])) : vue.createCommentVNode("v-if", true),
        $data.inputNumber ? (vue.openBlock(), vue.createElementBlock(
          "view",
          {
            key: 3,
            onTouchmove: _cache[11] || (_cache[11] = vue.withModifiers(() => {
            }, ["stop", "prevent"])),
            onScroll: _cache[12] || (_cache[12] = vue.withModifiers(() => {
            }, ["stop", "prevent"])),
            onClick: _cache[13] || (_cache[13] = vue.withModifiers(() => {
            }, ["stop"])),
            class: "miui-number-float"
          },
          [
            vue.createElementVNode(
              "view",
              { class: "miui-number-display" },
              vue.toDisplayString($data.inputNumber),
              1
              /* TEXT */
            ),
            $data.numberLocation ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "miui-number-location"
            }, [
              vue.createElementVNode(
                "text",
                { class: "miui-number-location-text" },
                vue.toDisplayString($data.numberLocation),
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true),
            $data.searchResults.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "miui-search-results"
            }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.searchResults, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    key: index,
                    class: "miui-search-item-wrapper"
                  }, [
                    vue.createElementVNode("view", {
                      class: vue.normalizeClass(["miui-call-item", { "active": item.isActive }]),
                      onClick: vue.withModifiers(($event) => $options.redial(item), ["stop"]),
                      onTouchstart: ($event) => $options.handleSearchResultTouchStart(item, index),
                      onTouchend: ($event) => $options.handleSearchResultTouchEnd(item, index),
                      onTouchcancel: ($event) => $options.handleSearchResultTouchEnd(item, index)
                    }, [
                      vue.createElementVNode("view", { style: { "display": "flex", "flex-direction": "column", "align-items": "flex-start", "flex": "1" } }, [
                        vue.createElementVNode("view", { style: { "display": "flex", "align-items": "center" } }, [
                          vue.createElementVNode("image", {
                            class: "miui-call-status-icon",
                            src: $options.getStatusIcon(item.status),
                            style: { "width": "32rpx", "height": "32rpx", "margin-right": "16rpx" }
                          }, null, 8, ["src"]),
                          vue.createElementVNode(
                            "text",
                            {
                              class: vue.normalizeClass(["miui-call-number", { "missed-call": item.status === "missed" }])
                            },
                            vue.toDisplayString(item.displayName),
                            3
                            /* TEXT, CLASS */
                          )
                        ]),
                        vue.createElementVNode("view", { style: { "display": "flex", "align-items": "center", "margin-top": "4rpx" } }, [
                          vue.createElementVNode("image", {
                            style: { "width": "32rpx", "height": "32rpx", "margin-right": "16rpx", "opacity": "0" },
                            src: _imports_0$7
                          }),
                          vue.createElementVNode("image", {
                            src: _imports_1$5,
                            class: "miui-hd-icon",
                            style: { "width": "32rpx", "height": "32rpx", "margin-right": "16rpx" }
                          }),
                          vue.createElementVNode(
                            "text",
                            { class: "miui-call-location" },
                            vue.toDisplayString(item.location),
                            1
                            /* TEXT */
                          )
                        ])
                      ]),
                      vue.createElementVNode("view", {
                        style: { "display": "flex", "align-items": "center", "margin-left": "auto", "padding-right": "32rpx" },
                        onClick: vue.withModifiers(($event) => $options.goToCallDetails(item.id), ["stop"])
                      }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: "miui-call-time",
                            style: { "font-size": "35rpx", "line-height": "35rpx", "color": "#707070", "margin-top": "8rpx" }
                          },
                          vue.toDisplayString(item.time),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode("image", {
                          src: _imports_2$4,
                          class: "miui-warning-icon",
                          style: { "width": "48rpx", "height": "48rpx", "margin-left": "8rpx", "opacity": "0.7" }
                        })
                      ], 8, ["onClick"])
                    ], 42, ["onClick", "onTouchstart", "onTouchend", "onTouchcancel"])
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : vue.createCommentVNode("v-if", true)
          ],
          32
          /* NEED_HYDRATION */
        )) : vue.createCommentVNode("v-if", true),
        $data.showDialpad && $data.callLogs.length > 0 && !$data.inputNumber ? (vue.openBlock(), vue.createElementBlock(
          "view",
          {
            key: 4,
            class: "dialpad-mask",
            onClick: _cache[14] || (_cache[14] = (...args) => $options.handleMaskClick && $options.handleMaskClick(...args)),
            onTouchmove: [
              _cache[15] || (_cache[15] = vue.withModifiers(() => {
              }, ["stop", "prevent"])),
              _cache[17] || (_cache[17] = (...args) => $options.handleMaskTouchMove && $options.handleMaskTouchMove(...args))
            ],
            onTouchstart: _cache[16] || (_cache[16] = (...args) => $options.handleMaskTouchStart && $options.handleMaskTouchStart(...args)),
            onTouchend: _cache[18] || (_cache[18] = (...args) => $options.handleMaskTouchEnd && $options.handleMaskTouchEnd(...args))
          },
          null,
          32
          /* NEED_HYDRATION */
        )) : vue.createCommentVNode("v-if", true),
        $data.showDialpad ? (vue.openBlock(), vue.createElementBlock(
          "view",
          {
            key: 5,
            class: "miui-dialpad",
            onTouchmove: _cache[29] || (_cache[29] = vue.withModifiers(() => {
            }, ["stop", "prevent"])),
            onScroll: _cache[30] || (_cache[30] = vue.withModifiers(() => {
            }, ["stop", "prevent"])),
            onClick: _cache[31] || (_cache[31] = vue.withModifiers(() => {
            }, ["stop"])),
            style: vue.normalizeStyle([{ "touch-action": "none", "overflow": "hidden" }, { bottom: $options.dialpadBottom }])
          },
          [
            vue.createElementVNode("view", { class: "miui-keypad" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.keys, (row, rowIndex) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    class: "miui-key-row",
                    key: rowIndex
                  }, [
                    (vue.openBlock(true), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList(row, (key) => {
                        return vue.openBlock(), vue.createElementBlock("view", {
                          class: "miui-key",
                          key: key.main,
                          onClick: ($event) => $options.pressKey(key.main),
                          onLongpress: ($event) => $options.handleLongPressKey(key.main)
                        }, [
                          vue.createElementVNode("view", { class: "miui-key-content" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "miui-key-main" },
                              vue.toDisplayString(key.main),
                              1
                              /* TEXT */
                            ),
                            key.main !== "1" ? (vue.openBlock(), vue.createElementBlock(
                              "text",
                              {
                                key: 0,
                                class: "miui-key-sub"
                              },
                              vue.toDisplayString(key.sub),
                              1
                              /* TEXT */
                            )) : vue.createCommentVNode("v-if", true),
                            key.main === "1" ? (vue.openBlock(), vue.createElementBlock("image", {
                              key: 1,
                              src: _imports_0$6,
                              class: "miui-key-sub"
                            })) : vue.createCommentVNode("v-if", true)
                          ])
                        ], 40, ["onClick", "onLongpress"]);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            vue.createElementVNode("view", { class: "miui-dial-actions" }, [
              vue.createElementVNode("view", {
                class: "miui-action-side",
                onClick: _cache[19] || (_cache[19] = (...args) => $options.toggleDialpad && $options.toggleDialpad(...args))
              }, [
                vue.createElementVNode("image", {
                  src: _imports_4$1,
                  class: "miui-icon-call"
                })
              ]),
              vue.createElementVNode(
                "view",
                {
                  class: vue.normalizeClass(["miui-action-dial", { "active": $data.isDialButtonActive }]),
                  onClick: _cache[20] || (_cache[20] = (...args) => $options.dial && $options.dial(...args)),
                  onTouchstart: _cache[21] || (_cache[21] = (...args) => $options.handleDialButtonTouchStart && $options.handleDialButtonTouchStart(...args)),
                  onTouchend: _cache[22] || (_cache[22] = (...args) => $options.handleDialButtonTouchEnd && $options.handleDialButtonTouchEnd(...args)),
                  onTouchcancel: _cache[23] || (_cache[23] = (...args) => $options.handleDialButtonTouchEnd && $options.handleDialButtonTouchEnd(...args))
                },
                [
                  vue.createElementVNode("image", {
                    src: _imports_3$1,
                    class: "miui-icon-call"
                  })
                ],
                34
                /* CLASS, NEED_HYDRATION */
              ),
              vue.createElementVNode(
                "view",
                {
                  class: vue.normalizeClass(["miui-action-backspace", { "active": $data.isBackspaceActive }]),
                  onClick: _cache[24] || (_cache[24] = (...args) => $options.deleteLastDigit && $options.deleteLastDigit(...args)),
                  onLongpress: _cache[25] || (_cache[25] = (...args) => $options.deleteAllDigits && $options.deleteAllDigits(...args)),
                  onTouchstart: _cache[26] || (_cache[26] = (...args) => $options.handleBackspaceTouchStart && $options.handleBackspaceTouchStart(...args)),
                  onTouchend: _cache[27] || (_cache[27] = (...args) => $options.handleBackspaceTouchEnd && $options.handleBackspaceTouchEnd(...args)),
                  onTouchcancel: _cache[28] || (_cache[28] = (...args) => $options.handleBackspaceTouchEnd && $options.handleBackspaceTouchEnd(...args))
                },
                [
                  vue.createElementVNode("image", {
                    src: _imports_6,
                    class: "miui-icon-backspace"
                  })
                ],
                34
                /* CLASS, NEED_HYDRATION */
              )
            ])
          ],
          36
          /* STYLE, NEED_HYDRATION */
        )) : vue.createCommentVNode("v-if", true),
        $data.showMore ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 6,
          class: "miui-more-popup"
        }, [
          vue.createElementVNode("view", {
            class: "miui-more-mask",
            onClick: _cache[32] || (_cache[32] = ($event) => $data.showMore = false)
          }),
          vue.createElementVNode("view", { class: "miui-more-menu" }, [
            vue.createElementVNode("view", {
              class: "miui-more-item",
              onClick: _cache[33] || (_cache[33] = ($event) => $options.onMenu("粘贴"))
            }, "粘贴"),
            vue.createElementVNode("view", {
              class: "miui-more-item",
              onClick: _cache[34] || (_cache[34] = ($event) => $options.onMenu("批量删除"))
            }, "批量删除")
          ])
        ])) : vue.createCommentVNode("v-if", true),
        !$data.showDialpad ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 7,
          class: "miui-dialpad-fab",
          onClick: _cache[35] || (_cache[35] = vue.withModifiers((...args) => $options.toggleDialpad && $options.toggleDialpad(...args), ["stop"]))
        }, [
          vue.createElementVNode("image", {
            src: _imports_7,
            class: "miui-icon-call"
          })
        ])) : vue.createCommentVNode("v-if", true),
        vue.withDirectives(vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["mmi-error-overlay", { show: $data.showMMIErrorDialog }]),
            onClick: _cache[37] || (_cache[37] = vue.withModifiers((...args) => $options.closeMMIErrorDialog && $options.closeMMIErrorDialog(...args), ["self"]))
          },
          [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["mmi-error-dialog", { show: $data.showMMIErrorDialog }])
              },
              [
                vue.createElementVNode(
                  "text",
                  { class: "mmi-error-message" },
                  vue.toDisplayString($data.mmiErrorMessage),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("view", { class: "mmi-error-button-container" }, [
                  vue.createElementVNode("view", {
                    class: "mmi-error-button",
                    onClick: _cache[36] || (_cache[36] = vue.withModifiers((...args) => $options.closeMMIErrorDialog && $options.closeMMIErrorDialog(...args), ["stop"]))
                  }, [
                    vue.createElementVNode("text", null, "知道了")
                  ])
                ])
              ],
              2
              /* CLASS */
            )
          ],
          2
          /* CLASS */
        ), [
          [vue.vShow, $data.showMMIErrorDialog]
        ]),
        vue.withDirectives(vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["longpress-dialog-overlay", { show: $data.showLongPressDialog }]),
            onClick: _cache[40] || (_cache[40] = vue.withModifiers((...args) => $options.closeLongPressDialog && $options.closeLongPressDialog(...args), ["self"]))
          },
          [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["longpress-dialog", { show: $data.showLongPressDialog }])
              },
              [
                vue.createElementVNode("text", { class: "longpress-dialog-title" }, "提示"),
                vue.createElementVNode("text", { class: "longpress-dialog-message" }, "请先设置一键拨号。"),
                vue.createElementVNode("view", { class: "longpress-dialog-button-container" }, [
                  vue.createElementVNode("view", {
                    class: "longpress-dialog-button",
                    onClick: _cache[38] || (_cache[38] = vue.withModifiers((...args) => $options.cancelLongPressDialog && $options.cancelLongPressDialog(...args), ["stop"]))
                  }, [
                    vue.createElementVNode("text", null, "取消")
                  ]),
                  vue.createElementVNode("view", {
                    class: "longpress-dialog-button confirm-button",
                    onClick: _cache[39] || (_cache[39] = vue.withModifiers((...args) => $options.setOneKeyDialing && $options.setOneKeyDialing(...args), ["stop"]))
                  }, [
                    vue.createElementVNode("text", null, "设置")
                  ])
                ])
              ],
              2
              /* CLASS */
            )
          ],
          2
          /* CLASS */
        ), [
          [vue.vShow, $data.showLongPressDialog]
        ]),
        vue.withDirectives(vue.createElementVNode(
          "view",
          { class: "mock-tabbar" },
          [
            vue.createElementVNode("view", { class: "mock-tabbar-item" }, [
              vue.createElementVNode("image", {
                src: _imports_7,
                class: "mock-tabbar-icon"
              }),
              vue.createElementVNode("text", { class: "mock-tabbar-text" }, "电话")
            ]),
            vue.createElementVNode("view", { class: "mock-tabbar-item" }, [
              vue.createElementVNode("image", {
                src: _imports_8,
                class: "mock-tabbar-icon"
              }),
              vue.createElementVNode("text", { class: "mock-tabbar-text" }, "联系人")
            ]),
            vue.createElementVNode("view", { class: "mock-tabbar-item" }, [
              vue.createElementVNode("image", {
                src: _imports_9,
                class: "mock-tabbar-icon"
              }),
              vue.createElementVNode("text", { class: "mock-tabbar-text" }, "收藏")
            ])
          ],
          512
          /* NEED_PATCH */
        ), [
          [vue.vShow, $data.showMMIErrorDialog || $data.showLongPressDialog]
        ])
      ],
      6
      /* CLASS, STYLE */
    );
  }
  const PagesDialDial = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$a], ["__scopeId", "data-v-19c976a0"], ["__file", "C:/Coding/phone-web/phone/pages/dial/dial.vue"]]);
  const _sfc_main$a = {
    data() {
      return {
        account: "",
        terminal: 1,
        // Default terminal to 1 (微信小程序)
        terminalIndex: 0,
        scene: 1,
        // Default scene to 1 (账号/手机号登录)
        sceneIndex: 0,
        password: "",
        code: ""
      };
    },
    methods: {
      bindPickerChange(e) {
        this.terminalIndex = e.detail.value;
        this.terminal = this.terminals[this.terminalIndex].value;
      },
      bindScenePickerChange(e) {
        this.sceneIndex = e.detail.value;
        this.scene = this.scenes[this.sceneIndex].value;
      },
      async login() {
        var _a;
        if (!this.account) {
          uni.showToast({ title: "请输入账号", icon: "none" });
          return;
        }
        if (this.scene === 1 && !this.password) {
          uni.showToast({ title: "请输入密码", icon: "none" });
          return;
        }
        if (this.scene === 2 && !this.code) {
          uni.showToast({ title: "请输入验证码", icon: "none" });
          return;
        }
        try {
          const response = await uni.request({
            url: "http://106.53.30.150:2025/api/login/account",
            method: "POST",
            data: {
              account: this.account,
              terminal: 3,
              password: this.password,
              scene: 1
            }
          });
          formatAppLog("log", "at pages/auth/login.vue:62", "Login response:", response);
          if (response.statusCode === 200 && response.data && response.data.code === 1) {
            uni.showToast({ title: "登录成功", icon: "success" });
            const token = response.data.data.token;
            uni.setStorageSync("authToken", token);
            this.getUserInfo(token);
          } else {
            uni.showToast({ title: ((_a = response.data) == null ? void 0 : _a.msg) || "登录失败", icon: "none" });
          }
        } catch (error2) {
          formatAppLog("error", "at pages/auth/login.vue:78", "Login failed:", error2);
          uni.showToast({ title: "网络错误", icon: "none" });
        }
      },
      getUserInfo(token) {
        uni.request({
          url: "http://106.53.30.150:2025/api/user/center",
          method: "GET",
          header: {
            "token": token
            // 在 header 中携带 token
          },
          success: (res) => {
            var _a;
            formatAppLog("log", "at pages/auth/login.vue:90", "User info response:", res);
            if (res.statusCode === 200 && res.data && res.data.code === 1) {
              const userId = res.data.data.id;
              uni.setStorageSync("userId", userId);
              formatAppLog("log", "at pages/auth/login.vue:94", "Stored userId:", userId);
              uni.reLaunch({
                url: "/pages/dial/dial"
              });
            } else {
              uni.showToast({ title: ((_a = res.data) == null ? void 0 : _a.msg) || "获取用户信息失败", icon: "none" });
              uni.reLaunch({
                url: "/pages/dial/dial"
              });
            }
          },
          fail: (err) => {
            formatAppLog("error", "at pages/auth/login.vue:110", "Failed to get user info:", err);
            uni.showToast({ title: "获取用户信息网络错误", icon: "none" });
            uni.reLaunch({
              url: "/pages/dial/dial"
            });
          }
        });
      }
    }
  };
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "login-container" }, [
      vue.createElementVNode("text", { class: "title" }, "账号登录"),
      vue.withDirectives(vue.createElementVNode(
        "input",
        {
          class: "input",
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.account = $event),
          placeholder: "账号"
        },
        null,
        512
        /* NEED_PATCH */
      ), [
        [vue.vModelText, $data.account]
      ]),
      $data.scene === 1 ? vue.withDirectives((vue.openBlock(), vue.createElementBlock(
        "input",
        {
          key: 0,
          class: "input",
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.password = $event),
          type: "password",
          placeholder: "密码"
        },
        null,
        512
        /* NEED_PATCH */
      )), [
        [vue.vModelText, $data.password]
      ]) : vue.createCommentVNode("v-if", true),
      $data.scene === 2 ? vue.withDirectives((vue.openBlock(), vue.createElementBlock(
        "input",
        {
          key: 1,
          class: "input",
          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.code = $event),
          placeholder: "验证码"
        },
        null,
        512
        /* NEED_PATCH */
      )), [
        [vue.vModelText, $data.code]
      ]) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("button", {
        class: "login-button",
        onClick: _cache[3] || (_cache[3] = (...args) => $options.login && $options.login(...args))
      }, "登录")
    ]);
  }
  const PagesAuthLogin = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$9], ["__scopeId", "data-v-2cc9f8c3"], ["__file", "C:/Coding/phone-web/phone/pages/auth/login.vue"]]);
  const { registerUTSInterface, initUTSProxyClass, initUTSProxyFunction, initUTSPackageName, initUTSIndexClassName, initUTSClassName } = uni;
  const name = "u7746Wallpaper";
  const moduleName = "u7746-wallpaper";
  const moduleType = "";
  const errMsg = ``;
  const is_uni_modules = true;
  const pkg = /* @__PURE__ */ initUTSPackageName(name, is_uni_modules);
  const cls = /* @__PURE__ */ initUTSIndexClassName(name, is_uni_modules);
  const exports$1 = { __esModule: true };
  exports$1.getBackground = /* @__PURE__ */ initUTSProxyFunction(false, { moduleName, moduleType, errMsg, main: true, package: pkg, class: cls, name: "getBackgroundByJs", keepAlive: false, params: [{ "name": "wallpaperName", "type": "string" }], return: "" });
  uni.registerUTSPlugin("uni_modules/u7746-wallpaper", exports$1);
  const u7746wallpaper = uni.requireUTSPlugin("uni_modules/u7746-wallpaper");
  const STORAGE_KEY = "app_logs";
  const MAX_LOGS = 1e3;
  function nowISO() {
    try {
      return (/* @__PURE__ */ new Date()).toISOString();
    } catch (e) {
      return "" + Date.now();
    }
  }
  function todayStr() {
    const d = /* @__PURE__ */ new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function safeGet() {
    try {
      const raw = uni.getStorageSync(STORAGE_KEY);
      if (!raw)
        return [];
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  function safeSet(list) {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
    }
  }
  function appendToFileIfSupported(entry) {
    try {
      if (typeof plus === "undefined" || !plus.io)
        return;
      const fileName = `app_logs_${todayStr()}.jsonl`;
      const text = JSON.stringify(entry) + "\n";
      plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
        fs.root.getDirectory("logs", { create: true }, (dirEntry) => {
          dirEntry.getFile(fileName, { create: true }, (fileEntry) => {
            fileEntry.file((file) => {
              fileEntry.createWriter((writer) => {
                try {
                  if (typeof writer.seek === "function") {
                    writer.seek(file.size);
                  }
                  if (typeof Blob !== "undefined") {
                    writer.write(new Blob([text], { type: "text/plain;charset=utf-8" }));
                  } else {
                    writer.write(text);
                  }
                } catch (e) {
                }
              });
            });
          });
        });
      });
    } catch (e) {
    }
  }
  const Logger = {
    log(tag, payload = {}) {
      const list = safeGet();
      const entry = {
        time: nowISO(),
        tag,
        ...payload
      };
      list.push(entry);
      if (list.length > MAX_LOGS) {
        list.splice(0, list.length - MAX_LOGS);
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
      return `_doc/logs/app_logs_${todayStr()}.jsonl`;
    }
  };
  const _imports_2$3 = "/static/icons/end-call.png";
  const _sfc_main$9 = {
    data() {
      return {
        imgUrl: "",
        number: "186 8828 2571",
        location: "未知",
        status: "正在拨号...",
        ringtoneContext: null,
        endCallContext: null,
        endCallMusicList: [
          "/static/audio/end-call1.mp3",
          "/static/audio/end-call2.mp3"
        ],
        ringtoneList: [
          "/static/audio/ringtone21.mp3",
          "/static/audio/ringtone22.mp3",
          "/static/audio/ringtone23.mp3",
          "/static/audio/ringtone24.mp3",
          "/static/audio/ringtone25.mp3",
          "/static/audio/ringtone26.mp3",
          "/static/audio/ringtone27.mp3",
          "/static/audio/ringtone28.mp3",
          "/static/audio/ringtone29.mp3",
          "/static/audio/ringtone30.mp3",
          "/static/audio/ringtone31.mp3",
          "/static/audio/ringtone32.mp3",
          "/static/audio/ringtone33.mp3",
          "/static/audio/ringtone34.mp3",
          "/static/audio/ringtone35.mp3",
          "/static/audio/ringtone36.mp3",
          "/static/audio/ringtone37.mp3",
          "/static/audio/ringtone38.mp3",
          "/static/audio/ringtone39.mp3",
          "/static/audio/ringtone40.mp3",
          "/static/audio/ringtone41.mp3",
          "/static/audio/ringtone42.mp3",
          "/static/audio/ringtone43.mp3",
          "/static/audio/ringtone44.mp3",
          "/static/audio/ringtone45.mp3",
          "/static/audio/ringtone46.mp3",
          "/static/audio/ringtone47.mp3",
          "/static/audio/ringtone48.mp3",
          "/static/audio/ringtone49.mp3",
          "/static/audio/ringtone50.mp3",
          "/static/audio/ringtone51.mp3",
          "/static/audio/ringtone52.mp3",
          "/static/audio/ringtone53.mp3",
          "/static/audio/ringtone54.mp3",
          "/static/audio/ringtone55.mp3",
          "/static/audio/ringtone56.mp3",
          "/static/audio/ringtone57.mp3",
          "/static/audio/ringtone58.mp3",
          "/static/audio/ringtone59.mp3",
          "/static/audio/ringtone60.mp3",
          "/static/audio/ringtone61.mp3",
          "/static/audio/ringtone62.mp3",
          "/static/audio/ringtone63.mp3",
          "/static/audio/ringtone64.mp3",
          "/static/audio/ringtone65.mp3",
          "/static/audio/ringtone66.mp3",
          "/static/audio/ringtone67.mp3",
          "/static/audio/ringtone68.mp3",
          "/static/audio/ringtone69.mp3",
          "/static/audio/ringtone70.mp3",
          "/static/audio/ringtone71.mp3",
          "/static/audio/ringtone72.mp3",
          "/static/audio/ringtone73.mp3",
          "/static/audio/ringtone74.mp3",
          "/static/audio/ringtone75.mp3",
          "/static/audio/ringtone76.mp3",
          "/static/audio/ringtone77.mp3",
          "/static/audio/ringtone78.mp3",
          "/static/audio/ringtone79.mp3",
          "/static/audio/ringtone80.mp3",
          "/static/audio/ringtone81.mp3",
          "/static/audio/ringtone82.mp3",
          "/static/audio/ringtone83.mp3",
          "/static/audio/ringtone84.mp3",
          "/static/audio/ringtone85.mp3",
          "/static/audio/ringtone86.mp3",
          "/static/audio/ringtone87.mp3",
          "/static/audio/ringtone88.mp3",
          "/static/audio/ringtone89.mp3",
          "/static/audio/ringtone90.mp3",
          "/static/audio/ringtone91.mp3",
          "/static/audio/ringtone92.mp3",
          "/static/audio/ringtone93.mp3",
          "/static/audio/ringtone94.mp3",
          "/static/audio/ringtone95.mp3",
          "/static/audio/ringtone96.mp3",
          "/static/audio/ringtone97.mp3",
          "/static/audio/ringtone98.mp3",
          "/static/audio/ringtone99.mp3",
          "/static/audio/ringtone100.mp3",
          "/static/audio/ringtone101.mp3",
          "/static/audio/ringtone102.mp3",
          "/static/audio/ringtone103.mp3",
          "/static/audio/ringtone104.mp3",
          "/static/audio/ringtone105.mp3",
          "/static/audio/ringtone106.mp3",
          "/static/audio/ringtone107.mp3",
          "/static/audio/ringtone108.mp3",
          "/static/audio/ringtone109.mp3",
          "/static/audio/ringtone110.mp3",
          "/static/audio/ringtone111.mp3",
          "/static/audio/ringtone112.mp3",
          "/static/audio/ringtone113.mp3",
          "/static/audio/ringtone114.mp3",
          "/static/audio/ringtone115.mp3",
          "/static/audio/ringtone116.mp3",
          "/static/audio/ringtone117.mp3",
          "/static/audio/ringtone118.mp3",
          "/static/audio/ringtone119.mp3",
          "/static/audio/ringtone120.mp3",
          "/static/audio/ringtone121.mp3",
          "/static/audio/ringtone122.mp3",
          "/static/audio/ringtone123.mp3",
          "/static/audio/ringtone124.mp3",
          "/static/audio/ringtone125.mp3",
          "/static/audio/ringtone126.mp3",
          "/static/audio/ringtone127.mp3",
          "/static/audio/ringtone128.mp3",
          "/static/audio/ringtone129.mp3",
          "/static/audio/ringtone130.mp3",
          "/static/audio/ringtone131.mp3",
          "/static/audio/ringtone132.mp3",
          "/static/audio/ringtone133.mp3",
          "/static/audio/ringtone134.mp3",
          "/static/audio/ringtone135.mp3",
          "/static/audio/ringtone136.mp3",
          "/static/audio/ringtone137.mp3",
          "/static/audio/ringtone138.mp3",
          "/static/audio/ringtone139.mp3",
          "/static/audio/ringtone140.mp3",
          "/static/audio/ringtone141.mp3",
          "/static/audio/ringtone142.mp3",
          "/static/audio/ringtone143.mp3",
          "/static/audio/ringtone144.mp3",
          "/static/audio/ringtone145.mp3"
        ],
        currentRingtone: null,
        selectedRingtone: null,
        buttons: [
          {
            icon: "/static/icons/record.png",
            activeIcon: "/static/icons/action-record.png",
            text: "录音",
            isActive: false
          },
          {
            icon: "/static/icons/wait.png",
            activeIcon: "/static/icons/action-wait.png",
            text: "等待",
            isActive: false
          },
          { icon: "/static/icons/add.png", text: "添加通话" },
          { icon: "/static/icons/video.png", text: "视频通话" },
          {
            icon: "/static/icons/mute.png",
            activeIcon: "/static/icons/action-mute.png",
            text: "静音",
            isActive: false
          },
          { icon: "/static/icons/contact.png", text: "联系人" },
          {
            icon: "/static/icons/keypad.png",
            activeIcon: "/static/icons/keypad.png",
            text: "",
            isActive: false
          },
          {
            icon: "/static/icons/speaker.png",
            activeIcon: "/static/icons/action-speaker.png",
            text: "",
            isActive: false
          }
        ],
        showKeypad: false,
        keys: [
          [{ main: "1", sub: "" }, { main: "2", sub: "ABC" }, { main: "3", sub: "DEF" }],
          [{ main: "4", sub: "GHI" }, { main: "5", sub: "JKL" }, { main: "6", sub: "MNO" }],
          [{ main: "7", sub: "PQRS" }, { main: "8", sub: "TUV" }, { main: "9", sub: "WXYZ" }],
          [{ main: "*", sub: "" }, { main: "0", sub: "+" }, { main: "#", sub: "" }]
        ],
        keypadInput: "",
        audioContext: null,
        callDuration: 0,
        durationTimer: null,
        callId: "",
        userId: uni.getStorageSync("userId") || 6,
        // 从本地存储获取 userId，如果不存在则使用默认值 6
        pollTimer: null,
        // 添加轮询定时器
        ringtonePollTimer: null,
        lastRingtoneUpdateTime: 0,
        isPlayingRingtone: false,
        fromCallBack: false,
        // 添加标识是否从 call-back 跳转过来的标志
        internalStatus: "",
        // 添加内部状态变量
        hasPlayedEndMusic: false,
        // 添加标志来跟踪是否已经播放过结束音乐
        // Placeholder for the actual call audio player instance
        callAudioPlayer: null,
        // Use plus.audio.Player for ringtone to control route
        ringtonePlayer: null,
        ringtoneContext: null,
        // Revert to ringtoneContext
        navigateBackTimeout: null,
        // Added for navigation timeout handling
        endMusicPlayCount: 0,
        // Add counter for end call music plays
        ringtonePlayCount: 0,
        // 添加铃声播放次数计数器
        maxRingtonePlays: 2,
        // 最大播放次数
        ringtoneTimeout: null,
        // 添加铃声超时定时器
        ringtoneStartTime: null,
        // 添加铃声开始时间
        maxRingtoneDuration: 96,
        // 最大播放时长（秒）
        ringtoneDurationTimer: null,
        // 添加铃声时长计时器
        hasSentHangup: false,
        // 防止重复发送挂断请求
        unknownStatusNotified: false
        // 未知状态提示防抖
      };
    },
    computed: {
      // 添加计算属性，根据 fromCallBack 决定显示什么
      displayStatus() {
        if (this.fromCallBack) {
          return this.status;
        } else {
          return this.internalStatus;
        }
      }
    },
    onLoad(options) {
      this.number = options.number || "";
      this.location = decodeURIComponent(options.location || "");
      this.initialStatus = options.initialStatus || "正在拨号...";
      this.callId = options.callId || "";
      this.dialerUserId = options.dialerUserId || "";
      this.markType = options.markType || "";
      this.status = this.initialStatus;
      setTimeout(() => {
        this.preloadCallRecords();
      }, 3e3);
      this.audioContext = uni.createInnerAudioContext();
      this.audioContext.onError((res) => {
        formatAppLog("error", "at pages/call/calling.vue:318", "Audio Error:", res.errMsg);
      });
      this.ringtoneContext = uni.createInnerAudioContext();
      this.ringtoneContext.onEnded(() => {
        formatAppLog("log", "at pages/call/calling.vue:324", "Ringtone finished playing, checking duration.");
        const currentTime = Math.floor(Date.now() / 1e3);
        const elapsedTime = currentTime - this.ringtoneStartTime;
        if (elapsedTime >= this.maxRingtoneDuration) {
          formatAppLog("log", "at pages/call/calling.vue:330", "Maximum duration reached, stopping playback.");
          this.stopRingtoneAndNavigate();
        } else {
          if (this.ringtoneContext) {
            this.ringtoneContext.src = this.selectedRingtone;
            this.ringtoneContext.play();
          }
        }
      });
      this.ringtoneContext.onError((res) => {
        formatAppLog("error", "at pages/call/calling.vue:341", "Ringtone Error:", res.errMsg);
      });
      formatAppLog("log", "at pages/call/calling.vue:343", "Successfully created uni.createInnerAudioContext for ringtone.");
      this.endCallContext = uni.createInnerAudioContext();
      this.endCallContext.onError((res) => {
        formatAppLog("error", "at pages/call/calling.vue:348", "End Call Music Error:", res.errMsg);
      });
      let originalNumber = "";
      let originalLocation = "";
      if (options.number) {
        originalNumber = options.number;
        this.number = this.formatPhoneNumber(originalNumber);
      }
      if (options.location) {
        originalLocation = decodeURIComponent(options.location);
        this.location = originalLocation;
      }
      if (originalNumber) {
        this.checkContactAndDisplay(originalNumber, originalLocation);
      }
      if (options.callId) {
        this.callId = options.callId;
        this.fromCallBack = options.fromCallBack === "true";
        if (this.fromCallBack) {
          formatAppLog("log", "at pages/call/calling.vue:375", "From call-back page, starting timer immediately");
          this.status = "00:00";
          this.internalStatus = "00:00";
          this.callDuration = 0;
          this.startDurationTimer();
        }
        this.startPolling();
      }
      if (options.initialStatus) {
        this.status = decodeURIComponent(options.initialStatus);
        this.internalStatus = this.status;
      }
      const cachedBg = uni.getStorageSync("cached_background");
      const cacheTime = uni.getStorageSync("background_cache_time");
      const now = Date.now();
      if (cachedBg && cacheTime && now - cacheTime < 24 * 60 * 60 * 1e3) {
        this.imgUrl = cachedBg;
        formatAppLog("log", "at pages/call/calling.vue:398", "Using cached background image");
      } else {
        const ret = u7746wallpaper.getBackground("test.png");
        if (ret.code === "1") {
          this.imgUrl = ret.msg;
          uni.setStorageSync("cached_background", ret.msg);
          uni.setStorageSync("background_cache_time", now);
          formatAppLog("log", "at pages/call/calling.vue:407", "Updated background image cache");
        } else {
          this.imgUrl = "/static/images/bg.jpg";
          formatAppLog("log", "at pages/call/calling.vue:410", "Using default background image");
        }
      }
      if (!options.callId) {
        this.sendDialRequest();
      }
      this.startRingtonePolling();
      if (typeof plus !== "undefined" && plus.audio && plus.audio.createPlayer)
        ;
    },
    methods: {
      formatPhoneNumber(number) {
        const cleaned = number.replace(/\s/g, "");
        const match = cleaned.match(/^(\d{3})(\d{0,4})(\d{0,4})$/);
        if (match) {
          const parts = match.slice(1).filter(Boolean);
          return parts.join(" ");
        }
        return number;
      },
      startDurationTimer() {
        formatAppLog("log", "at pages/call/calling.vue:443", "Starting duration timer");
        if (this.durationTimer) {
          clearInterval(this.durationTimer);
        }
        this.callDuration = 0;
        this.durationTimer = setInterval(() => {
          this.callDuration++;
          this.updateCallStatus();
          formatAppLog("log", "at pages/call/calling.vue:451", "Timer tick:", this.callDuration, "Current status:", this.internalStatus);
        }, 1e3);
      },
      updateCallStatus() {
        if (this.callDuration >= 0) {
          const minutes = Math.floor(this.callDuration / 60);
          const seconds = this.callDuration % 60;
          const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
          formatAppLog("log", "at pages/call/calling.vue:460", "Updating status to:", timeString);
          this.status = timeString;
          this.internalStatus = timeString;
        }
      },
      toggleButton(index) {
        if (this.buttons[index].activeIcon) {
          this.buttons[index].isActive = !this.buttons[index].isActive;
          if (index === 6) {
            this.showKeypad = !this.showKeypad;
          }
          if (index === 7) {
            if (this.ringtonePlayer) {
              this.ringtonePlayer.volume = this.buttons[index].isActive ? 2 : 0.3;
              formatAppLog("log", "at pages/call/calling.vue:477", "Speaker button toggled, plus.audio.Player volume set to:", this.ringtonePlayer.volume);
            } else if (this.ringtoneContext) {
              this.ringtoneContext.volume = this.buttons[index].isActive ? 1 : 0.2;
              formatAppLog("log", "at pages/call/calling.vue:481", "Speaker button toggled, uni.createInnerAudioContext volume set to:", this.ringtoneContext.volume);
            }
          }
        }
      },
      pressKey(key) {
        this.keypadInput += key;
      },
      deleteLastDigit() {
        if (this.keypadInput.length > 0) {
          this.keypadInput = this.keypadInput.slice(0, -1);
        }
      },
      // 发送拨号请求
      async sendDialRequest() {
        var _a, _b;
        if (!this.number) {
          uni.showToast({ title: "号码不能为空", icon: "none" });
          return;
        }
        this.status = "正在拨号...";
        try {
          const res = await uni.request({
            url: "http://106.53.30.150:9097/api/dial",
            method: "POST",
            data: {
              number: this.number.replace(/\s/g, ""),
              dialerUserId: this.userId,
              targetUserId: this.userId,
              location: this.location
            }
          });
          formatAppLog("log", "at pages/call/calling.vue:514", this.location);
          formatAppLog("log", "at pages/call/calling.vue:515", "Dial request response:", res);
          if (res.statusCode === 200 && res.data && res.data.code === 0) {
            this.callId = (_a = res.data.data) == null ? void 0 : _a.callId;
            this.status = "正在等待对方接听...";
            this.startPolling();
          } else {
            this.status = "拨号失败";
            uni.showToast({
              title: ((_b = res.data) == null ? void 0 : _b.msg) || "拨号失败",
              icon: "none"
            });
            setTimeout(() => {
              var _a2, _b2;
              Logger.log("navigate", { reason: "dial_request_failed", status: this.internalStatus, callId: this.callId, serverMsg: (_a2 = res.data) == null ? void 0 : _a2.msg });
              formatAppLog("log", "at pages/call/calling.vue:531", "Navigate due to dial_request_failed", { reason: "dial_request_failed", status: this.internalStatus, callId: this.callId, serverMsg: (_b2 = res.data) == null ? void 0 : _b2.msg });
              uni.switchTab({
                url: "/pages/dial/dial"
              });
            }, 2e3);
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call/calling.vue:538", "Dial request failed:", error2);
          this.status = "拨号失败";
          uni.showToast({
            title: "网络错误",
            icon: "none"
          });
          setTimeout(() => {
            Logger.log("navigate", { reason: "dial_request_network_error", status: this.internalStatus, callId: this.callId });
            formatAppLog("log", "at pages/call/calling.vue:546", "Navigate due to dial_request_network_error", { reason: "dial_request_network_error", status: this.internalStatus, callId: this.callId });
            uni.switchTab({
              url: "/pages/dial/dial"
            });
          }, 2e3);
        }
      },
      // 开始轮询通话状态
      startPolling() {
        this.pollTimer = setInterval(() => {
          this.checkCallStatus();
        }, 1e3);
      },
      // 停止轮询
      stopPolling() {
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
      },
      // 检查通话状态
      async checkCallStatus() {
        if (!this.callId)
          return;
        try {
          const res = await uni.request({
            url: `http://106.53.30.150:9097/api/call-status`,
            method: "GET",
            data: {
              callId: this.callId
            }
          });
          formatAppLog("log", "at pages/call/calling.vue:582", "Call status response:", res);
          if (res.statusCode === 200 && res.data && res.data.code === 0) {
            const status = res.data.data.status;
            formatAppLog("log", "at pages/call/calling.vue:586", "Current call status:", status);
            if (status !== "ringing" && this.isPlayingRingtone) {
              formatAppLog("log", "at pages/call/calling.vue:590", "Status changed from ringing, stopping ringtone");
              this.stopRingtone();
              this.stopRingtonePolling();
            }
            switch (status) {
              case "ringing":
                this.internalStatus = "正在等待对方接听...";
                this.checkRingtoneStatus();
                break;
              case "connected":
                if (!this.durationTimer) {
                  formatAppLog("log", "at pages/call/calling.vue:603", "Call connected, starting timer");
                  this.internalStatus = "00:00";
                  this.startDurationTimer();
                  try {
                    const ringtoneRes = await uni.request({
                      url: "http://106.53.30.150:9097/api/ringtone-status",
                      method: "POST",
                      data: {
                        userId: this.userId,
                        isPlaying: false
                      }
                    });
                    if (ringtoneRes.statusCode === 200 && ringtoneRes.data && ringtoneRes.data.code === 0) {
                      formatAppLog("log", "at pages/call/calling.vue:619", "Successfully updated ringtone status to false for connected call");
                    } else {
                      formatAppLog("error", "at pages/call/calling.vue:621", "Failed to update ringtone status for connected call");
                    }
                  } catch (error2) {
                    formatAppLog("error", "at pages/call/calling.vue:624", "Error updating ringtone status for connected call:", error2);
                  }
                }
                break;
              case "failed":
                formatAppLog("log", "at pages/call/calling.vue:629", "Call failed");
                this.internalStatus = "无法接通";
                if (this.durationTimer) {
                  clearInterval(this.durationTimer);
                  this.durationTimer = null;
                }
                formatAppLog("log", "at pages/call/calling.vue:635", "Navigate due to call_status_failed", { reason: "call_status_failed", status: this.internalStatus, callId: this.callId });
                uni.switchTab({
                  url: "/pages/dial/dial"
                });
                break;
              case "canceled":
                formatAppLog("log", "at pages/call/calling.vue:641", "Call ended with status: canceled");
                this.internalStatus = "已取消";
                if (this.durationTimer) {
                  clearInterval(this.durationTimer);
                  this.durationTimer = null;
                }
                uni.$emit("callEnded");
                formatAppLog("log", "at pages/call/calling.vue:649", "Navigate due to call_status_canceled", { reason: "call_status_canceled", status: this.internalStatus, callId: this.callId });
                uni.switchTab({
                  url: "/pages/dial/dial"
                });
                break;
              case "weijie":
              case "guaduan":
                formatAppLog("log", "at pages/call/calling.vue:656", "Call ended with status:", status);
                if (this.durationTimer) {
                  clearInterval(this.durationTimer);
                  this.durationTimer = null;
                }
                if (!this.hasPlayedEndMusic) {
                  this.hasPlayedEndMusic = true;
                  this.playEndCallMusic(status);
                }
                uni.$emit("callEnded");
                break;
              case "disconnected":
                formatAppLog("log", "at pages/call/calling.vue:671", "Call disconnected");
                this.internalStatus = "通话已结束";
                this.stopPolling();
                if (this.durationTimer) {
                  clearInterval(this.durationTimer);
                  this.durationTimer = null;
                }
                uni.$emit("callEnded");
                formatAppLog("log", "at pages/call/calling.vue:679", "Navigate due to call_status_disconnected", { reason: "call_status_disconnected", status: this.internalStatus, callId: this.callId });
                uni.switchTab({
                  url: "/pages/dial/dial"
                });
                break;
              default:
                formatAppLog("warn", "at pages/call/calling.vue:685", "Unknown backend call status, will not navigate", { backendStatus: status, callId: this.callId });
                if (!this.unknownStatusNotified) {
                  this.unknownStatusNotified = true;
                  uni.showToast({ title: `未知状态：${status}`, icon: "none" });
                }
                break;
            }
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call/calling.vue:694", "Failed to check call status:", error2);
        }
      },
      // 新增：发送挂断请求的方法
      async sendHangupRequest() {
        var _a;
        if (!this.callId) {
          formatAppLog("log", "at pages/call/calling.vue:700", "No callId, skipping hangup request.");
          return;
        }
        if (this.hasSentHangup) {
          formatAppLog("log", "at pages/call/calling.vue:704", "Hangup already sent, skipping duplicate request.");
          return;
        }
        this.hasSentHangup = true;
        try {
          formatAppLog("log", "at pages/call/calling.vue:709", "Sending background hangup request for callId:", this.callId);
          const res = await uni.request({
            url: "http://106.53.30.150:9097/api/hangup",
            method: "POST",
            data: {
              callId: this.callId,
              action: "hangup"
            }
          });
          formatAppLog("log", "at pages/call/calling.vue:718", "Background hangup response:", res);
          if (res.statusCode === 200 && res.data && res.data.code === 0) {
            formatAppLog("log", "at pages/call/calling.vue:720", "Background hangup successful.");
          } else {
            formatAppLog("error", "at pages/call/calling.vue:722", "Background hangup failed:", ((_a = res.data) == null ? void 0 : _a.msg) || "Unknown error");
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call/calling.vue:725", "Error sending background hangup request:", error2);
        }
      },
      endCall() {
        formatAppLog("log", "at pages/call/calling.vue:729", "endCall called");
        if (this.callId) {
          formatAppLog("log", "at pages/call/calling.vue:733", "Sending hangup request for callId:", this.callId);
          this.sendHangupRequest();
          uni.$emit("clearDialInput");
          Logger.log("navigate", { reason: "user_end_call", status: this.internalStatus, callId: this.callId });
          formatAppLog("log", "at pages/call/calling.vue:737", "Navigate due to user_end_call", { reason: "user_end_call", status: this.internalStatus, callId: this.callId });
          uni.switchTab({
            url: "/pages/dial/dial"
          });
          formatAppLog("log", "at pages/call/calling.vue:741", "Hangup request initiated. Switching to dial page.");
        } else {
          formatAppLog("log", "at pages/call/calling.vue:744", "No callId, switching to dial page.");
          uni.switchTab({
            url: "/pages/dial/dial"
          });
        }
      },
      async stopRingtoneAndNavigate() {
        if (this.ringtoneContext) {
          this.ringtoneContext.stop();
          this.selectedRingtone = null;
        }
        if (this.ringtoneDurationTimer) {
          clearInterval(this.ringtoneDurationTimer);
          this.ringtoneDurationTimer = null;
        }
        if (this.ringtoneTimeout) {
          clearTimeout(this.ringtoneTimeout);
          this.ringtoneTimeout = null;
        }
        this.ringtoneStartTime = null;
        try {
          const res = await uni.request({
            url: "http://106.53.30.150:9097/api/ringtone-status",
            method: "POST",
            data: {
              userId: this.userId,
              isPlaying: false
            }
          });
          if (res.statusCode === 200 && res.data && res.data.code === 0) {
            formatAppLog("log", "at pages/call/calling.vue:782", "Successfully updated ringtone status to false");
          } else {
            formatAppLog("error", "at pages/call/calling.vue:784", "Failed to update ringtone status");
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call/calling.vue:787", "Error updating ringtone status:", error2);
        }
        await this.sendHangupRequest();
        uni.$emit("clearDialInput");
        Logger.log("navigate", { reason: "ringtone_timeout", status: this.internalStatus, callId: this.callId });
        formatAppLog("log", "at pages/call/calling.vue:796", "Navigate due to ringtone_timeout", { reason: "ringtone_timeout", status: this.internalStatus, callId: this.callId });
        uni.switchTab({
          url: "/pages/dial/dial"
        });
      },
      async playRandomRingtone() {
        formatAppLog("log", "at pages/call/calling.vue:802", "playRandomRingtone called");
        if (!this.ringtoneContext) {
          formatAppLog("warn", "at pages/call/calling.vue:804", "ringtoneContext not available, cannot play ringtone.");
          return;
        }
        if (this.ringtoneStartTime) {
          const currentTime = Math.floor(Date.now() / 1e3);
          const elapsedTime = currentTime - this.ringtoneStartTime;
          if (elapsedTime >= this.maxRingtoneDuration) {
            formatAppLog("log", "at pages/call/calling.vue:814", "Maximum ringtone duration reached, stopping playback");
            await this.stopRingtoneAndNavigate();
            return;
          }
        } else {
          this.ringtoneStartTime = Math.floor(Date.now() / 1e3);
          formatAppLog("log", "at pages/call/calling.vue:821", "Starting ringtone playback timer");
        }
        const cleanedNumber = this.number.replace(/\s/g, "");
        const todayString = this.getCurrentDateString();
        const storageKey = "number_ringtone_preferences";
        const preferencesString = uni.getStorageSync(storageKey);
        let preferences = preferencesString ? JSON.parse(preferencesString) : {};
        let useStoredRingtone = false;
        if (preferences[cleanedNumber] && preferences[cleanedNumber].date === todayString) {
          this.selectedRingtone = preferences[cleanedNumber].ringtoneUrl;
          useStoredRingtone = true;
          formatAppLog("log", "at pages/call/calling.vue:838", `Using stored ringtone for ${cleanedNumber} for today: ${this.selectedRingtone}`);
        }
        if (!useStoredRingtone) {
          const randomIndex = Math.floor(Math.random() * this.ringtoneList.length);
          this.selectedRingtone = this.ringtoneList[randomIndex];
          preferences[cleanedNumber] = {
            ringtoneUrl: this.selectedRingtone,
            date: todayString
          };
          uni.setStorageSync(storageKey, JSON.stringify(preferences));
          formatAppLog("log", "at pages/call/calling.vue:852", `Selected random ringtone for ${cleanedNumber} and stored for today: ${this.selectedRingtone}`);
        }
        this.ringtoneContext.src = this.selectedRingtone;
        this.ringtoneContext.volume = this.buttons[7].isActive ? 1 : 0.2;
        this.ringtoneContext.play();
        formatAppLog("log", "at pages/call/calling.vue:859", "Attempting to play ringtone:", this.selectedRingtone, "with volume:", this.ringtoneContext.volume);
        try {
          const res = await uni.request({
            url: "http://106.53.30.150:9097/api/ringtone-status",
            method: "POST",
            data: {
              userId: this.userId,
              isPlaying: true
            }
          });
          if (res.statusCode === 200 && res.data && res.data.code === 0) {
            formatAppLog("log", "at pages/call/calling.vue:873", "Successfully updated ringtone status on server");
          } else {
            formatAppLog("error", "at pages/call/calling.vue:875", "Failed to update ringtone status:", error);
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call/calling.vue:878", "Error updating ringtone status:", error2);
        }
        if (!this.ringtoneDurationTimer) {
          this.ringtoneDurationTimer = setInterval(async () => {
            const currentTime = Math.floor(Date.now() / 1e3);
            const elapsedTime = currentTime - this.ringtoneStartTime;
            if (elapsedTime >= this.maxRingtoneDuration) {
              formatAppLog("log", "at pages/call/calling.vue:888", "Maximum ringtone duration reached via timer, stopping playback");
              await this.stopRingtoneAndNavigate();
            }
          }, 1e3);
        }
      },
      playEndCallMusic(status) {
        formatAppLog("log", "at pages/call/calling.vue:895", "playEndCallMusic called");
        formatAppLog("log", "at pages/call/calling.vue:896", status);
        if (status === "guaduan") {
          formatAppLog("log", "at pages/call/calling.vue:899", "Call transferred, switching to dial page");
          uni.$emit("clearDialInput");
          Logger.log("navigate", { reason: "call_status_guaduan", status: this.internalStatus, callId: this.callId });
          formatAppLog("log", "at pages/call/calling.vue:903", "Navigate due to call_status_guaduan", { reason: "call_status_guaduan", status: this.internalStatus, callId: this.callId });
          uni.switchTab({
            url: "/pages/dial/dial"
          });
        } else if (status === "weijie") {
          const endMusic = "/static/audio/end-call2.mp3";
          formatAppLog("log", "at pages/call/calling.vue:910", "Playing end call music:", endMusic);
          this.endCallContext.src = endMusic;
          formatAppLog("log", "at pages/call/calling.vue:912", "Playing end call music:", endMusic);
          this.endCallContext.src = endMusic;
          this.endCallContext.onEnded(() => {
            formatAppLog("log", "at pages/call/calling.vue:917", "End call music finished playing");
            uni.$emit("clearDialInput");
            Logger.log("navigate", { reason: "end_music_finished", status: this.internalStatus, callId: this.callId });
            formatAppLog("log", "at pages/call/calling.vue:921", "Navigate due to end_music_finished", { reason: "end_music_finished", status: this.internalStatus, callId: this.callId });
            uni.switchTab({
              url: "/pages/dial/dial"
            });
          });
          setTimeout(() => {
            if (this.endCallContext) {
              this.endCallContext.stop();
            }
            uni.$emit("clearDialInput");
            Logger.log("navigate", { reason: "end_music_timeout", status: this.internalStatus, callId: this.callId });
            formatAppLog("log", "at pages/call/calling.vue:936", "Navigate due to end_music_timeout", { reason: "end_music_timeout", status: this.internalStatus, callId: this.callId });
            uni.switchTab({
              url: "/pages/dial/dial"
            });
          }, 27e3);
          this.endCallContext.play();
        }
      },
      async checkContactAndDisplay(number, defaultLocation) {
        formatAppLog("log", "at pages/call/calling.vue:948", "checkContactAndDisplay: Processing number:", number);
        const cleanedNumber = number.replace(/\s/g, "");
        if (!cleanedNumber) {
          formatAppLog("log", "at pages/call/calling.vue:951", "checkContactAndDisplay: Invalid number. Using original display.");
          this.number = this.formatPhoneNumber(number);
          this.location = defaultLocation || "未知位置";
          return;
        }
        try {
          const apiUrl = `http://106.53.30.150:9097/api/contact`;
          formatAppLog("log", "at pages/call/calling.vue:960", "checkContactAndDisplay: Calling API:", apiUrl, "with phone:", cleanedNumber);
          const res = await uni.request({
            url: apiUrl,
            method: "POST",
            // Corrected to POST
            data: {
              phone: cleanedNumber
            }
          });
          formatAppLog("log", "at pages/call/calling.vue:968", "checkContactAndDisplay: API response:", res);
          if (res.statusCode === 200 && res.data && res.data.code === 0 && res.data.data) {
            formatAppLog("log", "at pages/call/calling.vue:972", "checkContactAndDisplay: Contact found. Updating display.");
            this.number = res.data.data.name;
            this.location = this.formatPhoneNumber(res.data.data.phone);
            formatAppLog("log", "at pages/call/calling.vue:975", "checkContactAndDisplay: Updated display number to:", this.number, "location to:", this.location);
          } else {
            formatAppLog("log", "at pages/call/calling.vue:978", "checkContactAndDisplay: Contact not found or API issue. Keeping original display.");
            this.number = this.formatPhoneNumber(number);
            this.location = defaultLocation || "未知位置";
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call/calling.vue:984", "checkContactAndDisplay: Failed to check contact API:", error2);
          this.number = this.formatPhoneNumber(number);
          this.location = defaultLocation || "未知位置";
        }
      },
      startRingtonePolling() {
        this.stopRingtonePolling();
        if (this.internalStatus === "正在等待对方接听...") {
          formatAppLog("log", "at pages/call/calling.vue:996", "Starting ringtone polling for ringing state");
          this.ringtonePollTimer = setInterval(() => {
            this.checkRingtoneStatus();
          }, 1e3);
        }
      },
      stopRingtonePolling() {
        if (this.ringtonePollTimer) {
          clearInterval(this.ringtonePollTimer);
          this.ringtonePollTimer = null;
        }
      },
      async checkRingtoneStatus() {
        if (this.internalStatus !== "正在等待对方接听...") {
          formatAppLog("log", "at pages/call/calling.vue:1011", "Not in ringing state, skipping ringtone check");
          return;
        }
        try {
          const res = await uni.request({
            url: "http://106.53.30.150:9097/api/ringtone-status",
            method: "GET",
            data: {
              userId: this.userId
            }
          });
          if (res.statusCode === 200 && res.data && res.data.code === 0) {
            const { isPlaying, lastUpdateTime, userId } = res.data.data;
            if (lastUpdateTime > this.lastRingtoneUpdateTime && isPlaying !== this.isPlayingRingtone && userId === this.userId) {
              formatAppLog("log", "at pages/call/calling.vue:1030", "Ringtone status changed:", isPlaying);
              this.lastRingtoneUpdateTime = lastUpdateTime;
              this.isPlayingRingtone = isPlaying;
              if (isPlaying) {
                this.playRandomRingtone();
              } else {
                this.stopRingtone();
              }
            }
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call/calling.vue:1042", "Failed to check ringtone status:", error2);
        }
      },
      // Helper method to get current date in YYYY-MM-DD format
      getCurrentDateString() {
        const now = /* @__PURE__ */ new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");
        return `${year}-${month}-${day}`;
      },
      // Helper to get display text for status (reuse from call-details if available, or define here)
      getStatusText(status) {
        const statusMap = {
          "ringing": "正在等待对方接听...",
          "connected": this.internalStatus,
          // Connected status text comes from timer
          "completed": "通话已结束",
          "failed": "呼叫失败",
          "no_answer": "对方无应答",
          "canceled": "呼叫已取消",
          "disconnected": "通话已断开",
          "weijie": "呼叫已转移",
          "guaduan": "呼叫已转移"
          // Add other potential statuses from backend if needed
        };
        return statusMap[status] || status;
      },
      // Stop duration timer helper
      stopDurationTimer() {
        if (this.durationTimer) {
          clearInterval(this.durationTimer);
          this.durationTimer = null;
          formatAppLog("log", "at pages/call/calling.vue:1074", "Duration timer stopped.");
        }
      },
      // 修改 stopRingtone 方法，确保完全停止铃声和相关状态
      stopRingtone() {
        formatAppLog("log", "at pages/call/calling.vue:1079", "Stopping ringtone");
        if (this.ringtoneContext) {
          try {
            this.ringtoneContext.stop();
            formatAppLog("log", "at pages/call/calling.vue:1083", "Ringtone stopped successfully");
          } catch (error2) {
            formatAppLog("error", "at pages/call/calling.vue:1085", "Error stopping ringtone:", error2);
          }
        }
        if (this.ringtoneDurationTimer) {
          clearInterval(this.ringtoneDurationTimer);
          this.ringtoneDurationTimer = null;
        }
        if (this.ringtoneTimeout) {
          clearTimeout(this.ringtoneTimeout);
          this.ringtoneTimeout = null;
        }
        this.ringtoneStartTime = null;
        this.selectedRingtone = null;
        this.isPlayingRingtone = false;
        this.lastRingtoneUpdateTime = 0;
      },
      // 添加预加载通话记录的方法
      async preloadCallRecords() {
        try {
          const userId = uni.getStorageSync("userId") || 6;
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/call-records",
            method: "GET",
            data: {
              userId,
              page: 1,
              pageSize: 50
            }
          });
          if (response.data.code === 0) {
            const records = response.data.data.list.map((record) => ({
              id: record.call_id,
              number: record.dialed_number,
              displayName: record.contact_name || record.dialed_number,
              location: record.contact_name ? record.dialed_number : record.location || "未知",
              time: this.formatTime(record.start_time),
              status: this.mapCallStatus(record.status)
            }));
            uni.setStorageSync("preloaded_call_records", records);
            formatAppLog("log", "at pages/call/calling.vue:1131", "Successfully preloaded call records");
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call/calling.vue:1134", "Failed to preload call records:", error2);
        }
      },
      // 添加格式化时间的方法
      formatTime(timestamp) {
        const now = Math.floor(Date.now() / 1e3);
        const diff = now - timestamp;
        if (diff < 60)
          return "刚刚";
        if (diff < 3600)
          return Math.floor(diff / 60) + "分钟前";
        if (diff < 86400)
          return Math.floor(diff / 3600) + "小时前";
        const date = new Date(timestamp * 1e3);
        return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      },
      // 添加状态映射方法
      mapCallStatus(status) {
        const statusMap = {
          "ringing": "incoming",
          "connected": "outgoing",
          "completed": "completed",
          "failed": "failed",
          "no_answer": "missed",
          "canceled": "canceled",
          "disconnected": "disconnected"
        };
        return statusMap[status] || "off";
      }
    },
    onUnload() {
      this.stopDurationTimer();
      this.stopPolling();
      if (this.audioContext) {
        this.audioContext.destroy();
        this.audioContext = null;
      }
      if (this.ringtoneContext) {
        formatAppLog("log", "at pages/call/calling.vue:1175", "Attempting to destroy ringtoneContext instance.");
        try {
          this.ringtoneContext.destroy();
        } catch (error2) {
          formatAppLog("error", "at pages/call/calling.vue:1179", "Error destroying ringtoneContext:", error2);
        }
        this.ringtoneContext = null;
      }
      if (this.endCallContext) {
        this.endCallContext.destroy();
        this.endCallContext = null;
      }
      if (this.callAudioPlayer) {
        formatAppLog("log", "at pages/call/calling.vue:1189", "Cleaning up callAudioPlayer instance.");
        this.callAudioPlayer = null;
      }
      this.stopRingtonePolling();
      if (this.navigateBackTimeout) {
        clearTimeout(this.navigateBackTimeout);
        this.navigateBackTimeout = null;
        formatAppLog("log", "at pages/call/calling.vue:1198", "Cleared navigation timeout in onUnload.");
      }
      if (this.ringtoneTimeout) {
        clearTimeout(this.ringtoneTimeout);
        this.ringtoneTimeout = null;
      }
      if (this.ringtoneDurationTimer) {
        clearInterval(this.ringtoneDurationTimer);
        this.ringtoneDurationTimer = null;
      }
      this.ringtoneStartTime = null;
      this.sendHangupRequest();
    }
  };
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", {
      class: "call-bg",
      style: {
        overflow: "hidden",
        height: "100vh",
        touchAction: "none"
      }
    }, [
      vue.createElementVNode("image", {
        src: $data.imgUrl,
        class: "bg-img",
        mode: "aspectFill"
      }, null, 8, ["src"]),
      vue.createElementVNode("view", { class: "call-content" }, [
        vue.createElementVNode(
          "view",
          { class: "call-number" },
          vue.toDisplayString($data.number),
          1
          /* TEXT */
        ),
        vue.createElementVNode("view", { class: "call-location" }, [
          vue.createElementVNode(
            "text",
            { class: "hanzi" },
            vue.toDisplayString($data.location),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "text",
            { class: "status" },
            vue.toDisplayString($options.displayStatus),
            1
            /* TEXT */
          )
        ]),
        $data.showKeypad ? (vue.openBlock(), vue.createElementBlock(
          "view",
          {
            key: 0,
            class: "keypad-input-display"
          },
          vue.toDisplayString($data.keypadInput),
          1
          /* TEXT */
        )) : vue.createCommentVNode("v-if", true),
        !$data.showKeypad ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "call-actions"
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.buttons.slice(0, 6), (btn, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                class: "action-item",
                key: btn.text,
                onClick: ($event) => $options.toggleButton(index)
              }, [
                vue.createElementVNode("image", {
                  src: btn.isActive ? btn.activeIcon : btn.icon,
                  class: "action-icon"
                }, null, 8, ["src"]),
                vue.createElementVNode(
                  "text",
                  { class: "action-text" },
                  vue.toDisplayString(btn.text),
                  1
                  /* TEXT */
                )
              ], 8, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : vue.createCommentVNode("v-if", true),
        $data.showKeypad ? (vue.openBlock(), vue.createElementBlock(
          "view",
          {
            key: 2,
            class: "miui-dialpad",
            onTouchmove: _cache[0] || (_cache[0] = vue.withModifiers(() => {
            }, ["stop", "prevent"])),
            onScroll: _cache[1] || (_cache[1] = vue.withModifiers(() => {
            }, ["stop", "prevent"])),
            style: { "touch-action": "none", "overflow": "hidden" }
          },
          [
            vue.createElementVNode("view", { class: "miui-keypad" }, [
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.keys, (row, rowIndex) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    class: "miui-key-row",
                    key: rowIndex
                  }, [
                    (vue.openBlock(true), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList(row, (key) => {
                        return vue.openBlock(), vue.createElementBlock("view", {
                          class: "miui-key",
                          key: key.main,
                          onClick: ($event) => $options.pressKey(key.main)
                        }, [
                          vue.createElementVNode(
                            "text",
                            { class: "miui-key-main" },
                            vue.toDisplayString(key.main),
                            1
                            /* TEXT */
                          ),
                          key.main === "1" ? (vue.openBlock(), vue.createElementBlock("image", {
                            key: 0,
                            src: _imports_0$6,
                            class: "miui-key-img"
                          })) : key.sub ? (vue.openBlock(), vue.createElementBlock(
                            "text",
                            {
                              key: 1,
                              class: "miui-key-sub"
                            },
                            vue.toDisplayString(key.sub),
                            1
                            /* TEXT */
                          )) : vue.createCommentVNode("v-if", true)
                        ], 8, ["onClick"]);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ],
          32
          /* NEED_HYDRATION */
        )) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode("view", { class: "bottom-actions" }, [
          vue.createElementVNode("view", {
            class: "action-item",
            onClick: _cache[2] || (_cache[2] = ($event) => $options.toggleButton(6))
          }, [
            vue.createElementVNode("image", {
              src: $data.buttons[6].isActive ? $data.buttons[6].activeIcon : $data.buttons[6].icon,
              class: "action-icon"
            }, null, 8, ["src"]),
            vue.createElementVNode(
              "text",
              { class: "action-text" },
              vue.toDisplayString($data.buttons[6].text),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", {
            class: "call-end-btn",
            onClick: _cache[3] || (_cache[3] = (...args) => $options.endCall && $options.endCall(...args))
          }, [
            vue.createElementVNode("image", {
              src: _imports_2$3,
              class: "end-icon"
            })
          ]),
          vue.createElementVNode("view", {
            class: "action-item",
            onClick: _cache[4] || (_cache[4] = ($event) => $options.toggleButton(7))
          }, [
            vue.createElementVNode("image", {
              src: $data.buttons[7].isActive ? $data.buttons[7].activeIcon : $data.buttons[7].icon,
              class: "action-icon"
            }, null, 8, ["src"]),
            vue.createElementVNode(
              "text",
              { class: "action-text" },
              vue.toDisplayString($data.buttons[7].text),
              1
              /* TEXT */
            )
          ])
        ])
      ])
    ]);
  }
  const PagesCallCalling = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$8], ["__scopeId", "data-v-620547d8"], ["__file", "C:/Coding/phone-web/phone/pages/call/calling.vue"]]);
  const _imports_0$5 = "/static/icons/lxr.png";
  const _sfc_main$8 = {
    data() {
      return {
        contacts: []
      };
    },
    onLoad() {
      this.fetchContacts();
    },
    methods: {
      async fetchContacts() {
        try {
          const response = await uni.request({
            url: `http://106.53.30.150:9097/api/contacts`,
            method: "GET"
          });
          if (response.data.code === 0) {
            this.contacts = response.data.data;
          } else {
          }
        } catch (error2) {
          formatAppLog("error", "at pages/contacts/contacts.vue:47", "获取联系人失败:", error2);
        }
      }
    }
  };
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "contacts-page" }, [
      vue.createElementVNode(
        "view",
        {
          class: "miui-fixed-header",
          onTouchmove: _cache[0] || (_cache[0] = vue.withModifiers(() => {
          }, ["stop", "prevent"]))
        },
        [
          vue.createElementVNode("view", { class: "miui-header-top" }, [
            vue.createElementVNode("view", { class: "miui-title" }, "联系人")
          ])
        ],
        32
        /* NEED_HYDRATION */
      ),
      vue.createElementVNode("view", { class: "contacts-empty" }, [
        vue.createElementVNode("image", {
          src: _imports_0$5,
          class: "contacts-empty-icon"
        }),
        vue.createElementVNode("view", { class: "contacts-empty-text" }, "您还没有任何联系人")
      ]),
      (vue.openBlock(true), vue.createElementBlock(
        vue.Fragment,
        null,
        vue.renderList($data.contacts, (contact) => {
          return vue.openBlock(), vue.createElementBlock("view", {
            key: contact.id
          }, [
            vue.createElementVNode(
              "text",
              null,
              vue.toDisplayString(contact.name) + " - " + vue.toDisplayString(contact.phone),
              1
              /* TEXT */
            )
          ]);
        }),
        128
        /* KEYED_FRAGMENT */
      ))
    ]);
  }
  const PagesContactsContacts = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$7], ["__scopeId", "data-v-90a1bbf6"], ["__file", "C:/Coding/phone-web/phone/pages/contacts/contacts.vue"]]);
  const _imports_0$4 = "/static/icons/sc.png";
  const _sfc_main$7 = {};
  function _sfc_render$6(_ctx, _cache) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "contacts-page" }, [
      vue.createElementVNode(
        "view",
        {
          class: "miui-fixed-header",
          onTouchmove: _cache[0] || (_cache[0] = vue.withModifiers(() => {
          }, ["stop", "prevent"]))
        },
        [
          vue.createElementVNode("view", { class: "miui-header-top" }, [
            vue.createElementVNode("view", { class: "miui-title" }, "收藏")
          ])
        ],
        32
        /* NEED_HYDRATION */
      ),
      vue.createElementVNode("view", { class: "contacts-empty" }, [
        vue.createElementVNode("image", {
          src: _imports_0$4,
          class: "contacts-empty-icon"
        }),
        vue.createElementVNode("view", { class: "contacts-empty-text" }, "没有收藏")
      ])
    ]);
  }
  const PagesFavoriteFavorite = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__scopeId", "data-v-8850f19c"], ["__file", "C:/Coding/phone-web/phone/pages/favorite/favorite.vue"]]);
  const _imports_0$3 = "/static/icons/xx.png";
  const _imports_1$4 = "/static/icons/nz.png";
  const _sfc_main$6 = {
    data() {
      return {
        imgUrl: "",
        number: "186 8828 2571",
        location: "广东佛山 联通",
        status: "",
        ringtoneContext: null,
        endCallContext: null,
        endCallMusicList: [
          "/static/audio/end-call1.mp3",
          "/static/audio/end-call2.mp3"
        ],
        ringtoneList: [
          "/static/audio/ringtone1.mp3",
          "/static/audio/ringtone2.mp3",
          "/static/audio/ringtone3.mp3",
          "/static/audio/ringtone4.mp3",
          "/static/audio/ringtone5.mp3",
          "/static/audio/ringtone6.mp3",
          "/static/audio/ringtone7.mp3",
          "/static/audio/ringtone8.mp3",
          "/static/audio/ringtone9.mp3",
          "/static/audio/ringtone10.mp3",
          "/static/audio/ringtone11.mp3",
          "/static/audio/ringtone12.mp3",
          "/static/audio/ringtone13.mp3",
          "/static/audio/ringtone14.mp3",
          "/static/audio/ringtone15.mp3",
          "/static/audio/ringtone16.mp3",
          "/static/audio/ringtone17.mp3",
          "/static/audio/ringtone18.mp3",
          "/static/audio/ringtone19.mp3",
          "/static/audio/ringtone20.mp3"
        ],
        currentRingtone: null,
        selectedRingtone: null,
        buttons: [
          {
            icon: "/static/icons/record.png",
            activeIcon: "/static/icons/action-record.png",
            text: "录音",
            isActive: false
          },
          {
            icon: "/static/icons/wait.png",
            activeIcon: "/static/icons/action-wait.png",
            text: "等待",
            isActive: false
          },
          { icon: "/static/icons/add.png", text: "添加通话" },
          { icon: "/static/icons/video.png", text: "视频通话" },
          {
            icon: "/static/icons/mute.png",
            activeIcon: "/static/icons/action-mute.png",
            text: "静音",
            isActive: false
          },
          { icon: "/static/icons/contact.png", text: "联系人" },
          {
            icon: "/static/icons/keypad.png",
            activeIcon: "/static/icons/keypad.png",
            text: "",
            isActive: false
          },
          {
            icon: "/static/icons/speaker.png",
            activeIcon: "/static/icons/action-speaker.png",
            text: "",
            isActive: false
          }
        ],
        showKeypad: false,
        keys: [
          [{ main: "1", sub: "" }, { main: "2", sub: "ABC" }, { main: "3", sub: "DEF" }],
          [{ main: "4", sub: "GHI" }, { main: "5", sub: "JKL" }, { main: "6", sub: "MNO" }],
          [{ main: "7", sub: "PQRS" }, { main: "8", sub: "TUV" }, { main: "9", sub: "WXYZ" }],
          [{ main: "*", sub: "" }, { main: "0", sub: "+" }, { main: "#", sub: "" }]
        ],
        keypadInput: "",
        audioContext: null,
        callDuration: 0,
        durationTimer: null,
        callId: "",
        userId: uni.getStorageSync("userId") || 6,
        // 从本地存储获取 userId，如果不存在则使用默认值 6
        pollTimer: null,
        // 添加轮询定时器
        ringtonePollTimer: null,
        lastRingtoneUpdateTime: 0,
        isPlayingRingtone: false
      };
    },
    onLoad(options) {
      this.audioContext = uni.createInnerAudioContext();
      this.audioContext.onEnded(() => {
      });
      this.audioContext.onError((res) => {
        formatAppLog("error", "at pages/call-back/call-back.vue:139", "Audio Error:", res.errMsg);
      });
      this.endCallContext = uni.createInnerAudioContext();
      this.endCallContext.onError((res) => {
        formatAppLog("error", "at pages/call-back/call-back.vue:145", "End Call Music Error:", res.errMsg);
      });
      if (options.number) {
        this.number = decodeURIComponent(options.number);
        this.number = this.formatPhoneNumber(this.number);
        this.checkContactAndDisplay(this.number);
      }
      if (options.location) {
        this.location = decodeURIComponent(options.location);
      }
      if (options.callId) {
        this.callId = options.callId;
        this.status = "正在等待接听...";
        this.startPolling();
      }
      if (options.dialerUserId) {
        this.userId = options.dialerUserId;
      }
      const ret = u7746wallpaper.getBackground("test.png");
      formatAppLog("log", "at pages/call-back/call-back.vue:170", ret);
      if (ret.code === "1") {
        this.imgUrl = ret.msg;
      } else {
        this.imgUrl = "/static/images/bg.jpg";
      }
      if (!options.callId) {
        this.sendDialRequest();
      }
      this.startRingtonePolling();
    },
    methods: {
      formatPhoneNumber(number) {
        const cleaned = number.replace(/\s/g, "");
        const match = cleaned.match(/^(\d{3})(\d{0,4})(\d{0,4})$/);
        if (match) {
          const parts = match.slice(1).filter(Boolean);
          return parts.join(" ");
        }
        return number;
      },
      startDurationTimer() {
        this.durationTimer = setInterval(() => {
          this.callDuration++;
          this.updateCallStatus();
        }, 1e3);
      },
      updateCallStatus() {
        if (this.callDuration > 0) {
          const minutes = Math.floor(this.callDuration / 60);
          const seconds = this.callDuration % 60;
          this.status = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
      },
      toggleButton(index) {
        if (this.buttons[index].activeIcon) {
          this.buttons[index].isActive = !this.buttons[index].isActive;
          if (index === 6) {
            this.showKeypad = !this.showKeypad;
          }
        }
      },
      pressKey(key) {
        this.keypadInput += key;
        if (this.audioContext) {
          let soundSrc = "";
          switch (key) {
            case "0":
              soundSrc = "/static/audio/dtmf-0.mp3";
              break;
            case "1":
              soundSrc = "/static/audio/dtmf-1.mp3";
              break;
            case "2":
              soundSrc = "/static/audio/dtmf-2.mp3";
              break;
            case "3":
              soundSrc = "/static/audio/dtmf-3.mp3";
              break;
            case "4":
              soundSrc = "/static/audio/dtmf-4.mp3";
              break;
            case "5":
              soundSrc = "/static/audio/dtmf-5.mp3";
              break;
            case "6":
              soundSrc = "/static/audio/dtmf-6.mp3";
              break;
            case "7":
              soundSrc = "/static/audio/dtmf-7.mp3";
              break;
            case "8":
              soundSrc = "/static/audio/dtmf-8.mp3";
              break;
            case "9":
              soundSrc = "/static/audio/dtmf-9.mp3";
              break;
            case "*":
              soundSrc = "/static/audio/dtmf-star.mp3";
              break;
            case "#":
              soundSrc = "/static/audio/dtmf-hash.mp3";
              break;
          }
          if (soundSrc) {
            this.audioContext.src = soundSrc;
            this.audioContext.play();
          }
        }
      },
      deleteLastDigit() {
        if (this.keypadInput.length > 0) {
          this.keypadInput = this.keypadInput.slice(0, -1);
        }
      },
      // 发送拨号请求
      async sendDialRequest() {
        var _a, _b;
        if (!this.number) {
          uni.showToast({ title: "号码不能为空", icon: "none" });
          return;
        }
        this.status = "正在拨号...";
        try {
          const res = await uni.request({
            url: "http://106.53.30.150:9097/api/dial",
            method: "POST",
            data: {
              number: this.number.replace(/\s/g, ""),
              dialerUserId: this.userId,
              targetUserId: this.userId,
              // 这里可以根据需要修改目标用户ID
              location: this.location
              // 添加归属地信息
            }
          });
          formatAppLog("log", "at pages/call-back/call-back.vue:272", this.location);
          formatAppLog("log", "at pages/call-back/call-back.vue:273", "Dial request response:", res);
          if (res.statusCode === 200 && res.data && res.data.code === 0) {
            this.callId = (_a = res.data.data) == null ? void 0 : _a.callId;
            this.status = "正在等待对方接听...";
            this.startPolling();
          } else {
            this.status = "拨号失败";
            uni.showToast({
              title: ((_b = res.data) == null ? void 0 : _b.msg) || "拨号失败",
              icon: "none"
            });
            setTimeout(() => {
              uni.navigateBack();
            }, 2e3);
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call-back/call-back.vue:292", "Dial request failed:", error2);
          this.status = "拨号失败";
          uni.showToast({
            title: "网络错误",
            icon: "none"
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 2e3);
        }
      },
      // 开始轮询通话状态
      startPolling() {
        this.pollTimer = setInterval(() => {
          this.checkCallStatus();
        }, 3e3);
      },
      // 停止轮询
      stopPolling() {
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
      },
      // 检查通话状态
      async checkCallStatus() {
        if (!this.callId)
          return;
        try {
          const res = await uni.request({
            url: `http://106.53.30.150:9097/api/call-status`,
            method: "GET",
            data: {
              callId: this.callId
            }
          });
          formatAppLog("log", "at pages/call-back/call-back.vue:332", "Call status response:", res);
          if (res.statusCode === 200 && res.data && res.data.code === 0) {
            const status = res.data.data.status;
            formatAppLog("log", "at pages/call-back/call-back.vue:336", "Current call status:", status);
            this.status = status;
            switch (status) {
              case "ringing":
                break;
              case "connected":
                this.stopRingtone();
                if (!this.durationTimer) {
                  formatAppLog("log", "at pages/call-back/call-back.vue:347", "Call connected, starting timer");
                  this.startDurationTimer();
                }
                break;
              case "failed":
                formatAppLog("log", "at pages/call-back/call-back.vue:352", "Call failed");
                if (this.durationTimer) {
                  clearInterval(this.durationTimer);
                  this.durationTimer = null;
                }
                setTimeout(() => {
                  uni.navigateBack();
                }, 1e3);
                break;
              case "canceled":
                formatAppLog("log", "at pages/call-back/call-back.vue:362", "Call ended with status:", status);
                this.stopRingtone();
                if (this.durationTimer) {
                  clearInterval(this.durationTimer);
                  this.durationTimer = null;
                }
                uni.$emit("callEnded");
                setTimeout(() => {
                  uni.navigateBack();
                }, 1e3);
                break;
              case "disconnected":
                formatAppLog("log", "at pages/call-back/call-back.vue:374", "Call disconnected");
                this.stopPolling();
                if (this.durationTimer) {
                  clearInterval(this.durationTimer);
                  this.durationTimer = null;
                }
                uni.$emit("callEnded");
                setTimeout(() => {
                  uni.navigateBack();
                }, 1e3);
                break;
              default:
                formatAppLog("log", "at pages/call-back/call-back.vue:386", "Call ended with status:", status);
                this.stopPolling();
                if (this.durationTimer) {
                  clearInterval(this.durationTimer);
                  this.durationTimer = null;
                }
                uni.$emit("callEnded");
                setTimeout(() => {
                  uni.navigateBack();
                }, 1e3);
                break;
            }
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call-back/call-back.vue:400", "Failed to check call status:", error2);
        }
      },
      endCall() {
        if (this.durationTimer) {
          clearInterval(this.durationTimer);
          this.durationTimer = null;
        }
        this.stopPolling();
        this.stopRingtone();
        if (this.callId) {
          uni.request({
            url: "http://106.53.30.150:9097/api/hangup",
            method: "POST",
            data: {
              callId: this.callId,
              action: "hangup"
            },
            success: (res) => {
              if (res.statusCode === 200 && res.data && res.data.code === 0) {
                this.status = "正在结束通话...";
                uni.$emit("callEnded");
                uni.$emit("clearDialInput");
                setTimeout(() => {
                  uni.navigateBack();
                }, 1e3);
              } else {
                uni.$emit("callEnded");
                uni.$emit("clearDialInput");
                uni.navigateBack();
              }
            },
            fail: (err) => {
              formatAppLog("error", "at pages/call-back/call-back.vue:442", "Failed to hangup call:", err);
              uni.showToast({
                title: "挂断失败",
                icon: "none"
              });
              uni.$emit("callEnded");
              uni.$emit("clearDialInput");
              setTimeout(() => {
                uni.navigateBack();
              }, 1e3);
            }
          });
        } else {
          this.status = "已取消";
          uni.$emit("callEnded");
          uni.$emit("clearDialInput");
          setTimeout(() => {
            uni.navigateBack();
          }, 1e3);
        }
      },
      playRandomRingtone() {
        formatAppLog("log", "at pages/call-back/call-back.vue:470", "Ringtone playback disabled in call-back page");
      },
      stopRingtone() {
        formatAppLog("log", "at pages/call-back/call-back.vue:475", "Ringtone stop disabled in call-back page");
      },
      playEndCallMusic() {
        if (!this.endCallContext)
          return;
        const randomIndex = Math.floor(Math.random() * this.endCallMusicList.length);
        const endMusic = this.endCallMusicList[randomIndex];
        this.endCallContext.src = endMusic;
        this.endCallContext.play();
        const delayTime = endMusic.includes("end-call1") ? 7e3 : 17e3;
        setTimeout(() => {
          uni.$emit("clearDialInput");
          uni.navigateBack();
        }, delayTime);
      },
      startRingtonePolling() {
        this.ringtonePollTimer = setInterval(() => {
          this.checkRingtoneStatus();
        }, 1e3);
      },
      stopRingtonePolling() {
        if (this.ringtonePollTimer) {
          clearInterval(this.ringtonePollTimer);
          this.ringtonePollTimer = null;
        }
      },
      async checkRingtoneStatus() {
        try {
          const res = await uni.request({
            url: "http://106.53.30.150:9097/api/ringtone-status",
            method: "GET",
            data: {
              userId: this.userId
              // 添加用户ID参数
            }
          });
          if (res.statusCode === 200 && res.data && res.data.code === 0) {
            const { isPlaying, lastUpdateTime, userId } = res.data.data;
            if (lastUpdateTime > this.lastRingtoneUpdateTime && isPlaying !== this.isPlayingRingtone && userId === this.userId) {
              formatAppLog("log", "at pages/call-back/call-back.vue:526", "Ringtone status changed:", isPlaying);
              this.lastRingtoneUpdateTime = lastUpdateTime;
              this.isPlayingRingtone = isPlaying;
            }
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call-back/call-back.vue:532", "Failed to check ringtone status:", error2);
        }
      },
      async checkContactAndDisplay(number) {
        formatAppLog("log", "at pages/call-back/call-back.vue:536", "checkContactAndDisplay: Processing number:", number);
        const cleanedNumber = number.replace(/\s/g, "");
        if (!cleanedNumber) {
          formatAppLog("log", "at pages/call-back/call-back.vue:539", "checkContactAndDisplay: Invalid number. Using original.");
          return;
        }
        try {
          const apiUrl = `http://106.53.30.150:9097/api/contact`;
          formatAppLog("log", "at pages/call-back/call-back.vue:545", "checkContactAndDisplay: Calling API:", apiUrl, "with phone:", cleanedNumber);
          const res = await uni.request({
            url: apiUrl,
            method: "POST",
            data: {
              phone: cleanedNumber
            }
          });
          formatAppLog("log", "at pages/call-back/call-back.vue:553", "checkContactAndDisplay: API response:", res);
          if (res.statusCode === 200 && res.data && res.data.code === 0 && res.data.data) {
            formatAppLog("log", "at pages/call-back/call-back.vue:557", "checkContactAndDisplay: Contact found.", res.data.data.phone);
            this.number = res.data.data.name;
            this.location = res.data.data.phone;
            formatAppLog("log", "at pages/call-back/call-back.vue:560", "checkContactAndDisplay: Updated display number to:", this.number, "location to:", this.location);
          } else {
            formatAppLog("log", "at pages/call-back/call-back.vue:563", "checkContactAndDisplay: Contact not found or API issue.");
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call-back/call-back.vue:566", "checkContactAndDisplay: Failed to check contact API:", error2);
        }
      },
      // 修改接听方法
      async dial() {
        var _a, _b;
        try {
          this.stopPolling();
          this.stopRingtonePolling();
          this.stopRingtone();
          try {
            const res = await uni.request({
              url: "http://106.53.30.150:9097/api/ringtone-status",
              method: "POST",
              data: {
                userId: this.userId,
                isPlaying: false
              }
            });
            if (res.statusCode === 200 && res.data && res.data.code === 0) {
              formatAppLog("log", "at pages/call-back/call-back.vue:591", "成功更新铃声状态为false");
            } else {
              formatAppLog("error", "at pages/call-back/call-back.vue:593", "更新铃声状态失败");
            }
          } catch (error2) {
            formatAppLog("error", "at pages/call-back/call-back.vue:596", "更新铃声状态时出错:", error2);
          }
          try {
            const statusRes = await uni.request({
              url: "http://106.53.30.150:9097/api/update-call-status",
              method: "POST",
              data: {
                callId: this.callId,
                status: "connected"
              }
            });
            if (statusRes.statusCode === 200 && statusRes.data && statusRes.data.code === 0) {
              formatAppLog("log", "at pages/call-back/call-back.vue:611", "成功更新通话状态为正在通话");
            } else {
              formatAppLog("error", "at pages/call-back/call-back.vue:613", "更新通话状态失败:", ((_a = statusRes.data) == null ? void 0 : _a.msg) || "未知错误");
              throw new Error(((_b = statusRes.data) == null ? void 0 : _b.msg) || "更新通话状态失败");
            }
          } catch (error2) {
            formatAppLog("error", "at pages/call-back/call-back.vue:617", "更新通话状态时出错:", error2);
            throw error2;
          }
          this.cleanup();
          const url = `/pages/call/calling?number=${encodeURIComponent(this.number.replace(/\s/g, ""))}&location=${encodeURIComponent(this.location)}&callId=${this.callId}&fromCallBack=true`;
          uni.redirectTo({
            url,
            success: () => {
              formatAppLog("log", "at pages/call-back/call-back.vue:631", "成功跳转到通话页面");
            },
            fail: (err) => {
              formatAppLog("error", "at pages/call-back/call-back.vue:634", "页面跳转失败:", err);
              uni.showToast({
                title: "页面跳转失败",
                icon: "none",
                duration: 2e3
              });
              setTimeout(() => {
                uni.navigateBack();
              }, 2e3);
            }
          });
        } catch (error2) {
          formatAppLog("error", "at pages/call-back/call-back.vue:647", "接听方法出错:", error2);
          uni.showToast({
            title: error2.message || "接听失败",
            icon: "none",
            duration: 2e3
          });
          this.cleanup();
          setTimeout(() => {
            uni.navigateBack();
          }, 2e3);
        }
      },
      // Add a cleanup method to handle component cleanup
      cleanup() {
        if (this.durationTimer) {
          clearInterval(this.durationTimer);
          this.durationTimer = null;
        }
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
        if (this.ringtonePollTimer) {
          clearInterval(this.ringtonePollTimer);
          this.ringtonePollTimer = null;
        }
        if (this.audioContext) {
          this.audioContext.destroy();
          this.audioContext = null;
        }
        if (this.endCallContext) {
          this.endCallContext.destroy();
          this.endCallContext = null;
        }
        this.isPlayingRingtone = false;
        this.lastRingtoneUpdateTime = 0;
      },
      // Add helper method to get current date in YYYY-MM-DD format
      getCurrentDateString() {
        const now = /* @__PURE__ */ new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    },
    onUnload() {
      if (this.durationTimer) {
        clearInterval(this.durationTimer);
        this.durationTimer = null;
      }
      this.stopPolling();
      if (this.audioContext) {
        this.audioContext.destroy();
        this.audioContext = null;
      }
      if (this.endCallContext) {
        this.endCallContext.destroy();
        this.endCallContext = null;
      }
      this.stopRingtonePolling();
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "call-bg" }, [
      vue.createElementVNode("image", {
        src: $data.imgUrl,
        class: "bg-img",
        mode: "aspectFill"
      }, null, 8, ["src"]),
      vue.createElementVNode("view", { class: "call-content" }, [
        vue.createElementVNode("view", { class: "call-info" }, [
          vue.createElementVNode(
            "view",
            { class: "call-number" },
            vue.toDisplayString($data.number),
            1
            /* TEXT */
          ),
          vue.createElementVNode("view", { class: "call-location" }, [
            vue.createElementVNode(
              "text",
              { class: "hanzi" },
              vue.toDisplayString($data.location),
              1
              /* TEXT */
            ),
            $data.isPlayingRingtone ? (vue.openBlock(), vue.createElementBlock("text", {
              key: 0,
              class: "status"
            }, "对方已振铃")) : vue.createCommentVNode("v-if", true)
          ])
        ]),
        vue.createElementVNode("view", { class: "button-grid" }, [
          vue.createElementVNode("view", { class: "grid-row" }, [
            vue.createElementVNode("view", { class: "action-item" }, [
              vue.createElementVNode("image", {
                src: _imports_0$3,
                class: "call-xx",
                mode: "aspectFit"
              }),
              vue.createElementVNode("text", { class: "action-text" }, "短信")
            ]),
            vue.createElementVNode("view", { class: "action-item" }, [
              vue.createElementVNode("image", {
                src: _imports_1$4,
                class: "call-nz",
                mode: "aspectFit"
              }),
              vue.createElementVNode("text", { class: "action-text" }, "提醒")
            ])
          ]),
          vue.createElementVNode("view", { class: "grid-row" }, [
            vue.createElementVNode("view", {
              class: "call-end-btn",
              onClick: _cache[0] || (_cache[0] = (...args) => $options.endCall && $options.endCall(...args))
            }, [
              vue.createElementVNode("image", {
                src: _imports_2$3,
                class: "end-icon",
                mode: "aspectFit"
              })
            ]),
            vue.createElementVNode("view", {
              class: "miui-action-dial",
              onClick: _cache[1] || (_cache[1] = (...args) => $options.dial && $options.dial(...args))
            }, [
              vue.createElementVNode("image", {
                src: _imports_3$1,
                class: "miui-icon-call",
                mode: "aspectFit"
              })
            ])
          ])
        ])
      ])
    ]);
  }
  const PagesCallBackCallBack = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__scopeId", "data-v-3eeafad5"], ["__file", "C:/Coding/phone-web/phone/pages/call-back/call-back.vue"]]);
  const _imports_2$2 = "/static/icons/delete.png";
  const _sfc_main$5 = {
    data() {
      return {
        items: [],
        selectedItems: [],
        userId: uni.getStorageSync("userId") || 6,
        isLoading: false,
        currentPage: 1,
        hasMore: true,
        pageSize: 50
        // 每页加载50条数据
      };
    },
    computed: {
      selectedCount() {
        return this.selectedItems.length;
      },
      isAllSelected() {
        return this.items.length > 0 && this.selectedItems.length === this.items.length;
      },
      selectAllButtonText() {
        return this.isAllSelected ? "取消全选" : "全选";
      }
    },
    methods: {
      async loadItems(isLoadMore = false) {
        if (this.isLoading || !isLoadMore && !this.hasMore)
          return;
        this.isLoading = true;
        try {
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/call-records",
            method: "GET",
            data: {
              userId: this.userId,
              page: isLoadMore ? this.currentPage + 1 : 1,
              pageSize: this.pageSize
            }
          });
          formatAppLog("log", "at pages/batch-delete-records/batch-delete-records.vue:95", "Call records response:", response.data);
          if (response.data.code === 0) {
            const newRecords = response.data.data.list.map((record) => {
              formatAppLog("log", "at pages/batch-delete-records/batch-delete-records.vue:99", "Processing record:", {
                call_id: record.call_id,
                type: typeof record.call_id
              });
              return {
                id: record.call_id,
                // 保持原始格式，不转换为字符串
                number: record.contact_name || record.dialed_number,
                status: this.mapCallStatus(record.status),
                location: record.contact_name ? record.dialed_number : record.location || "未知",
                time: this.formatTime(record.start_time)
              };
            });
            if (isLoadMore) {
              this.items = [...this.items, ...newRecords];
              this.currentPage++;
            } else {
              this.items = newRecords;
              this.currentPage = 1;
            }
            this.hasMore = newRecords.length === this.pageSize;
          } else {
            uni.showToast({
              title: "获取通话记录失败",
              icon: "none"
            });
          }
        } catch (error2) {
          formatAppLog("error", "at pages/batch-delete-records/batch-delete-records.vue:128", "获取通话记录失败:", error2);
          uni.showToast({
            title: "获取通话记录失败",
            icon: "none"
          });
        } finally {
          this.isLoading = false;
        }
      },
      loadMoreItems() {
        if (!this.isLoading && this.hasMore) {
          this.loadItems(true);
        }
      },
      formatTime(timestamp) {
        const now = Math.floor(Date.now() / 1e3);
        const diff = now - timestamp;
        if (diff < 60)
          return "刚刚";
        if (diff < 3600)
          return Math.floor(diff / 60) + "分钟前";
        if (diff < 86400)
          return Math.floor(diff / 3600) + "小时前";
        const date = new Date(timestamp * 1e3);
        return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      },
      mapCallStatus(status) {
        const statusMap = {
          "ringing": "incoming",
          "connected": "outgoing",
          "completed": "off",
          "failed": "failed",
          "no_answer": "missed",
          "canceled": "canceled",
          "disconnected": "disconnected"
        };
        return statusMap[status] || "off";
      },
      getStatusIcon(status) {
        switch (status) {
          case "outgoing":
            return "/static/icons/phone-outgoing.png";
          case "incoming":
            return "/static/icons/phone-incoming.png";
          case "missed":
            return "/static/icons/phone-missed.png";
          default:
            return "/static/icons/phone-outgoing.png";
        }
      },
      toggleSelectItem(item) {
        const index = this.selectedItems.findIndex((i) => i.id === item.id);
        if (index > -1) {
          this.selectedItems.splice(index, 1);
        } else {
          this.selectedItems.push(item);
        }
      },
      toggleSelectAll() {
        if (this.isAllSelected) {
          this.selectedItems = [];
        } else {
          this.selectedItems = [...this.items];
        }
      },
      async deleteSelectedItems() {
        if (this.selectedItems.length === 0) {
          uni.showToast({
            title: "请选择要删除的记录",
            icon: "none"
          });
          return;
        }
        try {
          uni.showLoading({
            title: "删除中...",
            mask: true
          });
          const callIds = this.selectedItems.map((item) => {
            formatAppLog("log", "at pages/batch-delete-records/batch-delete-records.vue:212", "Preparing to delete record:", {
              id: item.id,
              type: typeof item.id,
              number: item.number
            });
            return item.id;
          });
          formatAppLog("log", "at pages/batch-delete-records/batch-delete-records.vue:220", "Sending delete request with IDs:", callIds);
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/delete-call-record",
            method: "POST",
            data: {
              callId: callIds
            }
          });
          formatAppLog("log", "at pages/batch-delete-records/batch-delete-records.vue:230", "Delete response:", {
            statusCode: response.statusCode,
            data: response.data,
            headers: response.header
          });
          if (response.data.code === 0) {
            uni.showToast({
              title: "删除成功",
              icon: "success"
            });
            this.items = this.items.filter((item) => !this.selectedItems.includes(item));
            this.selectedItems = [];
            if (this.items.length === 0) {
              this.loadItems();
            }
          } else {
            throw new Error(response.data.msg || "删除失败");
          }
        } catch (error2) {
          formatAppLog("error", "at pages/batch-delete-records/batch-delete-records.vue:252", "删除记录失败:", error2);
          uni.showToast({
            title: error2.message || "删除失败",
            icon: "none",
            duration: 2e3
          });
        } finally {
          uni.hideLoading();
        }
      },
      closePage() {
        uni.navigateBack();
      }
    },
    onLoad() {
      this.loadItems();
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "miui-batch-page" }, [
      vue.createElementVNode("view", { class: "miui-batch-header" }, [
        vue.createElementVNode("text", {
          class: "miui-batch-close",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.closePage && $options.closePage(...args))
        }, "×"),
        vue.createElementVNode("view", { class: "miui-batch-title-section" }, [
          vue.createElementVNode(
            "view",
            { class: "miui-batch-title" },
            vue.toDisplayString($options.selectedCount > 0 ? "已选择 " + $options.selectedCount + " 个" : "未选择"),
            1
            /* TEXT */
          )
        ])
      ]),
      vue.createElementVNode(
        "scroll-view",
        {
          class: "miui-batch-list",
          "scroll-y": "true",
          onScrolltolower: _cache[1] || (_cache[1] = (...args) => $options.loadMoreItems && $options.loadMoreItems(...args))
        },
        [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.items, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                class: "miui-batch-item",
                key: item.id,
                onClick: ($event) => $options.toggleSelectItem(item)
              }, [
                vue.createElementVNode("view", { class: "miui-batch-item-left" }, [
                  vue.createElementVNode("view", { class: "miui-batch-line-top" }, [
                    vue.createElementVNode("image", {
                      class: "miui-batch-call-status-icon",
                      src: $options.getStatusIcon(item.status)
                    }, null, 8, ["src"]),
                    vue.createElementVNode(
                      "view",
                      { class: "miui-batch-number" },
                      vue.toDisplayString(item.number),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "miui-batch-line-bottom" }, [
                    vue.createElementVNode("image", {
                      class: "miui-batch-placeholder-icon",
                      src: _imports_0$7
                    }),
                    vue.createElementVNode("image", {
                      class: "miui-batch-hd-icon",
                      src: _imports_1$5
                    }),
                    vue.createElementVNode(
                      "text",
                      { class: "miui-batch-location-text" },
                      vue.toDisplayString(item.location),
                      1
                      /* TEXT */
                    )
                  ])
                ]),
                vue.createElementVNode("view", { class: "miui-batch-item-right" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "miui-batch-time" },
                    vue.toDisplayString(item.time),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("checkbox", {
                    checked: $data.selectedItems.some((selectedItem) => selectedItem.id === item.id),
                    onClick: vue.withModifiers(($event) => $options.toggleSelectItem(item), ["stop"]),
                    color: "#1976ff"
                  }, null, 8, ["checked", "onClick"])
                ])
              ], 8, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          )),
          $data.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "miui-batch-loading"
          }, "加载中...")) : vue.createCommentVNode("v-if", true),
          !$data.hasMore && $data.items.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "miui-batch-nomore"
          }, "没有更多记录了")) : vue.createCommentVNode("v-if", true)
        ],
        32
        /* NEED_HYDRATION */
      ),
      vue.createElementVNode("view", { class: "miui-batch-footer" }, [
        vue.createElementVNode("view", { class: "miui-batch-footer-content" }, [
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["miui-batch-footer-btn delete", { "disabled": $options.selectedCount === 0 }]),
              onClick: _cache[2] || (_cache[2] = (...args) => $options.deleteSelectedItems && $options.deleteSelectedItems(...args))
            },
            [
              vue.createElementVNode("image", {
                class: "miui-batch-footer-icon",
                src: _imports_2$2
              }),
              vue.createElementVNode("text", null, "删除")
            ],
            2
            /* CLASS */
          ),
          vue.createElementVNode("view", {
            class: "miui-batch-footer-btn",
            onClick: _cache[3] || (_cache[3] = (...args) => $options.toggleSelectAll && $options.toggleSelectAll(...args))
          }, [
            vue.createElementVNode("image", {
              class: "miui-batch-footer-icon",
              src: $options.isAllSelected ? "/static/icons/selected.png" : "/static/icons/all_select.png"
            }, null, 8, ["src"]),
            vue.createElementVNode(
              "text",
              null,
              vue.toDisplayString($options.selectAllButtonText),
              1
              /* TEXT */
            )
          ])
        ])
      ])
    ]);
  }
  const PagesBatchDeleteRecordsBatchDeleteRecords = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__scopeId", "data-v-19f34c31"], ["__file", "C:/Coding/phone-web/phone/pages/batch-delete-records/batch-delete-records.vue"]]);
  const _imports_0$2 = "/static/icons/phone1.png";
  const _imports_1$3 = "/static/icons/video1.png";
  const _imports_2$1 = "/static/icons/message.png";
  const _sfc_main$4 = {
    name: "CallHistoryPage",
    data() {
      return {
        callRecords: [],
        isLoading: false,
        error: null,
        number: "",
        location: "",
        userId: uni.getStorageSync("userId") || 6,
        showConfirmModal: false,
        // 添加控制自定义弹窗显示的变量
        isContact: false,
        // Add flag to indicate if the number is a contact
        currentAvatarUrl: "/static/icons/avatar1.png"
        // 新增：当前头像URL，默认为通用头像
      };
    },
    // 为了模拟截图顶部返回按钮和状态栏，可能需要自定义导航栏样式，这里先留空
    onNavigationBarButtonTap(e) {
    },
    onLoad(options) {
      formatAppLog("log", "at pages/call-details/call-details.vue:110", "call-details onLoad options:", options);
      this.audioContext = uni.createInnerAudioContext();
      if (options.number) {
        formatAppLog("log", "at pages/call-details/call-details.vue:114", "Received number in call-details:", decodeURIComponent(options.number));
        this.number = decodeURIComponent(options.number);
        this.number = this.formatPhoneNumber(this.number);
        this.currentAvatarUrl = this.getAvatarUrl(this.number.replace(/\s/g, ""));
        this.fetchCallRecordsByNumber();
      }
    },
    // 添加页面显示时的刷新逻辑
    onShow() {
      if (this.number) {
        this.fetchCallRecordsByNumber();
      }
    },
    methods: {
      formatPhoneNumber(number) {
        const cleaned = number.replace(/\s/g, "");
        const match = cleaned.match(/^(\d{3})(\d{0,4})(\d{0,4})$/);
        if (match) {
          const parts = match.slice(1).filter(Boolean);
          return parts.join(" ");
        }
        return number;
      },
      async fetchCallRecordsByNumber() {
        this.isLoading = true;
        this.error = null;
        try {
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/call-records",
            method: "GET",
            data: {
              number: this.number.replace(/\s/g, ""),
              userId: this.userId
            }
          });
          formatAppLog("log", "at pages/call-details/call-details.vue:155", "Call records by number response:", response.data);
          if (response.data.code === 0 && response.data.data && response.data.data.list) {
            this.callRecords = response.data.data.list;
            if (this.callRecords.length > 0) {
              this.location = this.callRecords[0].location || "未知位置";
              this.isContact = this.callRecords[0].contact_name !== null;
              this.currentAvatarUrl = this.getAvatarUrl(this.callRecords[0].display_name.replace(/\s/g, ""));
            } else {
              this.isContact = false;
              this.currentAvatarUrl = this.getAvatarUrl(this.number.replace(/\s/g, ""));
            }
          } else {
            this.error = response.data.msg || "未找到该号码的通话记录";
            this.callRecords = [];
            this.location = "";
            this.isContact = false;
            this.currentAvatarUrl = this.getAvatarUrl(this.number.replace(/\s/g, ""));
          }
        } catch (e) {
          formatAppLog("error", "at pages/call-details/call-details.vue:178", "Failed to fetch call records by number:", e);
          this.error = "加载通话记录失败";
          this.callRecords = [];
        } finally {
          this.isLoading = false;
        }
      },
      formatTime(timestamp) {
        if (!timestamp)
          return "未知时间";
        const date = new Date(timestamp * 1e3);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${month}月${day}日 ${hours}:${minutes}`;
      },
      getStatusIcon(status) {
        switch (status) {
          case "missed":
            return "/static/icons/phone-missed.png";
          case "incoming":
            return "/static/icons/phone-incoming.png";
          case "canceled":
            return "/static/icons/phone-missed.png";
          case "weijie":
            return "/static/icons/phone-missed.png";
          case "guaduan":
            return "/static/icons/phone-missed.png";
          case "outgoing":
            return "/static/icons/phone-outgoing.png";
          case "off":
            return "/static/icons/phone-off.png";
          case "completed":
            return "/static/icons/phone-outgoing.png";
          default:
            return "/static/icons/default.png";
        }
      },
      formatDuration(startTime, endTime) {
        if (!startTime || !endTime)
          return "";
        const duration = endTime - startTime;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}分${seconds}秒`;
      },
      getStatusText(record) {
        const statusMap = {
          "ringing": "正在响铃",
          "connected": "已接通",
          "completed": "",
          "failed": "失败",
          "no_answer": "未接",
          "canceled": "未接通",
          "disconnected": "已断开",
          "missed": "未接",
          "incoming": "来电",
          "outgoing": "去电",
          "off": "已挂断",
          "weijie": "未接通",
          "guaduan": "已挂断"
        };
        const status = statusMap[record.status] || "未知状态";
        if (record.status === "completed" && record.start_time && record.end_time) {
          return this.formatDuration(record.start_time, record.end_time);
        }
        return status;
      },
      dialNumber(number) {
        formatAppLog("log", "at pages/call-details/call-details.vue:241", "Dialing number:", number);
        const cleanNumber = number.replace(/\s/g, "");
        uni.navigateTo({
          url: `/pages/call/calling?number=${encodeURIComponent(cleanNumber)}&location=${encodeURIComponent(this.location)}`
        });
      },
      clearCallRecords() {
        this.showConfirmModal = true;
      },
      cancelClear() {
        this.showConfirmModal = false;
      },
      async confirmClear() {
        try {
          const callIds = this.callRecords.map((record) => record.call_id);
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/delete-call-record",
            method: "POST",
            data: {
              callId: callIds,
              userId: this.userId
            }
          });
          formatAppLog("log", "at pages/call-details/call-details.vue:268", response);
          if (response.data.code === 0) {
            uni.showToast({
              title: "清空成功",
              icon: "none"
            });
            this.callRecords = [];
          } else {
            uni.showToast({
              title: response.data.msg || "清空失败",
              icon: "none"
            });
          }
        } catch (error2) {
          formatAppLog("error", "at pages/call-details/call-details.vue:282", "Failed to clear call records:", error2);
          uni.showToast({
            title: "清空失败",
            icon: "none"
          });
        } finally {
          this.showConfirmModal = false;
        }
      },
      navigateToChat() {
        const cleanNumber = this.number.replace(/\s/g, "");
        this.number.replace(/\s/g, "");
        uni.navigateTo({
          url: `/pages/message/chat?phone=${encodeURIComponent(cleanNumber)}&displayName=${encodeURIComponent(this.number.replace(/\s/g, ""))}`
        });
      },
      // 新增方法：根据号码获取头像URL
      getAvatarUrl(number) {
        const cleanedNumber = number.replace(/\s/g, "");
        switch (cleanedNumber) {
          case "中国电信":
            return "/static/icons/10000.png";
          case "中国联通":
            return "/static/icons/10010.png";
          case "中国移动":
            return "/static/icons/10086.png";
          default:
            return "/static/icons/avatar1.png";
        }
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "call-history-page" }, [
      vue.createElementVNode("view", { class: "top-purple-bg" }),
      vue.createElementVNode("view", { class: "top-centered-info" }, [
        vue.createElementVNode("image", {
          class: "large-avatar",
          src: $data.currentAvatarUrl,
          mode: "aspectFill"
        }, null, 8, ["src"])
      ]),
      vue.createElementVNode("view", { class: "main-content-area" }, [
        vue.createElementVNode("view", { class: "info-card-group" }, [
          vue.createElementVNode(
            "view",
            { class: "large-phone-number" },
            vue.toDisplayString($data.callRecords.length > 0 ? $data.callRecords[0].display_name : $data.number.replace(/\s/g, "")),
            1
            /* TEXT */
          ),
          vue.createElementVNode("view", { class: "contact-card" }, [
            vue.createElementVNode("view", { class: "phone-and-location" }, [
              vue.createElementVNode(
                "view",
                { class: "phone-number-small" },
                vue.toDisplayString($data.number.replace(/\s/g, "")),
                1
                /* TEXT */
              ),
              !$data.isContact ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "location-with-pinyin"
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "location-text" },
                  vue.toDisplayString($data.location),
                  1
                  /* TEXT */
                )
              ])) : vue.createCommentVNode("v-if", true)
            ]),
            vue.createElementVNode("view", { class: "action-icons" }, [
              vue.createElementVNode("image", {
                class: "icon",
                src: _imports_0$2,
                onClick: _cache[0] || (_cache[0] = ($event) => $options.dialNumber($data.number))
              }),
              vue.createElementVNode("image", {
                class: "icon",
                src: _imports_1$3
              }),
              vue.createElementVNode("image", {
                class: "icon",
                src: _imports_2$1,
                onClick: _cache[1] || (_cache[1] = (...args) => $options.navigateToChat && $options.navigateToChat(...args))
              })
            ])
          ])
        ]),
        vue.createElementVNode("view", { class: "call-history-section" }, [
          vue.createElementVNode("view", { class: "history-section-header" }, [
            vue.createElementVNode("view", { class: "section-title" }, [
              vue.createElementVNode("text", { class: "title-text" }, "通话记录")
            ]),
            vue.createElementVNode("view", {
              class: "clear-button",
              onClick: _cache[2] || (_cache[2] = (...args) => $options.clearCallRecords && $options.clearCallRecords(...args))
            }, [
              vue.createElementVNode("text", { class: "clear-text" }, "清空")
            ])
          ]),
          $data.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "loading-state"
          }, [
            vue.createElementVNode("text", null, "加载中...")
          ])) : $data.error ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "error-state"
          }, [
            vue.createElementVNode(
              "text",
              null,
              vue.toDisplayString($data.error),
              1
              /* TEXT */
            )
          ])) : (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "call-records-list"
          }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.callRecords, (record, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: index,
                  class: "call-record-item"
                }, [
                  vue.createElementVNode("view", { class: "left-section" }, [
                    vue.createElementVNode("view", { class: "record-datetime" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "date-time-text" },
                        vue.toDisplayString($options.formatTime(record.start_time)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "phone-with-icon" }, [
                      vue.createElementVNode("image", {
                        class: "phone-icon",
                        src: $options.getStatusIcon(record.status),
                        mode: "widthFix"
                      }, null, 8, ["src"]),
                      vue.createElementVNode(
                        "text",
                        { class: "record-phone-number" },
                        vue.toDisplayString(record.display_name),
                        1
                        /* TEXT */
                      )
                    ])
                  ]),
                  vue.createElementVNode("view", { class: "right-section" }, [
                    vue.createElementVNode(
                      "text",
                      {
                        class: vue.normalizeClass(["status-text", { "missed": record.status === "missed" || record.status === "no_answer" }])
                      },
                      vue.toDisplayString($options.getStatusText(record)),
                      3
                      /* TEXT, CLASS */
                    )
                  ])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ]))
        ])
      ]),
      $data.showConfirmModal ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "custom-modal-mask",
        onClick: _cache[6] || (_cache[6] = (...args) => $options.cancelClear && $options.cancelClear(...args))
      }, [
        vue.createElementVNode("view", {
          class: "custom-modal-box",
          onClick: _cache[5] || (_cache[5] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.createElementVNode("view", { class: "custom-modal-title" }, "确认清空"),
          vue.createElementVNode("view", { class: "custom-modal-content" }, "确定要清空该号码的所有通话记录吗？"),
          vue.createElementVNode("view", { class: "custom-modal-footer" }, [
            vue.createElementVNode("view", {
              class: "custom-modal-btn cancel",
              onClick: _cache[3] || (_cache[3] = (...args) => $options.cancelClear && $options.cancelClear(...args))
            }, "取消"),
            vue.createElementVNode("view", {
              class: "custom-modal-btn confirm",
              onClick: _cache[4] || (_cache[4] = (...args) => $options.confirmClear && $options.confirmClear(...args))
            }, "确定")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesCallDetailsCallDetails = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__scopeId", "data-v-3f343424"], ["__file", "C:/Coding/phone-web/phone/pages/call-details/call-details.vue"]]);
  const _imports_0$1 = "/static/icons/back1.png";
  const _imports_1$2 = "/static/icon/people.png";
  const _imports_2 = "/static/icons/people.png";
  const _imports_3 = "/static/icons/add2.png";
  const _imports_4 = "/static/icons/send.png";
  const _sfc_main$3 = {
    name: "NewMessagePage",
    data() {
      return {
        phone: "",
        message: "",
        userId: uni.getStorageSync("userId") || 6
      };
    },
    methods: {
      async sendMessage() {
        if (!this.phone.trim() || !this.message.trim()) {
          uni.showToast({
            title: "请输入手机号和消息内容",
            icon: "none"
          });
          return;
        }
        try {
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/send-message",
            method: "POST",
            data: {
              senderId: this.userId,
              receiverPhone: this.phone.trim(),
              content: this.message.trim()
            }
          });
          if (response.data.code === 0) {
            uni.showToast({
              title: "发送成功",
              icon: "none"
            });
            setTimeout(() => {
              uni.navigateBack();
            }, 1500);
          } else {
            uni.showToast({
              title: response.data.msg || "发送失败",
              icon: "none"
            });
          }
        } catch (error2) {
          formatAppLog("log", "at pages/message/new-message.vue:79", error2);
          formatAppLog("error", "at pages/message/new-message.vue:80", "Failed to send message:", error2);
          uni.showToast({
            title: "发送失败",
            icon: "none"
          });
        }
      },
      goBack() {
        uni.navigateBack();
      }
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "new-message-container" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("image", {
          class: "back-icon",
          src: _imports_0$1,
          onClick: _cache[0] || (_cache[0] = (...args) => $options.goBack && $options.goBack(...args))
        }),
        vue.createElementVNode("view", { class: "title" }, "新建信息"),
        vue.createElementVNode("image", {
          class: "contact-icon",
          src: _imports_1$2
        })
      ]),
      vue.createElementVNode("view", { class: "recipient-area" }, [
        vue.createElementVNode("text", { class: "recipient-label" }, "收件人:"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "recipient-input",
            type: "text",
            placeholder: "",
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.phone = $event)
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.phone]
        ]),
        vue.createElementVNode("image", {
          class: "add-contact-icon",
          src: _imports_2
        })
      ]),
      vue.createElementVNode("view", { class: "chat-footer" }, [
        vue.createElementVNode("image", {
          class: "chat-plus",
          src: _imports_3
        }),
        vue.createElementVNode("view", { class: "chat-input-area" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "chat-input",
              placeholder: "短信",
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.message = $event)
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [vue.vModelText, $data.message]
          ])
        ]),
        vue.createElementVNode("image", {
          class: "chat-send",
          src: _imports_4,
          onClick: _cache[3] || (_cache[3] = (...args) => $options.sendMessage && $options.sendMessage(...args))
        })
      ])
    ]);
  }
  const PagesMessageNewMessage = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-8a26534b"], ["__file", "C:/Coding/phone-web/phone/pages/message/new-message.vue"]]);
  const _imports_1$1 = "/static/icons/avatar1.png";
  const _imports_1 = "/static/icons/more.png";
  const _sfc_main$2 = {
    name: "ChatPage",
    data() {
      return {
        phone: "",
        displayName: "",
        isMenuVisible: false,
        isConfirmVisible: false,
        menuItems: ["删除", "我的收藏", "应急报警", "骚扰拦截", "全部已读", "设置"],
        inputMessage: "",
        scrollTop: 0,
        messages: [],
        userId: uni.getStorageSync("userId") || 6,
        page: 1,
        pageSize: 20,
        total: 0,
        isLoading: false,
        hasMore: true
      };
    },
    onLoad(options) {
      if (options.phone) {
        this.phone = options.phone;
        this.displayName = decodeURIComponent(options.displayName || options.phone);
        this.checkContactAndDisplay(this.phone);
        this.fetchMessages();
      }
    },
    methods: {
      async fetchMessages(isLoadMore = false) {
        if (this.isLoading || !isLoadMore && !this.hasMore)
          return;
        this.isLoading = true;
        try {
          const cleanedPhone = this.phone.replace(/\s/g, "");
          formatAppLog("log", "at pages/message/chat.vue:119", "Fetching messages with params:", { userId: this.userId, phone: cleanedPhone, page: this.page, pageSize: this.pageSize });
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/messages",
            method: "GET",
            data: {
              userId: this.userId,
              phone: cleanedPhone,
              page: this.page,
              pageSize: this.pageSize
            }
          });
          if (response.data.code === 0) {
            formatAppLog("log", "at pages/message/chat.vue:132", "Fetch messages successful, raw response:", response.data.data.list);
            const { list, total } = response.data.data;
            this.total = total;
            const formattedMessages = list.map((msg) => ({
              id: msg.id,
              text: msg.content,
              time: msg.created_at * 1e3,
              ismy: msg.ismy === 1
              // 显式判断，如果后端返回1，则认为是自己的消息
            })).reverse();
            formatAppLog("log", "at pages/message/chat.vue:143", "Formatted messages with ismy:", formattedMessages);
            this.messages = isLoadMore ? [...formattedMessages, ...this.messages] : formattedMessages;
            this.hasMore = this.messages.length < total;
            if (this.hasMore) {
              this.page++;
            }
            if (!isLoadMore) {
              this.$nextTick(() => {
                this.scrollToBottom();
              });
            } else {
              this.$nextTick(() => {
                if (formattedMessages.length > 0) {
                  const query = uni.createSelectorQuery().in(this);
                  query.select(`#item-${formattedMessages[0].id}`).boundingClientRect((rect) => {
                    if (rect) {
                      this.scrollTop = this.scrollTop + rect.top;
                    }
                  }).exec();
                }
              });
            }
          } else {
            uni.showToast({
              title: response.data.msg || "获取消息失败",
              icon: "none"
            });
          }
        } catch (error2) {
          formatAppLog("error", "at pages/message/chat.vue:176", "Error fetching messages:", error2);
          formatAppLog("error", "at pages/message/chat.vue:177", "Failed to fetch messages:", error2);
          uni.showToast({
            title: "获取消息失败",
            icon: "none"
          });
        } finally {
          this.isLoading = false;
        }
      },
      async sendMessage() {
        if (!this.inputMessage.trim())
          return;
        try {
          const messageData = {
            senderId: this.userId,
            receiverPhone: this.phone,
            content: this.inputMessage.trim(),
            ismy: true
          };
          formatAppLog("log", "at pages/message/chat.vue:196", "Sending message data to backend:", messageData);
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/send-message",
            method: "POST",
            data: messageData
          });
          if (response.data.code === 0) {
            const newMessage = {
              id: response.data.data.messageId,
              text: this.inputMessage.trim(),
              time: Date.now(),
              ismy: true
            };
            this.messages.push(newMessage);
            this.inputMessage = "";
            this.$nextTick(() => {
              this.scrollToBottom();
            });
          } else {
            uni.showToast({
              title: response.data.msg || "发送失败",
              icon: "none"
            });
          }
        } catch (error2) {
          formatAppLog("error", "at pages/message/chat.vue:225", "Failed to send message:", error2);
          uni.showToast({
            title: "发送失败",
            icon: "none"
          });
        }
      },
      async handleDelete() {
        try {
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/delete-conversation",
            method: "POST",
            data: {
              userId: this.userId,
              phone: this.phone
            }
          });
          if (response.data.code === 0) {
            uni.showToast({
              title: "删除成功",
              icon: "success"
            });
            setTimeout(() => {
              uni.navigateBack();
            }, 1500);
          } else {
            uni.showToast({
              title: response.data.msg || "删除失败",
              icon: "none"
            });
          }
        } catch (error2) {
          formatAppLog("error", "at pages/message/chat.vue:258", "Failed to delete conversation:", error2);
          uni.showToast({
            title: "删除失败",
            icon: "none"
          });
        }
        this.hideConfirm();
      },
      goBack() {
        uni.navigateBack();
      },
      showMenu() {
        this.isMenuVisible = true;
      },
      hideMenu() {
        this.isMenuVisible = false;
      },
      handleMenuClick(item) {
        if (item === "删除") {
          this.showConfirm();
        }
        this.hideMenu();
      },
      showConfirm() {
        this.isConfirmVisible = true;
      },
      hideConfirm() {
        this.isConfirmVisible = false;
      },
      scrollToBottom() {
        this.$nextTick(() => {
          const query = uni.createSelectorQuery().in(this);
          if (this.messages.length > 0) {
            const lastMessageId = this.messages[this.messages.length - 1].id;
            query.select(`#item-${lastMessageId}`).boundingClientRect((rect) => {
              if (rect) {
                query.select(".chat-body").boundingClientRect((chatBodyRect) => {
                  if (chatBodyRect) {
                    this.scrollTop = chatBodyRect.height + 1e3;
                  }
                }).exec();
              }
            }).exec();
          } else {
            this.scrollTop = 0;
          }
        });
      },
      loadMoreMessages() {
        if (this.hasMore && !this.isLoading) {
          this.fetchMessages(true);
        }
      },
      formatMessageTime(timestamp) {
        if (!timestamp)
          return "";
        const now = /* @__PURE__ */ new Date();
        const messageDate = new Date(timestamp);
        const year = messageDate.getFullYear();
        const month = (messageDate.getMonth() + 1).toString().padStart(2, "0");
        const day = messageDate.getDate().toString().padStart(2, "0");
        const hours = messageDate.getHours().toString().padStart(2, "0");
        const minutes = messageDate.getMinutes().toString().padStart(2, "0");
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (messageDate >= today) {
          return `今天 ${hours}:${minutes}`;
        } else if (messageDate >= yesterday) {
          return `昨天 ${hours}:${minutes}`;
        } else {
          return `${year}/${month}/${day} ${hours}:${minutes}`;
        }
      },
      async checkContactAndDisplay(number) {
        formatAppLog("log", "at pages/message/chat.vue:335", "checkContactAndDisplay: Processing number:", number);
        const cleanedNumber = number.replace(/\s/g, "");
        if (!cleanedNumber) {
          formatAppLog("log", "at pages/message/chat.vue:338", "checkContactAndDisplay: Invalid number. Using original display.");
          return;
        }
        try {
          const apiUrl = `http://106.53.30.150:9097/api/contact`;
          formatAppLog("log", "at pages/message/chat.vue:343", "checkContactAndDisplay: Calling API:", apiUrl, "with phone:", cleanedNumber);
          const res = await uni.request({
            url: apiUrl,
            method: "POST",
            data: {
              phone: cleanedNumber
            }
          });
          formatAppLog("log", "at pages/message/chat.vue:351", "checkContactAndDisplay: API response:", res);
          if (res.statusCode === 200 && res.data && res.data.code === 0 && res.data.data) {
            formatAppLog("log", "at pages/message/chat.vue:355", "checkContactAndDisplay: Contact found. Updating displayName.");
            this.displayName = res.data.data.name;
            formatAppLog("log", "at pages/message/chat.vue:357", "checkContactAndDisplay: Updated displayName to:", this.displayName);
          } else {
            formatAppLog("log", "at pages/message/chat.vue:360", "checkContactAndDisplay: Contact not found or API issue. Keeping initial displayName.");
          }
        } catch (error2) {
          formatAppLog("error", "at pages/message/chat.vue:363", "checkContactAndDisplay: Failed to check contact API:", error2);
        }
      }
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "chat-container" }, [
      vue.createElementVNode("view", { class: "chat-header" }, [
        vue.createElementVNode("image", {
          class: "chat-back",
          src: _imports_0$1,
          onClick: _cache[0] || (_cache[0] = (...args) => $options.goBack && $options.goBack(...args))
        }),
        vue.createElementVNode("image", {
          class: "chat-avatar",
          src: _imports_1$1,
          mode: "aspectFill"
        }),
        vue.createElementVNode(
          "view",
          { class: "chat-phone" },
          vue.toDisplayString($data.displayName || $data.phone),
          1
          /* TEXT */
        ),
        vue.createElementVNode("image", {
          class: "chat-menu",
          src: _imports_1,
          onClick: _cache[1] || (_cache[1] = (...args) => $options.showMenu && $options.showMenu(...args))
        })
      ]),
      $data.isMenuVisible ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "menu-popup",
        onClick: _cache[3] || (_cache[3] = (...args) => $options.hideMenu && $options.hideMenu(...args))
      }, [
        vue.createElementVNode("view", {
          class: "menu-content",
          onClick: _cache[2] || (_cache[2] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.menuItems, (item, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                class: "menu-item",
                key: index,
                onClick: ($event) => $options.handleMenuClick(item)
              }, vue.toDisplayString(item), 9, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ])) : vue.createCommentVNode("v-if", true),
      $data.isConfirmVisible ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "confirm-dialog",
        onClick: _cache[7] || (_cache[7] = (...args) => $options.hideConfirm && $options.hideConfirm(...args))
      }, [
        vue.createElementVNode("view", {
          class: "confirm-content",
          onClick: _cache[6] || (_cache[6] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.createElementVNode("view", { class: "confirm-title" }, "是否删除全部信息？"),
          vue.createElementVNode("view", { class: "confirm-buttons" }, [
            vue.createElementVNode("view", {
              class: "confirm-button cancel",
              onClick: _cache[4] || (_cache[4] = (...args) => $options.hideConfirm && $options.hideConfirm(...args))
            }, "取消"),
            vue.createElementVNode("view", {
              class: "confirm-button confirm",
              onClick: _cache[5] || (_cache[5] = (...args) => $options.handleDelete && $options.handleDelete(...args))
            }, "确定")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("scroll-view", {
        class: "chat-body",
        "scroll-y": "true",
        "scroll-top": $data.scrollTop,
        onScrolltoupper: _cache[8] || (_cache[8] = (...args) => $options.loadMoreMessages && $options.loadMoreMessages(...args)),
        "scroll-with-animation": ""
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.messages, (message) => {
            return vue.openBlock(), vue.createElementBlock(
              "view",
              {
                key: message.id,
                class: vue.normalizeClass(["chat-item", { "chat-item-left": !message.ismy, "chat-item-right": message.ismy }])
              },
              [
                !message.ismy ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "other-message-group"
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "chat-bubble" },
                    vue.toDisplayString(message.text),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "view",
                    { class: "chat-bubble other time" },
                    vue.toDisplayString($options.formatMessageTime(message.time)),
                    1
                    /* TEXT */
                  )
                ])) : (vue.openBlock(), vue.createElementBlock("view", {
                  key: 1,
                  class: "self-message-group"
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "chat-bubble self" },
                    vue.toDisplayString(message.text),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "view",
                    { class: "chat-bubble self time" },
                    vue.toDisplayString($options.formatMessageTime(message.time)),
                    1
                    /* TEXT */
                  )
                ]))
              ],
              2
              /* CLASS */
            );
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        $data.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "loading-more-text"
        }, "加载中...")) : vue.createCommentVNode("v-if", true)
      ], 40, ["scroll-top"]),
      vue.createElementVNode("view", { class: "chat-footer" }, [
        vue.createElementVNode("image", {
          class: "chat-plus",
          src: _imports_3
        }),
        vue.createElementVNode("view", { class: "chat-input-area" }, [
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "chat-input",
              "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => $data.inputMessage = $event),
              placeholder: "短信",
              onConfirm: _cache[10] || (_cache[10] = (...args) => $options.sendMessage && $options.sendMessage(...args)),
              "confirm-type": "send"
            },
            null,
            544
            /* NEED_HYDRATION, NEED_PATCH */
          ), [
            [vue.vModelText, $data.inputMessage]
          ])
        ]),
        $data.inputMessage.trim() ? (vue.openBlock(), vue.createElementBlock("image", {
          key: 0,
          class: "chat-send",
          src: _imports_4,
          onClick: _cache[11] || (_cache[11] = (...args) => $options.sendMessage && $options.sendMessage(...args))
        })) : vue.createCommentVNode("v-if", true)
      ])
    ]);
  }
  const PagesMessageChat = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-013fa921"], ["__file", "C:/Coding/phone-web/phone/pages/message/chat.vue"]]);
  const _imports_0 = "/static/icons/add1.png";
  const _sfc_main$1 = {
    name: "MessagePage",
    data() {
      return {
        isMenuVisible: false,
        menuItems: ["全部已读", "删除全部", "设置"],
        conversations: [],
        userId: uni.getStorageSync("userId") || 6,
        isLoading: false,
        startX: 0,
        currentX: 0
      };
    },
    onLoad() {
      this.fetchConversations();
    },
    onShow() {
      this.fetchConversations();
    },
    methods: {
      async fetchConversations() {
        this.isLoading = true;
        try {
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/conversations",
            method: "GET",
            data: {
              userId: this.userId
            }
          });
          if (response.data.code === 0) {
            this.conversations = response.data.data.map((conv) => ({
              phone: conv.phone,
              lastMessage: conv.last_message,
              lastMessageTime: conv.last_message_time * 1e3,
              // 转换为毫秒
              unreadCount: conv.unread_count,
              displayName: conv.display_name,
              offsetX: 0
            }));
          } else {
            uni.showToast({
              title: response.data.msg || "获取会话列表失败",
              icon: "none"
            });
          }
        } catch (error2) {
          formatAppLog("error", "at pages/message/message.vue:97", "Failed to fetch conversations:", error2);
          uni.showToast({
            title: "获取会话列表失败",
            icon: "none"
          });
        } finally {
          this.isLoading = false;
        }
      },
      navigateToAddMessagePage() {
        uni.navigateTo({
          url: "/pages/message/new-message"
        });
      },
      navigateToChat(conversation) {
        if (conversation.offsetX === 0) {
          uni.navigateTo({
            url: `/pages/message/chat?phone=${conversation.phone}&displayName=${encodeURIComponent(conversation.displayName)}`
          });
        }
      },
      showMenu() {
        this.isMenuVisible = true;
      },
      hideMenu() {
        this.isMenuVisible = false;
      },
      async handleMenuClick(item) {
        if (item === "删除全部") {
          this.resetAllItems();
          const phones = this.conversations.map((conv) => conv.phone);
          if (phones.length === 0) {
            uni.showToast({
              title: "没有可删除的会话",
              icon: "none"
            });
            return;
          }
          try {
            const response = await uni.request({
              url: "http://106.53.30.150:9097/api/delete-conversations",
              method: "POST",
              data: {
                userId: this.userId,
                phones
              }
            });
            if (response.data.code === 0) {
              uni.showToast({
                title: "删除成功",
                icon: "success"
              });
              this.conversations = [];
            } else {
              uni.showToast({
                title: response.data.msg || "删除失败",
                icon: "none"
              });
            }
          } catch (error2) {
            formatAppLog("error", "at pages/message/message.vue:160", "Failed to delete conversations:", error2);
            uni.showToast({
              title: "删除失败",
              icon: "none"
            });
          }
        }
        this.hideMenu();
      },
      formatDate(timestamp) {
        if (!timestamp)
          return "";
        const now = /* @__PURE__ */ new Date();
        const messageDate = new Date(timestamp);
        if (messageDate.toDateString() === now.toDateString()) {
          return `${messageDate.getHours().toString().padStart(2, "0")}:${messageDate.getMinutes().toString().padStart(2, "0")}`;
        }
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (messageDate.toDateString() === yesterday.toDateString()) {
          return "昨天";
        }
        return `${(messageDate.getMonth() + 1).toString().padStart(2, "0")}/${messageDate.getDate().toString().padStart(2, "0")}`;
      },
      touchStart(e) {
        this.startX = e.touches[0].clientX;
        this.resetAllItems();
      },
      touchMove(e) {
        const currentX = e.touches[0].clientX;
        const diff = currentX - this.startX;
        const index = e.currentTarget.dataset.index;
        if (diff < 0) {
          const deleteButtonWidth = uni.upx2px(150);
          this.conversations[index].offsetX = Math.max(diff, -deleteButtonWidth);
        } else {
          this.conversations[index].offsetX = 0;
        }
      },
      touchEnd(e) {
        const index = e.currentTarget.dataset.index;
        const deleteButtonWidth = uni.upx2px(150);
        if (this.conversations[index].offsetX < -deleteButtonWidth / 2) {
          this.conversations[index].offsetX = -deleteButtonWidth;
        } else {
          this.conversations[index].offsetX = 0;
        }
      },
      resetAllItems() {
        this.conversations.forEach((item) => {
          item.offsetX = 0;
        });
      },
      async deleteConversation(phone) {
        try {
          formatAppLog("log", "at pages/message/message.vue:227", "Deleting conversation with phone:", phone);
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/delete-conversation",
            method: "POST",
            data: {
              userId: this.userId,
              phone
            }
          });
          formatAppLog("log", "at pages/message/message.vue:237", "Delete conversation response:", response);
          if (response.data.code === 0) {
            uni.showToast({
              title: "删除成功",
              icon: "none"
            });
            this.conversations = this.conversations.filter((conv) => conv.phone !== phone);
          } else {
            uni.showToast({
              title: response.data.msg || "删除失败",
              icon: "none"
            });
          }
        } catch (error2) {
          formatAppLog("error", "at pages/message/message.vue:252", "Failed to delete conversation:", error2);
          uni.showToast({
            title: "删除失败",
            icon: "none"
          });
        } finally {
          this.resetAllItems();
        }
      }
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", {
      class: "container",
      onClick: _cache[7] || (_cache[7] = (...args) => $options.resetAllItems && $options.resetAllItems(...args))
    }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("view", null, [
          vue.createElementVNode("view", { class: "title" }, "信息")
        ]),
        vue.createElementVNode("view", { class: "header-right" }, [
          vue.createElementVNode("image", {
            class: "add-btn",
            src: _imports_0,
            onClick: _cache[0] || (_cache[0] = (...args) => $options.navigateToAddMessagePage && $options.navigateToAddMessagePage(...args))
          }),
          vue.createElementVNode("image", {
            class: "more-btn",
            src: _imports_1,
            onClick: _cache[1] || (_cache[1] = vue.withModifiers((...args) => $options.showMenu && $options.showMenu(...args), ["stop"]))
          })
        ])
      ]),
      vue.createElementVNode("view", { class: "msg-list" }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.conversations, (conversation, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: index,
              class: "msg-item-wrapper"
            }, [
              vue.createElementVNode("view", {
                class: "msg-item",
                onClick: ($event) => $options.navigateToChat(conversation),
                onTouchstart: _cache[2] || (_cache[2] = (...args) => $options.touchStart && $options.touchStart(...args)),
                onTouchmove: _cache[3] || (_cache[3] = (...args) => $options.touchMove && $options.touchMove(...args)),
                onTouchend: _cache[4] || (_cache[4] = (...args) => $options.touchEnd && $options.touchEnd(...args)),
                style: vue.normalizeStyle({ transform: `translateX(${conversation.offsetX || 0}px)` }),
                "data-index": index
              }, [
                vue.createElementVNode("image", {
                  class: "avatar",
                  src: conversation.avatar || "/static/icons/avatar1.png",
                  mode: "aspectFill"
                }, null, 8, ["src"]),
                vue.createElementVNode("view", { class: "msg-content" }, [
                  vue.createElementVNode(
                    "view",
                    { class: "msg-phone" },
                    vue.toDisplayString(conversation.display_name || conversation.phone),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "view",
                    { class: "msg-date" },
                    vue.toDisplayString($options.formatDate(conversation.lastMessageTime)),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "view",
                    { class: "msg-text" },
                    vue.toDisplayString(conversation.lastMessage),
                    1
                    /* TEXT */
                  )
                ])
              ], 44, ["onClick", "data-index"]),
              vue.createElementVNode("view", {
                class: "msg-delete-btn",
                onClick: ($event) => $options.deleteConversation(conversation.phone)
              }, "删除", 8, ["onClick"])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      $data.isMenuVisible ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "menu-popup",
        onClick: _cache[6] || (_cache[6] = (...args) => $options.hideMenu && $options.hideMenu(...args))
      }, [
        vue.createElementVNode("view", {
          class: "menu-content",
          onClick: _cache[5] || (_cache[5] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.menuItems, (item, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                class: "menu-item",
                key: index,
                onClick: ($event) => $options.handleMenuClick(item)
              }, vue.toDisplayString(item), 9, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesMessageMessage = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-4c1b26cf"], ["__file", "C:/Coding/phone-web/phone/pages/message/message.vue"]]);
  __definePage("pages/dial/dial", PagesDialDial);
  __definePage("pages/auth/login", PagesAuthLogin);
  __definePage("pages/call/calling", PagesCallCalling);
  __definePage("pages/contacts/contacts", PagesContactsContacts);
  __definePage("pages/favorite/favorite", PagesFavoriteFavorite);
  __definePage("pages/call-back/call-back", PagesCallBackCallBack);
  __definePage("pages/batch-delete-records/batch-delete-records", PagesBatchDeleteRecordsBatchDeleteRecords);
  __definePage("pages/call-details/call-details", PagesCallDetailsCallDetails);
  __definePage("pages/message/new-message", PagesMessageNewMessage);
  __definePage("pages/message/chat", PagesMessageChat);
  __definePage("pages/message/message", PagesMessageMessage);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("warn", "at App.vue:5", "当前组件仅支持 uni_modules 目录结构 ，请升级 HBuilderX 到 3.1.0 版本以上！");
      formatAppLog("log", "at App.vue:6", "App Launch");
      const userId = uni.getStorageSync("userId");
      const authToken = uni.getStorageSync("authToken");
      if (userId || authToken) {
        formatAppLog("log", "at App.vue:13", "Found user credentials in local storage, proceeding to main page.");
        uni.reLaunch({
          url: "/pages/dial/dial"
        });
      } else {
        formatAppLog("log", "at App.vue:20", "No user credentials found, redirecting to login page.");
        uni.reLaunch({
          url: "/pages/auth/login"
        });
      }
      setTimeout(() => {
        this.preloadBackground();
      }, 2e3);
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:33", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:36", "App Hide");
    },
    methods: {
      async preloadBackground() {
        try {
          const cachedBg = uni.getStorageSync("cached_background");
          const cacheTime = uni.getStorageSync("background_cache_time");
          const now = Date.now();
          if (cachedBg && cacheTime && now - cacheTime < 24 * 60 * 60 * 1e3) {
            formatAppLog("log", "at App.vue:48", "Using cached background");
            return;
          }
          const ret = u7746wallpaper.getBackground("test.png");
          if (ret.code === "1") {
            uni.setStorageSync("cached_background", ret.msg);
            uni.setStorageSync("background_cache_time", now);
            formatAppLog("log", "at App.vue:57", "Background cached successfully");
          }
        } catch (error2) {
          formatAppLog("error", "at App.vue:60", "Error preloading background:", error2);
        }
      }
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "C:/Coding/phone-web/phone/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);

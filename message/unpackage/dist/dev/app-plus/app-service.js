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
  const _imports_0$1 = "/static/icons/add1.png";
  const _imports_1$1 = "/static/icons/more.png";
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$4 = {
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
            formatAppLog("log", "at pages/message/message.vue:82", "Raw conversations data:", response.data.data);
            this.conversations = response.data.data.map((conv) => {
              const displayName = conv.display_name || conv.phone;
              const avatar = this.getCarrierAvatar(displayName);
              formatAppLog("log", "at pages/message/message.vue:86", "Processing conversation:", {
                phone: conv.phone,
                displayName,
                avatar
              });
              return {
                phone: conv.phone,
                lastMessage: conv.last_message,
                lastMessageTime: conv.last_message_time * 1e3,
                unreadCount: conv.unread_count,
                display_name: displayName,
                avatar,
                offsetX: 0
              };
            });
            formatAppLog("log", "at pages/message/message.vue:101", "Processed conversations:", this.conversations);
          } else {
            uni.showToast({
              title: response.data.msg || "获取会话列表失败",
              icon: "none"
            });
          }
        } catch (error) {
          formatAppLog("error", "at pages/message/message.vue:109", "Failed to fetch conversations:", error);
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
            url: `/pages/message/chat?phone=${conversation.phone}&displayName=${encodeURIComponent(conversation.display_name)}`
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
          } catch (error) {
            formatAppLog("error", "at pages/message/message.vue:172", "Failed to delete conversations:", error);
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
          formatAppLog("log", "at pages/message/message.vue:239", "Deleting conversation with phone:", phone);
          const response = await uni.request({
            url: "http://106.53.30.150:9097/api/delete-conversation",
            method: "POST",
            data: {
              userId: this.userId,
              phone
            }
          });
          formatAppLog("log", "at pages/message/message.vue:249", "Delete conversation response:", response);
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
        } catch (error) {
          formatAppLog("error", "at pages/message/message.vue:264", "Failed to delete conversation:", error);
          uni.showToast({
            title: "删除失败",
            icon: "none"
          });
        } finally {
          this.resetAllItems();
        }
      },
      // 添加判断运营商客服号码的方法
      getCarrierAvatar(phone) {
        formatAppLog("log", "at pages/message/message.vue:275", "getCarrierAvatar called with:", phone);
        switch (phone) {
          case "中国电信":
            formatAppLog("log", "at pages/message/message.vue:279", "Matched 中国电信");
            return "/static/icons/10000.png";
          case "中国联通":
            formatAppLog("log", "at pages/message/message.vue:282", "Matched 中国联通");
            return "/static/icons/10010.png";
          case "中国移动":
            formatAppLog("log", "at pages/message/message.vue:285", "Matched 中国移动");
            return "/static/icons/10086.png";
          default:
            formatAppLog("log", "at pages/message/message.vue:288", "No match, using default avatar");
            return "/static/icons/avatar1.png";
        }
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", {
      class: "container",
      onClick: _cache[7] || (_cache[7] = (...args) => $options.resetAllItems && $options.resetAllItems(...args))
    }, [
      vue.createCommentVNode(" 顶部栏 "),
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("view", null, [
          vue.createElementVNode("view", { class: "title" }, "信息")
        ]),
        vue.createElementVNode("view", { class: "header-right" }, [
          vue.createElementVNode("image", {
            class: "add-btn",
            src: _imports_0$1,
            onClick: _cache[0] || (_cache[0] = (...args) => $options.navigateToAddMessagePage && $options.navigateToAddMessagePage(...args))
          }),
          vue.createElementVNode("image", {
            class: "more-btn",
            src: _imports_1$1,
            onClick: _cache[1] || (_cache[1] = vue.withModifiers((...args) => $options.showMenu && $options.showMenu(...args), ["stop"]))
          })
        ])
      ]),
      vue.createCommentVNode(" 消息列表 "),
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
                  src: conversation.avatar,
                  mode: "aspectFill"
                }, null, 8, ["src"]),
                vue.createElementVNode("view", { class: "msg-content" }, [
                  vue.createElementVNode(
                    "view",
                    { class: "msg-phone" },
                    vue.toDisplayString(conversation.display_name),
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
      vue.createCommentVNode(" 弹出菜单 "),
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
  const PagesMessageMessage = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__scopeId", "data-v-4c1b26cf"], ["__file", "D:/message/pages/message/message.vue"]]);
  const _sfc_main$3 = {
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
        } catch (error) {
          formatAppLog("error", "at pages/auth/login.vue:78", "Login failed:", error);
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
                url: "/pages/message/message"
              });
            } else {
              uni.showToast({ title: ((_a = res.data) == null ? void 0 : _a.msg) || "获取用户信息失败", icon: "none" });
              uni.reLaunch({
                url: "/pages/message/message"
              });
            }
          },
          fail: (err) => {
            formatAppLog("error", "at pages/auth/login.vue:110", "Failed to get user info:", err);
            uni.showToast({ title: "获取用户信息网络错误", icon: "none" });
            uni.reLaunch({
              url: "/pages/message/message"
            });
          }
        });
      }
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
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
  const PagesAuthLogin = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-2cc9f8c3"], ["__file", "D:/message/pages/auth/login.vue"]]);
  const _imports_0 = "/static/icons/back1.png";
  const _imports_1 = "/static/icon/people.png";
  const _imports_2$1 = "/static/icons/people.png";
  const _imports_2 = "/static/icons/add2.png";
  const _imports_3 = "/static/icons/send.png";
  const _sfc_main$2 = {
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
        } catch (error) {
          formatAppLog("log", "at pages/message/new-message.vue:79", error);
          formatAppLog("error", "at pages/message/new-message.vue:80", "Failed to send message:", error);
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
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "new-message-container" }, [
      vue.createCommentVNode(" 顶部栏 "),
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("image", {
          class: "back-icon",
          src: _imports_0,
          onClick: _cache[0] || (_cache[0] = (...args) => $options.goBack && $options.goBack(...args))
        }),
        vue.createElementVNode("view", { class: "title" }, "新建信息"),
        vue.createElementVNode("image", {
          class: "contact-icon",
          src: _imports_1
        })
      ]),
      vue.createCommentVNode(" 收件人输入框 "),
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
          src: _imports_2$1
        })
      ]),
      vue.createCommentVNode(" 消息内容输入区 (底部) "),
      vue.createCommentVNode(" 底部输入栏 "),
      vue.createElementVNode("view", { class: "chat-footer" }, [
        vue.createCommentVNode(' <view class="chat-plus">+</view> '),
        vue.createElementVNode("image", {
          class: "chat-plus",
          src: _imports_2
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
          src: _imports_3,
          onClick: _cache[3] || (_cache[3] = (...args) => $options.sendMessage && $options.sendMessage(...args))
        }),
        vue.createCommentVNode(' <view class="chat-send">&#8593;</view> ')
      ])
    ]);
  }
  const PagesMessageNewMessage = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-8a26534b"], ["__file", "D:/message/pages/message/new-message.vue"]]);
  const _sfc_main$1 = {
    name: "ChatPage",
    data() {
      return {
        phone: "",
        displayName: "",
        avatar: "/static/icons/avatar1.png",
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
        this.displayName = options.displayName ? decodeURIComponent(options.displayName) : options.phone;
        this.avatar = this.getCarrierAvatar(this.displayName);
        formatAppLog("log", "at pages/message/chat.vue:110", "Chat page loaded with:", { phone: this.phone, displayName: this.displayName });
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
          formatAppLog("log", "at pages/message/chat.vue:121", "Fetching messages with params:", { userId: this.userId, phone: cleanedPhone, page: this.page, pageSize: this.pageSize });
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
            formatAppLog("log", "at pages/message/chat.vue:134", "Fetch messages successful, raw response:", response.data.data.list);
            const { list, total } = response.data.data;
            this.total = total;
            const formattedMessages = list.map((msg) => ({
              id: msg.id,
              text: msg.content,
              time: msg.created_at * 1e3,
              ismy: msg.ismy === 1
            })).reverse();
            this.messages = isLoadMore ? [...formattedMessages, ...this.messages] : formattedMessages;
            this.hasMore = this.messages.length < total;
            if (this.hasMore) {
              this.page++;
            }
            if (!isLoadMore) {
              this.$nextTick(() => {
                this.scrollToBottom();
              });
            }
          } else {
            uni.showToast({
              title: response.data.msg || "获取消息失败",
              icon: "none"
            });
          }
        } catch (error) {
          formatAppLog("error", "at pages/message/chat.vue:164", "Error fetching messages:", error);
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
          formatAppLog("log", "at pages/message/chat.vue:183", "Sending message data to backend:", messageData);
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
        } catch (error) {
          formatAppLog("error", "at pages/message/chat.vue:212", "Failed to send message:", error);
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
        } catch (error) {
          formatAppLog("error", "at pages/message/chat.vue:245", "Failed to delete conversation:", error);
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
        formatAppLog("log", "at pages/message/chat.vue:322", "checkContactAndDisplay: Processing number:", number);
        const cleanedNumber = number.replace(/\s/g, "");
        if (!cleanedNumber || !this.userId) {
          formatAppLog("log", "at pages/message/chat.vue:325", "checkContactAndDisplay: Invalid number or userId. Using phone number as display.");
          this.displayName = this.phone;
          return;
        }
        try {
          const apiUrl = `http://106.53.30.150:9097/api/contact`;
          formatAppLog("log", "at pages/message/chat.vue:331", "checkContactAndDisplay: Calling API:", apiUrl, "with phone:", cleanedNumber, "and userId:", this.userId);
          const res = await uni.request({
            url: apiUrl,
            method: "POST",
            data: {
              phone: cleanedNumber,
              userId: this.userId
            }
          });
          formatAppLog("log", "at pages/message/chat.vue:340", "checkContactAndDisplay: API response:", res);
          if (res.statusCode === 200 && res.data && res.data.code === 0 && res.data.data && res.data.data.name) {
            formatAppLog("log", "at pages/message/chat.vue:344", "checkContactAndDisplay: Contact found. Updating displayName.");
            this.displayName = res.data.data.name;
          } else {
            formatAppLog("log", "at pages/message/chat.vue:348", "checkContactAndDisplay: Contact not found. Using phone number as display.");
            this.displayName = this.phone;
          }
        } catch (error) {
          formatAppLog("error", "at pages/message/chat.vue:352", "checkContactAndDisplay: Failed to check contact API:", error);
          this.displayName = this.phone;
        }
      },
      // 添加判断运营商客服号码的方法
      getCarrierAvatar(phone) {
        switch (phone) {
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
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "chat-container" }, [
      vue.createCommentVNode(" 顶部栏 "),
      vue.createElementVNode("view", { class: "chat-header" }, [
        vue.createElementVNode("image", {
          class: "chat-back",
          src: _imports_0,
          onClick: _cache[0] || (_cache[0] = (...args) => $options.goBack && $options.goBack(...args))
        }),
        vue.createElementVNode("image", {
          class: "chat-avatar",
          src: $data.avatar,
          mode: "aspectFill"
        }, null, 8, ["src"]),
        vue.createElementVNode(
          "view",
          { class: "chat-phone" },
          vue.toDisplayString($data.displayName),
          1
          /* TEXT */
        ),
        vue.createElementVNode("image", {
          class: "chat-menu",
          src: _imports_1$1,
          onClick: _cache[1] || (_cache[1] = (...args) => $options.showMenu && $options.showMenu(...args))
        })
      ]),
      vue.createCommentVNode(" 弹出菜单 "),
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
      vue.createCommentVNode(" 确认删除弹窗 "),
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
      vue.createCommentVNode(" 聊天内容区 "),
      vue.createElementVNode("scroll-view", {
        class: "chat-body",
        "scroll-y": "true",
        "scroll-top": $data.scrollTop,
        onScrolltoupper: _cache[8] || (_cache[8] = (...args) => $options.loadMoreMessages && $options.loadMoreMessages(...args)),
        "scroll-with-animation": ""
      }, [
        vue.createCommentVNode(" 消息列表 "),
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
                vue.createCommentVNode(" 左侧气泡（对方消息）和时间 "),
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
                  vue.createCommentVNode(" 对方消息时间，与气泡左对齐 "),
                  vue.createElementVNode(
                    "view",
                    { class: "chat-bubble other time" },
                    vue.toDisplayString($options.formatMessageTime(message.time)),
                    1
                    /* TEXT */
                  )
                ])) : (vue.openBlock(), vue.createElementBlock(
                  vue.Fragment,
                  { key: 1 },
                  [
                    vue.createCommentVNode(" 右侧气泡（自己消息）和时间 "),
                    vue.createElementVNode("view", { class: "self-message-group" }, [
                      vue.createElementVNode(
                        "view",
                        { class: "chat-bubble self" },
                        vue.toDisplayString(message.text),
                        1
                        /* TEXT */
                      ),
                      vue.createCommentVNode(" 自己的消息时间，与气泡右对齐 "),
                      vue.createElementVNode(
                        "view",
                        { class: "chat-bubble self time" },
                        vue.toDisplayString($options.formatMessageTime(message.time)),
                        1
                        /* TEXT */
                      )
                    ])
                  ],
                  2112
                  /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
                ))
              ],
              2
              /* CLASS */
            );
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        vue.createCommentVNode(" 加载提示 "),
        $data.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "loading-more-text"
        }, "加载中...")) : vue.createCommentVNode("v-if", true)
      ], 40, ["scroll-top"]),
      vue.createCommentVNode(" 底部输入栏 "),
      vue.createElementVNode("view", { class: "chat-footer" }, [
        vue.createElementVNode("image", {
          class: "chat-plus",
          src: _imports_2
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
          src: _imports_3,
          onClick: _cache[11] || (_cache[11] = (...args) => $options.sendMessage && $options.sendMessage(...args))
        })) : vue.createCommentVNode("v-if", true)
      ])
    ]);
  }
  const PagesMessageChat = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-013fa921"], ["__file", "D:/message/pages/message/chat.vue"]]);
  __definePage("pages/message/message", PagesMessageMessage);
  __definePage("pages/auth/login", PagesAuthLogin);
  __definePage("pages/message/new-message", PagesMessageNewMessage);
  __definePage("pages/message/chat", PagesMessageChat);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("warn", "at App.vue:4", "当前组件仅支持 uni_modules 目录结构 ，请升级 HBuilderX 到 3.1.0 版本以上！");
      formatAppLog("log", "at App.vue:5", "App Launch");
      const userId = uni.getStorageSync("userId");
      const authToken = uni.getStorageSync("authToken");
      if (userId || authToken) {
        formatAppLog("log", "at App.vue:12", "Found user credentials in local storage, proceeding to main page.");
        uni.reLaunch({
          url: "/pages/dial/dial"
        });
      } else {
        formatAppLog("log", "at App.vue:19", "No user credentials found, redirecting to login page.");
        uni.reLaunch({
          url: "/pages/auth/login"
        });
      }
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:27", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:30", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "D:/message/App.vue"]]);
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

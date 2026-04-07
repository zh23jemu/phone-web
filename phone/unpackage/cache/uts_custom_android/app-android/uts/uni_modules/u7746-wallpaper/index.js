
const { registerUTSInterface, initUTSProxyClass, initUTSProxyFunction, initUTSPackageName, initUTSIndexClassName, initUTSClassName } = uni
const name = 'u7746Wallpaper'
const moduleName = 'u7746-wallpaper'
const moduleType = ''
const errMsg = ``
const is_uni_modules = true
const pkg = /*#__PURE__*/ initUTSPackageName(name, is_uni_modules)
const cls = /*#__PURE__*/ initUTSIndexClassName(name, is_uni_modules)

const exports = { __esModule: true }



exports.getBackground = /*#__PURE__*/ initUTSProxyFunction(false, { moduleName, moduleType, errMsg, main: true, package: pkg, class: cls, name: 'getBackgroundByJs', keepAlive: false, params: [{"name":"wallpaperName","type":"string"}], return: ""})
uni.registerUTSPlugin('uni_modules/u7746-wallpaper', exports)

## 1.0.0（2024-04-02）
android获取系统桌面壁纸图片
请在宿主app验证相关权限
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

## 例子
```
请在宿主内统一判断权限，所需要的权限为
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

import * as u7746wallpaper from "../../uni_modules/u7746-wallpaper";
//获取到系统壁纸后会按参数保存在自身app的沙箱里 ,参数为保存壁纸的名称
let ret = u7746wallpaper.getBackground('test.png')
console.log(ret)
//1表示成功 msg为壁纸路径 -1为失败msg里有错误信息
if (ret.code == "1") {
	that.imgUrl = ret.msg
}

如符合预期且付费，可发站内信息索取源代码
```

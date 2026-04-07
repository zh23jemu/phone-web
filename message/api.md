基本说明：
接口地址：http://apis.juhe.cn/mobile/get
返回格式：json
请求方式：get
请求示例：http://apis.juhe.cn/mobile/get?phone=手机号前七位或手机号&key=c41b369a4b209383234b0903a5ef2877
请求参数说明：
名称	类型	必填	说明
phone	int	必填	需要查询的手机号码或手机号码前7位
key	string	必填	在个人中心->我的数据,接口名称上方查看 扫码关注公众号
dtype	string	选填	返回数据的格式,xml或json，默认json
返回参数说明：
名称	类型	说明
error_code	int	返回码
reason	string	返回说明
result	string	返回结果集
province	string	省份
city	string	城市，(北京、上海、重庆、天津直辖市可能为空)
areacode	string	区号，(部分记录可能为空)
zip	string	邮编，(部分记录可能为空)
company	string	运营商
JSON返回示例：
{
	"resultcode": "200",
	"reason": "Return Successd!",
	"result": {
		"province": "浙江",
		"city": "杭州",
		"areacode": "0571",
		"zip": "310000",
		"company": "中国移动",
		"card": ""
	}
}
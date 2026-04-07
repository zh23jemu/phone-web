import config from '@/config'
import request from '@/utils/request'

// 登录
export function login(params: Record<string, any>) {
    return request.post({ url: '/login/account', params: { ...params, terminal: config.terminal } })
}

// 退出登录
export function logout() {
    return request.post({ url: '/login/logout' })
}

// 用户信息
export function getUserInfo() {
    return request.get({ url: '/auth.admin/mySelf' })
}

// 编辑管理员信息
export function setUserInfo(params: any) {
    return request.post({ url: '/auth.admin/editSelf', params })
}

// 用户表列表
export function apiUserLists(params: any) {
    return request.get({ url: '/user/lists', params })
}

// 添加用户表
export function apiUserAdd(params: any) {
    return request.post({ url: '/user/add', params })
}

// 编辑用户表
export function apiUserEdit(params: any) {
    return request.post({ url: '/user/edit', params })
}

// 删除用户表
export function apiUserDelete(params: any) {
    return request.post({ url: '/user/delete', params })
}

// 用户表详情
export function apiUserDetail(params: any) {
    return request.get({ url: '/user/detail', params })
}
<template>
    <div class="edit-popup">
        <popup ref="popupRef" :title="popupTitle" :async="true" width="550px" @confirm="handleSubmit"
            @close="handleClose">
            <el-form ref="formRef" :model="formData" label-width="90px" :rules="formRules">
                <el-form-item label="头像" prop="avatar">
                    <el-input v-model="formData.avatar" clearable placeholder="请输入头像" />
                </el-form-item>
                <el-form-item label="用户昵称" prop="nickname">
                    <el-input v-model="formData.nickname" clearable placeholder="请输入用户昵称" />
                </el-form-item>
                <el-form-item label="用户账号" prop="account">
                    <el-input v-model="formData.account" clearable placeholder="请输入用户账号" />
                </el-form-item>
                <el-form-item label="用户密码" prop="password">
                    <el-input v-model="formData.password" clearable placeholder="请输入用户密码" />
                </el-form-item>
                <el-form-item label="是否禁用" prop="is_disable">
                    <el-input v-model="formData.is_disable" clearable placeholder="请输入是否禁用: [0=否, 1=是]" />
                </el-form-item>
                <el-form-item label="用户余额" prop="user_money">
                    <el-input v-model="formData.user_money" clearable placeholder="请输入用户余额" />
                </el-form-item>
            </el-form>
        </popup>
    </div>
</template>

<script lang="ts" setup name="userEdit">
import type { FormInstance } from 'element-plus'
import Popup from '@/components/popup/index.vue'
import { apiUserAdd, apiUserEdit, apiUserDetail } from '@/api/user'
import { timeFormat } from '@/utils/util'
import type { PropType } from 'vue'
defineProps({
    dictData: {
        type: Object as PropType<Record<string, any[]>>,
        default: () => ({})
    }
})
const emit = defineEmits(['success', 'close'])
const formRef = shallowRef<FormInstance>()
const popupRef = shallowRef<InstanceType<typeof Popup>>()
const mode = ref('add')

/**
 * 生成用户SN（36进制短版本）
 */
function createUserSn() {
    // 获取当前时间戳
    const timestamp = Math.floor(Date.now() / 1000);
    
    // 组合SN
    const sn = `${timestamp}`;
    
    return sn;
}

// 弹窗标题
const popupTitle = computed(() => {
    return mode.value == 'edit' ? '编辑用户表' : '新增用户表'
})

// 表单数据
const formData = reactive({
    id: '',
    sn: createUserSn,
    avatar: 'resource/image/adminapi/default/default_avatar.png',
    real_name: '默认',
    nickname: '',
    account: '',
    password: '',
    mobile: '',
    sex: '1',
    channel: '1',
    is_disable: '0',
    login_ip: '',
    login_time: '',
    is_new_user: '1',
    user_money: '0',
    total_recharge_amount: '0',
})


// 表单验证
const formRules = reactive<any>({
    real_name: [{
        required: false,
        message: '请输入真实姓名',
        trigger: ['blur']
    }],
    nickname: [{
        required: true,
        message: '请输入用户昵称',
        trigger: ['blur']
    }],
    account: [{
        required: true,
        message: '请输入用户账号',
        trigger: ['blur']
    }],
    password: [{
        required: true,
        message: '请输入用户密码',
        trigger: ['blur']
    }],
    sex: [{
        required: false,
        message: '请输入用户性别: [1=男, 2=女]',
        trigger: ['blur']
    }],
    channel: [{
        required: false,
        message: '请输入注册渠道: [1-微信小程序 2-微信公众号 3-手机H5 4-电脑PC 5-苹果APP 6-安卓APP]',
        trigger: ['blur']
    }],
    is_disable: [{
        required: false,
        message: '请输入是否禁用: [0=否, 1=是]',
        trigger: ['blur']
    }],
    login_ip: [{
        required: false,
        message: '请输入最后登录IP',
        trigger: ['blur']
    }],
    login_time: [{
        required: false,
        message: '请输入最后登录时间',
        trigger: ['blur']
    }],
    is_new_user: [{
        required: false,
        message: '请输入是否是新注册用户: [1-是, 0-否]',
        trigger: ['blur']
    }]
})


// 获取详情
const setFormData = async (data: Record<any, any>) => {
    for (const key in formData) {
        if (data[key] != null && data[key] != undefined) {
            //@ts-ignore
            formData[key] = data[key]
        }
    }


}

const getDetail = async (row: Record<string, any>) => {
    const data = await apiUserDetail({
        id: row.id
    })
    setFormData(data)
}


// 提交按钮
const handleSubmit = async () => {
    await formRef.value?.validate()
    const data = { ...formData, }
    mode.value == 'edit'
        ? await apiUserEdit(data)
        : await apiUserAdd(data)
    popupRef.value?.close()
    emit('success')
}

//打开弹窗
const open = (type = 'add') => {
    mode.value = type
    // 重置表单数据
    if (type === 'add') {
        Object.assign(formData, {
            id: '',
            sn: createUserSn(),
            avatar: 'resource/image/adminapi/default/default_avatar.png',
            real_name: '默认',
            nickname: '',
            account: '',
            password: '',
            mobile: '18888888888',
            sex: '1',
            channel: '1',
            is_disable: '0',
            login_ip: '127.0.0.1',
            login_time: '1748113315',
            is_new_user: '1',
            user_money: '0',
            total_recharge_amount: '0'
        })
    }
    popupRef.value?.open()
}

// 关闭回调
const handleClose = () => {
    emit('close')
}



defineExpose({
    open,
    setFormData,
    getDetail
})
</script>

<?php
// +----------------------------------------------------------------------
// | likeadmin快速开发前后端分离管理后台（PHP版）
// +----------------------------------------------------------------------
// | 兼容旧路径：/adminapi/user/*
// +----------------------------------------------------------------------

namespace app\adminapi\controller;

use app\adminapi\lists\user\UserLists;
use app\adminapi\logic\user\UserLogic;
use app\adminapi\validate\user\AdjustUserMoney;
use app\adminapi\validate\user\UserValidate;

/**
 * 兼容旧路由的用户控制器
 * Class UserController
 * @package app\adminapi\controller
 */
class UserController extends BaseAdminController
{
    /**
     * @notes 用户列表
     * @return \think\response\Json
     */
    public function lists()
    {
        return $this->dataLists(new UserLists());
    }

    /**
     * @notes 获取用户详情
     * @return \think\response\Json
     */
    public function detail()
    {
        $params = (new UserValidate())->goCheck('detail');
        $detail = UserLogic::detail($params['id']);
        return $this->success('', $detail);
    }

    /**
     * @notes 编辑用户信息
     * @return \think\response\Json
     */
    public function edit()
    {
        $params = (new UserValidate())->post()->goCheck('edit');
        $result = UserLogic::edit($params);
        if (true === $result) {
            return $this->success('操作成功', [], 1, 1);
        }
        return $this->fail(UserLogic::getError());
    }

    /**
     * @notes 添加用户
     * @return \think\response\Json
     */
    public function add()
    {
        $params = (new UserValidate())->post()->goCheck('add');
        $result = UserLogic::add($params);
        if (true === $result) {
            return $this->success('操作成功', [], 1, 1);
        }
        return $this->fail(UserLogic::getError());
    }

    /**
     * @notes 删除用户
     * @return \think\response\Json
     */
    public function delete()
    {
        $params = (new UserValidate())->post()->goCheck('delete');
        $result = UserLogic::delete($params);
        if (true === $result) {
            return $this->success('操作成功', [], 1, 1);
        }
        return $this->fail(UserLogic::getError());
    }

    /**
     * @notes 调整用户余额
     * @return \think\response\Json
     */
    public function adjustMoney()
    {
        $params = (new AdjustUserMoney())->post()->goCheck();
        $res = UserLogic::adjustUserMoney($params);
        if (true === $res) {
            return $this->success('操作成功', [], 1, 1);
        }
        return $this->fail($res);
    }
}

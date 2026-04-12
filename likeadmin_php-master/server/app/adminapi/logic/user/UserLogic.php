<?php
// +----------------------------------------------------------------------
// | likeadmin快速开发前后端分离管理后台（PHP版）
// +----------------------------------------------------------------------
// | 欢迎阅读学习系统程序代码，建议反馈是我们前进的动力
// | 开源版本可自由商用，可去除界面版权logo
// | gitee下载：https://gitee.com/likeshop_gitee/likeadmin
// | github下载：https://github.com/likeshop-github/likeadmin
// | 访问官网：https://www.likeadmin.cn
// | likeadmin团队 版权所有 拥有最终解释权
// +----------------------------------------------------------------------
// | author: likeadminTeam
// +----------------------------------------------------------------------
namespace app\adminapi\logic\user;

use app\common\service\FileService;
use app\common\enum\user\AccountLogEnum;
use app\common\enum\user\UserEnum;
use app\common\enum\user\UserTerminalEnum;
use app\common\logic\AccountLogLogic;
use app\common\logic\BaseLogic;
use app\common\model\user\User;
use think\facade\Config;
use think\facade\Db;

/**
 * 用户逻辑层
 * Class UserLogic
 * @package app\adminapi\logic\user
 */
class UserLogic extends BaseLogic
{

    /**
     * @notes 用户详情
     * @param int $userId
     * @return array
     * @author 段誉
     * @date 2022/9/22 16:32
     */
    public static function detail(int $userId): array
    {
        $field = [
            'id', 'sn', 'account', 'nickname', 'avatar', 'real_name',
            'sex', 'mobile', 'create_time', 'login_time', 'channel',
            'user_money',
        ];

        $user = User::where(['id' => $userId])->field($field)
            ->findOrEmpty();

        $user['channel'] = UserTerminalEnum::getTermInalDesc($user['channel']);
        $user->sex = $user->getData('sex');
        return $user->toArray();
    }


    /**
     * @notes 更新用户信息
     * @param array $params
     * @return User
     * @author 段誉
     * @date 2022/9/22 16:38
     */
    public static function setUserInfo(array $params)
    {
        return User::update([
            'id' => $params['id'],
            $params['field'] => $params['value']
        ]);
    }

    /**
     * @notes 添加用户
     * @param array $params
     * @return bool
     */
    public static function add(array $params): bool
    {
        Db::startTrans();
        try {
            $passwordSalt = Config::get('project.unique_identification');
            $password = create_password($params['password'], $passwordSalt);
            $defaultAvatar = config('project.default_image.user_avatar');
            $avatar = !empty($params['avatar']) ? FileService::setFileUrl($params['avatar']) : $defaultAvatar;

            $sn = $params['sn'] ?? '';
            if (empty($sn) || User::where(['sn' => $sn])->find()) {
                $sn = User::createUserSn();
            }

            User::create([
                'sn' => $sn,
                'avatar' => $avatar,
                'real_name' => $params['real_name'] ?? '',
                'nickname' => $params['nickname'],
                'account' => $params['account'],
                'password' => $password,
                'mobile' => $params['mobile'] ?? '',
                'sex' => self::normalizeEnumValue($params['sex'] ?? 0, UserEnum::getSexDesc()),
                'channel' => self::normalizeEnumValue($params['channel'] ?? 0, UserTerminalEnum::getTermInalDesc()),
                'is_disable' => $params['is_disable'] ?? 0,
                'login_ip' => $params['login_ip'] ?? '',
                'login_time' => $params['login_time'] ?? 0,
                'is_new_user' => $params['is_new_user'] ?? 1,
                'user_money' => $params['user_money'] ?? 0,
                'total_recharge_amount' => $params['total_recharge_amount'] ?? 0,
                'create_time' => time(),
                'update_time' => time(),
            ]);

            Db::commit();
            return true;
        } catch (\Exception $e) {
            Db::rollback();
            self::setError($e->getMessage());
            return false;
        }
    }

    /**
     * @notes 编辑用户
     * @param array $params
     * @return bool
     */
    public static function edit(array $params): bool
    {
        Db::startTrans();
        try {
            if (!empty($params['field']) && array_key_exists('value', $params)) {
                self::setUserInfo($params);
                Db::commit();
                return true;
            }

            $data = [
                'id' => $params['id'],
                'sn' => $params['sn'] ?? '',
                'avatar' => !empty($params['avatar']) ? FileService::setFileUrl($params['avatar']) : '',
                'real_name' => $params['real_name'] ?? '',
                'nickname' => $params['nickname'],
                'account' => $params['account'],
                'mobile' => $params['mobile'] ?? '',
                'sex' => self::normalizeEnumValue($params['sex'] ?? 0, UserEnum::getSexDesc()),
                'channel' => self::normalizeEnumValue($params['channel'] ?? 0, UserTerminalEnum::getTermInalDesc()),
                'is_disable' => $params['is_disable'] ?? 0,
                'login_ip' => $params['login_ip'] ?? '',
                'login_time' => $params['login_time'] ?? 0,
                'is_new_user' => $params['is_new_user'] ?? 1,
                'user_money' => $params['user_money'] ?? 0,
                'total_recharge_amount' => $params['total_recharge_amount'] ?? 0,
                'update_time' => time(),
            ];

            if (!empty($params['password'])) {
                $passwordSalt = Config::get('project.unique_identification');
                $data['password'] = create_password($params['password'], $passwordSalt);
            }

            User::update($data);
            Db::commit();
            return true;
        } catch (\Exception $e) {
            Db::rollback();
            self::setError($e->getMessage());
            return false;
        }
    }

    /**
     * @notes 删除用户
     * @param array $params
     * @return bool
     */
    public static function delete(array $params): bool
    {
        try {
            User::destroy($params['id']);
            return true;
        } catch (\Exception $e) {
            self::setError($e->getMessage());
            return false;
        }
    }

    /**
     * @notes 兼容列表页展示文案回填到编辑表单后的枚举值
     * @param mixed $value
     * @param array $desc
     * @param int $default
     * @return int
     */
    private static function normalizeEnumValue($value, array $desc, int $default = 0): int
    {
        if (is_numeric($value)) {
            return (int) $value;
        }

        if (is_string($value) && '' !== trim($value)) {
            $valueMap = array_flip($desc);
            return (int) ($valueMap[$value] ?? $default);
        }

        return $default;
    }


    /**
     * @notes 调整用户余额
     * @param array $params
     * @return bool|string
     * @author 段誉
     * @date 2023/2/23 14:25
     */
    public static function adjustUserMoney(array $params)
    {
        Db::startTrans();
        try {
            $user = User::find($params['user_id']);
            if (AccountLogEnum::INC == $params['action']) {
                //调整可用余额
                $user->user_money += $params['num'];
                $user->save();
                //记录日志
                AccountLogLogic::add(
                    $user->id,
                    AccountLogEnum::UM_INC_ADMIN,
                    AccountLogEnum::INC,
                    $params['num'],
                    '',
                    $params['remark'] ?? ''
                );
            } else {
                $user->user_money -= $params['num'];
                $user->save();
                //记录日志
                AccountLogLogic::add(
                    $user->id,
                    AccountLogEnum::UM_DEC_ADMIN,
                    AccountLogEnum::DEC,
                    $params['num'],
                    '',
                    $params['remark'] ?? ''
                );
            }

            Db::commit();
            return true;

        } catch (\Exception $e) {
            Db::rollback();
            return $e->getMessage();
        }
    }

}

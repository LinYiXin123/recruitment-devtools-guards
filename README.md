# Recruitment DevTools Guards

面向已授权调试场景的 Chrome Manifest V3 扩展合集，包含 BOSS 直聘单平台版、猎聘单平台版，以及可分别控制两个平台的集成版。

> 非官方项目，与 BOSS 直聘、猎聘及其关联公司无隶属、合作或背书关系。请仅在你拥有明确授权的页面和账号环境中使用。

## 扩展目录

| 目录 | 版本 | 作用域 | 用途 |
| --- | --- | --- | --- |
| [`boss-devtools-guard/`](./boss-devtools-guard/) | 1.1.0 | `https://www.zhipin.com/*` | BOSS 直聘单平台版 |
| [`liepin-devtools-helper/`](./liepin-devtools-helper/) | 1.0.0 | `https://lpt.liepin.com/*` | 猎聘单平台版 |
| [`dual-platform-devtools-guard/`](./dual-platform-devtools-guard/) | 1.1.0 | 上述两个域名 | 双平台集成版，提供两个独立开关与毛玻璃弹窗 |

每个目录都是可独立加载的完整扩展，`manifest.json` 位于目录第一层。

## 安装

1. 下载或克隆本仓库。
2. 打开 Chrome 的 `chrome://extensions/`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择上表中的一个扩展目录，而不是仓库根目录。
6. 回到对应平台并刷新页面。

推荐直接使用 `dual-platform-devtools-guard/`。如果已经启用集成版，请停用两个单平台版，避免同一页面重复注入。

## 双平台集成版

- BOSS 直聘与猎聘分别保存和注册开关状态。
- 两个都开启时两个平台均生效；只开启一个时只注册对应平台脚本。
- 弹窗内的 `www.zhipin.com` 和 `lpt.liepin.com` 可直接打开对应网站。
- 所有代码和图片均在扩展本地，不加载远程脚本或样式。

## 权限与隐私

- 仅申请两个目标域名所需的主机权限。
- 不读取或上传密码、Cookie、聊天内容、职位数据或其他业务数据。
- 不修改登录、验证码、账号安全检查或业务 API。
- 不包含分析 SDK、遥测或远程代码。

## 更新与回滚

更新代码后，在 `chrome://extensions/` 对相应扩展点击“重新加载”，再刷新目标页面。需要回滚时，停用或移除扩展并刷新页面即可。

## 商标与许可

BOSS 直聘和猎聘名称及图标属于其各自权利人。本仓库当前未附带开源许可证；除适用法律默认允许的范围外，保留全部权利。

# 关于该项目

该项目是面向文明6二创玩家的工具集，用于自动化批量提取、查询文明6的音视频资源文件。
目前已实现的功能有
- 文明6音频文件(`.wem`)文件批量导出(`.wav`)，并输出相关`SoundBank`映射事件
- 文明6游戏数据库(`DebugGameplay.sqlite`)内国际化文本自动替换

## 安装方法

1. 克隆仓库：
    ```bash
    git clone git@github.com:imyuewu/civ6-media-tools.git
    ```

2. 安装`Node.js`并验证：
    - 按 `Win + X`，然后选择 **Windows PowerShell（管理员）** 或 **命令提示符（管理员）**。
    - 或者，在搜索框中输入 `cmd` 或 `PowerShell`，然后以管理员身份运行。
    在命令行中运行以下命令：
    ```bash
    // 安装Node.js
    winget install OpenJS.Nodejs
    ```
    完成之后，通过以下命令验证`Node.js`是否成功安装:
    ```bash
    node -v
    npm -v
    ```
    如果显示版本信息，则表示安装成功。

3. 安装`FFmpeg`（如需使用自动转音频功能需安装，否则不用）
    在命令行中运行以下命令：
    ```bash
    winget install ffmpeg
    ```
    安装完成后，你可以通过运行以下命令来检查 `ffmpeg` 是否成功安装：
    ```
    ffmpeg -version
    ```
    如果显示版本信息，则表示安装成功。

4. 安装`vgmstream-cli`
    1. 下载 `vgmstream-cli` 并解压
        访问 [vgmstream GitHub](https://github.com/vgmstream/vgmstream) 仓库。在 GitHub 页面中，点击 **Releases** 标签，找到最新版本的发布。下载适用于 Windows 系统的 `.zip` 文件。下载完成后，解压文件到你想要的目录（例如 `D:\vgmstream`）。
    2. 添加到系统环境变量：
        为了能够在命令行中方便地使用 `vgmstream-cli`，你需要将其目录添加到系统的 `PATH` 环境变量中：
        - 右键点击 **此电脑** 或 **计算机**，选择 **属性**。
        - 点击 **高级系统设置**，然后选择 **环境变量**。
        - 在系统变量中找到并选中 **Path**，点击 **编辑**。
        - 在编辑窗口中，点击 **新建**，然后添加 `vgmstream-cli` 的路径（例如：`D:\vgmstream`）。
        - 点击 **确定** 保存并退出。
    3. 验证安装：
        打开命令提示符 `CMD` 或 `PowerShell`，运行以下命令：
        ```bash
        vgmstream-cli -version
        ```
        如果显示版本信息，则表示安装成功。
## 使用方法
在使用之前，我们先要安装Node.js依赖，打开命令提示符 CMD 或 PowerShell，运行以下命令：
```bash
// 进入Node.js目录
cd "你的这个git仓库绝对路径\auto_convert_wem"
npm install
```
成功之后，就可以开始使用了。
1. 批量自动转`.wav`工具
在`auto_convert_wem`目录下执行
```bash
node index.js <输入文件夹路径> <输出文件夹路径>
```

2. Gamepaly数据库文本自动替换
在`auto_convert_wem`目录下执行
```bash
node translate_civ6_gamedb.js <目标语言> <DebugGameplay.sqlite文件路径> <DebugLocalization.sqlite文件路径>
```
`<目标语言>`参数如果没传的话默认会替换成中文，可选参数包括`'en_US', 'fr_FR', 'de_DE', 'it_IT', 'es_ES', 'ja_JP', 'ru_RU', 'pl_PL', 'ko_KR', 'zh_Hant_HK', 'zh_Hans_CN', 'pt_BR'`。

`<DebugGameplay.sqlite文件路径>` 和 `<DebugLocalization.sqlite文件路径>`默认是`auto_convert_wem\civ6_db`，你可以在`auto_convert_wem`新建一个`civ6_db`文件夹，然后把`DebugGameplay.sqlite`和`DebugLocalization.sqlite`文件丢进去。

你也可以直接修改`config.js`里面以下两行来指定数据库位置：
```nodejs
const DEFAULT_GAMEPLAY_DB_PATH = './civ6_db/DebugGameplay.sqlite'
const DEFAULT_LOCALIZATION_DB_PATH = './civ6_db/DebugLocalization.sqlite'
```

自动替换完成之后，会在`civ6_db`目录下生成`DebugGameplay_zh_Hans_CN.sqlite`，该文件就是完成文本替换后的目标数据库。
同时会在`DebugGameplay_zh_Hans_CN.sqlite`同级自动生成一个`auto_translate.log`文件，里面输出了一些替换过程中的异常，比如有的`LOC_`文件无法在`DebugLocalization.sqlite`里面找到，或者是空字符串这种。

# 秋-服务端 每日编译
# 本仓库编写方式有问题，有他人创建的类似仓库可用，因此本仓库进行归档。
本仓库是[秋-独行塔科夫计划](https://www.sp-tarkov.com/)（Aki Singleplayer Tarkov Project）中[服务端](https://dev.sp-tarkov.com/SPT-AKI/Server.git)的GitHub镜像仓库。本仓库的任务是在北京时间每日下午4:00左右从上游仓库拉取最新源码并编译。

## 如何下载

页面右侧或者底部的[**Releases**](https://github.com/sovzzz/AKI-SERVER/releases)分区下载，你也可以直接点击跳转。

文件名为*Server-日期.zip*的就是对应日期的当天编译版本。

安装与使用方法与**秋**官方发布的服务端一致

## 与秋官方服务端的区别

官方发布版是经过测试的稳定版本，而本仓库使用的是来自秋官方的最新源码，未经测试。因此，会包含比官方发布版**更新的功能**，但**出现问题**的几率更高。

未来可能会修改一些文本与图标的视觉表现，以防玩家把它与官方正式版混淆。但是服务端功能和官方最新源码一致。您可以从仓库的代码区查看有哪些文件被修改。

## 使用时的问题

您应当知悉：本仓库的发布版本虽然可以加载MOD，但其实质仍然是不稳定的“血色边缘”版。

因此请注意：如果使用本仓库的服务端，**请注意备份文件，并自行承担后果。**

如果启动器提示游戏版本和服务端不符，您应当从*Battle State Game Launcher*获取对应版本的游戏副本。您也可以坚持使用当前的游戏副本进行游玩，通常游戏能够正常运行，但仍存在**未知风险**。

## 获取源码

和官方源码获取方式相同

1.安装[Git](https://git-scm.com/)和[Git LFS](https://git-lfs.com/)

2.使用命令行

```bash
git clone https://github.com/sovzzz/AKI-SERVER.git
cd AKI-SERVER
git lfs fetch
```

## 做出贡献

本仓库不接受代码提交，您应当前往秋的官方仓库提交代码。

## 联系方式

[bilibili@育碧苏联Ubisoviet](https://space.bilibili.com/37896207)

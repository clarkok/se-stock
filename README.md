软件工程大程

----

代码规范：

* 缩进用 4 个空格
* 语句之后加分号
* 使用 Node JS 4.0 之后的版本，推荐最新版 6.2.0，使用 ES6 语法
* 异步代码用 [bluebird](http://bluebirdjs.com) 库提供的 Promise 方式
  * 已经在 `package.json` 中，直接 `require('bluebird')` 就行
* 所有 Node JS 之外的调用都用 Promise 方式完成
* 所有配置放在 `config.json` 中，这个文件不上传到 Github 上，用 `config.sample.json` 作为模板
  * 已经放在 `.gitignore` 中
* 代码 clone 之后需运行 `npm install` 安装依赖
* 依赖的包应该用 `npm install --save <package>` 来添加，这样会将依赖写入 `package.json` 中
* 各个子模块代码放在 `lib` 目录下，自己建一个文件夹
* 在 `test` 目录的相应文件夹下放置单元测试代码
* 单元测试用 [mocha](https://mochajs.org) 框架搭建
  * 已经在 `package.json` 中

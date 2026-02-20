# 智能菜谱爬虫系统

## 项目概述

一个专为"简家厨"应用开发的智能菜谱爬虫系统，支持从多个主流美食网站抓取菜谱数据，并自动分类为成人餐和婴幼儿辅食。

## 功能特性

- 🕷️ 多站点支持：豆果美食、下厨房等
- 👶 智能分类：成人/6-12月/1-3岁/3-6岁
- 🔄 自动去重：基于名称和关键食材
- 📊 营养分析：自动提取营养信息
- ⏰ 定时更新：支持Cron定时任务
- 🛡️ 反爬策略：代理池、请求频率控制

## 技术栈

- Node.js + TypeScript
- Puppeteer (浏览器自动化)
- Cheerio (HTML解析)
- MongoDB (数据存储)
- Redis (去重缓存)
- Express (API服务)

## 快速开始

```bash
# 安装依赖
cd crawler && npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置数据库连接

# 启动爬虫
npm run crawl -- --site douguo --category baby

# 启动API服务
npm run api
```

## 目录结构

```
crawler/
├── src/
│   ├── core/           # 核心爬虫框架
│   ├── spiders/        # 站点爬虫实现
│   ├── parser/         # 数据解析器
│   ├── storage/        # 存储层
│   ├── dedup/          # 去重模块
│   ├── api/            # API服务
│   └── utils/          # 工具函数
├── config/             # 配置文件
├── tests/              # 测试用例
└── docs/               # 文档
```

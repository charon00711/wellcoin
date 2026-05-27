# WellCoin

WellCoin 是一个中心化交易所纯前端 MVP，使用 React + TypeScript + Vite 构建。

## 功能

- 用户注册 / 登录（LocalStorage 模拟）
- 资产账户与模拟充值
- 现货交易：BTC/USDT、ETH/USDT、BNB/USDT
- 合约交易：杠杆、仓位、强平、资金费率
- 内存撮合引擎：OrderBook、限价单、市价单
- 实时行情模拟：盘口、ticker、最新成交
- K 线聚合：1m / 5m / 15m / 1h
- 订单管理：下单、撤单、当前委托、历史订单、成交记录

## 启动

```bash
npm install
npm run dev
```

## 测试

```bash
npm test
```

## 说明

这是演示原型，不包含真实后端、链上充值、生产级安全和合规能力。

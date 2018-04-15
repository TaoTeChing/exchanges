// const Utils = require('./utils');
// const Base = require('./../base');
// const request = require('./../../utils/request');
// const crypto = require('crypto');
const _ = require('lodash');
const kUtils = require('./utils');
const Utils = require('./../../utils');
// const md5 = require('md5');
// const error = require('./errors');
const { checkKey } = Utils;
const Spot = require('./spot');
const FUTURE_PAIRS = require('./meta/future_pairs.json');
//
class Exchange extends Spot {
  constructor(o, options) {
    super(o, options);
  }
  // /市场类
  async futureTick(o = {}) {
    const ds = await this.get('future_ticker', o);
    return kUtils.formatTick(ds);
  }
  async futureDepth(o = {}) {
    const ds = await this.get('future_depth', o);
    return kUtils.formatDepth(ds);
  }
  async futureOrderBook(o = {}) {
    const ds = await this.get('future_trades', o, true, true);
    return kUtils.formatOrderBook(ds);
  }
  async futureKlines(o = {}) {
    if (o.pair) {
      const ds = await this.futureKline(o);
      return ds;
    }
    const tasks = _.map(FUTURE_PAIRS, (pair) => {
      return this.futureKline({ ...o, pair });
    });
    const dss = await Promise.all(tasks);
    // return kUtils.formatKline(ds);
  }
  async futureKline(o = {}) {
    checkKey(o, ['pair']);
    let { pair } = o;
    const defaultFutureKlineO = {
      contract_type: 'quarter',
      interval: '1m'
    };
    o = { ...defaultFutureKlineO, ...o };
    const opt = kUtils.formatFutureKlineO(o);
    const ds = await this.get('future_kline', opt, true, true);
    if (o.isUSDT) {
      pair += 'T';
    }
    return kUtils.formatFutureKline(ds, { ...o, pair });
  }
  wsFutureTicks(o = {}, cb) {
    const { contract_type = 'quarter' } = o;
    const chanelString = kUtils.createWsChanelFutureTick(FUTURE_PAIRS, { contract_type });
    this.createWs({ timeInterval: 300, chanelString })(kUtils.formatWsFutureTick, cb);
  }
  wsFutureKlines(o = {}, cb) {
    const symbols = o.pair ? [kUtils.formatPair(o.pair, true)] : FUTURE_PAIRS;
    const { contract_type = 'quarter', interval = '1m' } = o;
    const options = {
      contract_type, interval
    };
    const chanelString = kUtils.createWsChanelFutureKline(symbols, { contract_type, interval });
    this.createWs({ timeInterval: 300, chanelString, options })(kUtils.formatWsFutureKline, cb);
  }
  wsFutureKline(o = {}, cb) {
    checkKey(o, ['pair']);
    this.wsFutureKlines(o, cb);
  }
  async futureBalances(o = {}) {
    let ds = await this.post('future_userinfo', o, true);
    ds = kUtils.formatFutureBalances(ds);
    return ds;
  }
  async moveBalance(o = {}) {
    checkKey(o, ['source', 'target', 'amount', 'coin']);
    const opt = kUtils.formatMoveBalanceO(o);
    const ds = await this.post('future_devolve', opt, true);
    return { success: ds.result };
  }
  // 市场上的交易历史
  // async futureOrderHistory(o = {}) {
  //   console.log('to do');
  //   process.exit();
  //   checkKey(o, ['pair', 'date']);
  //   const opt = kUtils.formatFutureOrderHistoryO(o);
  // }
  // 下单
  async futureOrder(o = {}) {
    checkKey(o, ['pair', 'contract_type', 'lever_rate', 'side', 'direction', 'type']);
    const opt = kUtils.formatFutureOrderO(o);
    const ds = await this.post('future_trade', opt, true);
    return {
      success: ds.result,
      order_id: ds.order_id
    };
  }
  async cancelFutureOrder(o = {}) {
    const reqs = ['pair', 'order_id', 'contract_type'];
    checkKey(o, reqs);
    const opt = _.pick(o, reqs);
    const ds = await this.post('future_cancel', opt, true);
    return {
      success: ds.result,
      order_id: ds.order_id
    };
  }
  async futureOrderInfo(o = {}) {
    const reqs = ['pair', 'order_id', 'contract_type'];
    checkKey(o, reqs);
    const opt = _.pick(o, reqs);
    const ds = await this.post('future_order_info', opt, true);
    return kUtils.formatFutureOrderInfo(ds, o);
  }
}

module.exports = Exchange;

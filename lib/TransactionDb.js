'use strict';

var imports = require('soop').imports();

var OUTS_PREFIX = 'txo-'; //txo-<txid>-<n> => [addr, btc_sat]
var SPENT_PREFIX = 'txs-'; //txs-<txid(out)>-<n(out)>-<txid(in)>-<n(in)> = ts
var ADDR_PREFIX = 'txa2-'; //txa-<addr>-<tsr>-<txid>-<n>
var END_OF_WORLD_TS = 1e13;

/**
 * Module dependencies.
 */

var bitcore = require('bitcore'),
  util = bitcore.util,
  networks = bitcore.networks,
  levelup = require('levelup'),
  async = require('async'),
  config = require('../config/config'),
  assert = require('assert'),
  Script = bitcore.Script,
  //bitcoreUtil = bitcore.util,
  buffertools = require('buffertools');

var bitcoindjs  = require('../lib/bitcoind.js');

var PoolMatch = imports.poolMatch || require('soop').load('./PoolMatch', config);

// This is 0.1.2 = > c++ version of base58-native
//var base58 = require('base58-native').base58Check;
//var encodedData = require('soop').load('bitcore/util/EncodedData', {
//  base58: base58
//});
//var versionedData = require('soop').load('bitcore/util/VersionedData', {
//  parent: encodedData
//});
//var Address = require('soop').load('bitcore/lib/Address', {
//  parent: versionedData
//});

var TransactionDb = function() {
  TransactionDb.super(this, arguments);
  this.network = config.network === 'testnet' ? networks.testnet : networks.livenet;
  this.poolMatch = new PoolMatch();
  this.safeConfirmations = config.safeConfirmations || DEFAULT_SAFE_CONFIRMATIONS;

  this._db = bitcoindjs.db; // this is only exposed for migration script
};

TransactionDb.prototype.close = function(cb) {
  return bitcoindjs.close(cb);
};

TransactionDb.prototype.drop = function(cb) {
  return cb();
};

// This is not used now
// XXX Not currently possible in bitcoind.js, but the best
// way to do it might be -txindex parsing.
TransactionDb.prototype.fromTxId = function(txid, cb) {
  return bitcoindjs.getFromTx(txid, cb);
};

// Simplified / faster Info version: No spent / outpoints info.
// XXX Not implemented in bitcoind.js
TransactionDb.prototype.fromIdInfoSimple = function(txid, cb) {
  return bitcoindjs.getTransaction(txid, cb);
};

TransactionDb.prototype.fromIdWithInfo = function(txid, cb) {
  return bitcoindjs.getTransaction(txid, function(err, tx) {
    if (err) return cb(err);
    return cb(err, {
      txid: txid,
      info: tx
    });
  });
};

// Gets address info from an outpoint
// XXX Currently not possibly to directly get a tx output.
TransactionDb.prototype.fromTxIdN = function(txid, n, cb) {
  return bitcoindjs.getTransaction(txid, function(err, tx) {
    if (err) return cb(err);
    return cb(null, tx.vout.slice(n));
  });
};

TransactionDb.prototype.cacheConfirmations = function(txouts, cb) {
  return cb();
};

// No clean way to do this from bitcoind.js - this function requires all/most
// addrs to be in the cache db.
TransactionDb.prototype.fromAddr = function(addr, opts, cb) {
  opts = opts || {};
  var rec = [];
  var ret = [];
  return bitcoindjs.getAddrTransactions(addr, function(err, addr) {
    if (err) return cb(err);
    return bitcoindjs.db.get(addr, function(err, records) {
      if (err) return cb(err);
      var blocktime = records.reduce(function(out, record) {
        return record.blocktime > out
          ? record.blocktime
          : out;
      }, 0);
      return bitcoindjs.db.createReadStream({
        start: addr,
        end: addr + '~',
        limit: opts.txLimit > 0 ? opts.txLimit : -1,
      }).on('data', function(data) {
        var addr = data.key;
        var records = data.value;
        var lblocktime = records.reduce(function(out, record) {
          return record.blocktime > out
            ? record.blocktime
            : out;
        }, 0);
        if (lblocktime >= blocktime) {
          rec.push(data);
        }
      })
      .on('error', cb)
      .on('end', function() {
        return async.forEach(function(record, next) {
          return bitcoindjs.getAddrTransactions(record.key, function(err, addr) {
            if (err) return next();
            ret.push(addr);
            return next();
          });
        }, function() {
          return cb(null, ret);
        });
      });
    });
  });
};

TransactionDb.prototype.getStandardizedTx = function(tx, time, isCoinBase) {
  // Already exists:
  // tx.txid = bitcoreUtil.formatHashFull(tx.getHash());

  var ti = 0;

  tx.vin = tx.vin.map(function(txin) {
    var ret = {
      n: ti++
    };
    if (isCoinBase) {
      ret.isCoinBase = true;
    } else {
      ret.txid = txin.txid; // prev txid
      ret.vout = txin.vout; // prev index
    }
    return ret;
  });

  var to = 0;
  tx.vout = tx.vout.map(function(txout) {
    var val;
    if (txout.scriptPubKey) {
      val = {
        addresses: txout.scriptPubKey.addresses,
        // Not here before, but let's add it for good measure
        hex: txout.scriptPubKey.hex
      };
    }
    return {
      valueSat: txout.value,
      scriptPubKey: val,
      n: txout.n
    };
  });

  tx.time = time || tx.blocktime;

  return tx;
};


TransactionDb.prototype.fillScriptPubKey = function(txouts, cb) {
  return cb();
};

// adds an unconfimed TX
TransactionDb.prototype.add = function(tx, cb) {
  return cb();
};

TransactionDb.prototype.getPoolInfo = function(txid, cb) {
  var self = this;

  return bitcoindjs.getTransaction(txid, function(err, txInfo) {
    if (err) return cb(false);
    var ret;

    if (txInfo && txInfo.isCoinBase)
      ret = self.poolMatch.match(new Buffer(txInfo.vin[0].coinbase, 'hex'));
    //if (txInfo && txInfo.vin[0].coinbase)
      //ret = self.poolMatch.match(new Buffer(txInfo.vin[0].scriptSig.hex, 'hex'));

    return cb(ret);
  });
};

module.exports = require('soop')(TransactionDb);

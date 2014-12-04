'use strict';

var imports           = require('soop').imports();
var TIP               = 'bti-';
var IN_BLK_PREFIX     = 'btx-';

/**
* Module dependencies.
*/

var config      = require('../config/config');
var bitcoindjs  = require('../lib/bitcoind.js');

var logger = require('./logger').logger;
var info   = logger.info;

var BlockDb = function(opts) {
  this.txDb =  require('./TransactionDb').default();
  this.safeConfirmations = config.safeConfirmations || DEFAULT_SAFE_CONFIRMATIONS;
  BlockDb.super(this, arguments);
};

BlockDb.prototype.close = function(cb) {
  return bitcoindjs.close(cb);
};

BlockDb.prototype.drop = function(cb) {
  return cb();
};

BlockDb.prototype._addBlockScript = function(b, height) {
  var time_key = TIMESTAMP_PREFIX +
    ( b.time || Math.round(new Date().getTime() / 1000) );

  return [
    {
      type: 'put',
      key: time_key,
      value: b.hash,
    },
    {
      type: 'put',
      key: MAIN_PREFIX + b.hash,
      value: height,
    },
    {
      type: 'put',
      key:PREV_PREFIX + b.hash,
      value: b.previousblockhash,
    },
  ];
};

BlockDb.prototype._delTxsScript = function(txs) {
  var dbScript =[];

  for(var ii in txs){
    dbScript.push({
      type: 'del',
      key: IN_BLK_PREFIX + txs[ii],
    });
  }
  return dbScript;
};

BlockDb.prototype._addTxsScript = function(txs, hash, height) {
  var dbScript =[];

  for(var ii in txs){
    dbScript.push({
      type: 'put',
      key: IN_BLK_PREFIX + txs[ii],
      value: hash+':'+height,
    });
  }
  return dbScript;
};

// Returns blockHash and height for a given txId (If the tx is on the MAIN chain).
BlockDb.prototype.getBlockForTx = function(txId, cb) {
  return bitcoindjs.getBlockByTxid(txId, cb);
};

BlockDb.prototype._changeBlockHeight = function(hash, height, cb) {
  return cb();
};

BlockDb.prototype.setBlockMain = function(hash, height, cb) {
  return cb();
};

BlockDb.prototype.setBlockNotMain = function(hash, cb) {
  return cb();
};

// adds a block (and its txs). Does not update Next pointer in
// the block prev to the new block, nor TIP pointer
//
BlockDb.prototype.add = function(b, height, cb) {
  return cb(null, true);
};

BlockDb.prototype.getTip = function(cb) {
  return bitcoindjs.getBlock(bitcoindjs.getBestBlock(), cb);
};

BlockDb.prototype.setTip = function(hash, height, cb) {
  return cb(null);
};

BlockDb.prototype.getDepth = function(hash, cb) {
  return cb(null, bitcoindjs.chainHeight);
};

//mainly for testing
BlockDb.prototype.setPrev = function(hash, prevHash, cb) {
  return cb(null, true);
};

BlockDb.prototype.getPrev = function(hash, cb) {
  return bitcoindjs.getBlock(hash, function(err, block) {
    if (err) return cb(err);
    return bitcoindjs.getBlock(block.previousblockhash, function(err, block) {
      if (err) return cb(err);
      return callback(null, block);
    });
  });
};


BlockDb.prototype.setLastFileIndex = function(idx, cb) {
  return cb();
};

// XXX Probably not necessary
BlockDb.prototype.getLastFileIndex = function(cb) {
  return cb(null, bitcoindjs.getLastFileIndex());
};

BlockDb.prototype.getNext = function(hash, cb) {
  return bitcoindjs.getBlock(hash, function(err, block) {
    if (err) return cb(err);
    return bitcoindjs.getBlock(block.nextblockhash, function(err, block) {
      if (err) return cb(err);
      return callback(null, block);
    });
  });
};

BlockDb.prototype.getHeight = function(hash, cb) {
  return cb(null, bitcoindjs.chainHeight);
};

BlockDb.prototype._setHeightScript = function(hash, height) {
  return ([{
    type: 'put',
    key: MAIN_PREFIX + hash,
    value: height,
  }]);
};

BlockDb.prototype.setNext = function(hash, nextHash, cb) {
  return cb(null);
};

// Unused
BlockDb.prototype.countConnected = function(cb) {
  return callback(null, bitcoindjs.chainHeight);
};

// .has() return true orphans also
BlockDb.prototype.has = function(hash, cb) {
  return bitcoindjs.getBlock(hash, function(err, block) {
    return cb(null, !!block);
  });
};

BlockDb.prototype.fromHashWithInfo = function(hash, cb) {
  return bitcoindjs.getBlock(hash, function(err, block) {
    if (err) return cb(err);
    block.isMainChain = block.height >= 0;
    return cb(null, {
      hash: hash,
      info: block
    });
  });
};

BlockDb.prototype.getBlocksByDate = function(start_ts, end_ts, limit, cb) {
  var options = {
    gte: +start_ts,
    lte: +end_ts,
    limit: +limit
  };
  return bitcoindjs.getBlocksByTime(options, cb);
};

// XXX Index is not the same as height, but since
// this says height as the param we'll go with that
BlockDb.prototype.blockIndex = function(height, cb) {
  return bitcoindjs.getBlockHeight(height, cb);
};

BlockDb.prototype._fillConfirmationsOneSpent = function(o, chainHeight, cb) {
  return cb();
};

BlockDb.prototype._fillConfirmationsOne = function(o, chainHeight, cb) {
  return cb();
};

BlockDb.prototype.fillConfirmations = function(txouts, cb) {
  return cb();
};

/* this is only for migration scripts */
BlockDb.prototype._runScript = function(script, cb) {
  return cb();
};

BlockDb.prototype.migrateV02 = function(cb) {
  return cb();
};

BlockDb.prototype.migrateV02cleanup = function(cb) {
  return cb();
};

module.exports = require('soop')(BlockDb);

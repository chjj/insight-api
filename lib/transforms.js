'use strict';

var bitcore = require('bitcore');

// XXX Convert to blockchain.info format for template right now.

var transforms = exports;

transforms.block = function(block, tx) {
  if (block.isMainChain != null) {
    return block;
  }

  var blockn = {};

  blockn.hash = block.hash;
  blockn.confirmations = block.confirmations || -1;
  blockn.size = block.size;
  blockn.height = block.height;
  blockn.version = block.version;
  blockn.merkleroot = block.merkleroot;

  blockn.tx = block.tx.map(function(tx) {
    return transforms.tx(tx, block).txid;
  });

  blockn.time = block.time;
  blockn.nonce = block.nonce;
  blockn.bits = block.bits;
  blockn.difficulty = block.difficulty;
  blockn.previousblockhash = block.previousblockhash;
  blockn.nextblockhash = block.nextblockhash;
  blockn.reward = block.tx[0].vout[0].value;
  blockn.isMainChain = true;

  // blockn.fee = block.fee || -1;
  // blockn.est_tx_volume = block.tx.reduce(function(total, tx) {
  //   return total + tx.vout.reduce(function(total, vout) {
  //     return total + vout.value;
  //   }, 0);
  // }, 0);
  // blockn.received_time = block.timereceived;
  // blockn.relayed_by = block.from || block.fromlocal || '0.0.0.0';

  return blockn;
};

transforms.tx = function(tx, block) {
  if (tx.valueOut) {
    return tx;
  }

  var txn = {};

  txn.txid = tx.txid;
  txn.version = tx.version;
  txn.locktime = tx.locktime;

  txn.vin = tx.vin.map(function(input, i) {
    return {
      txid: input.txid,
      vout: input.vout,
      scriptSig: input.scriptSig,
      sequence: inpurt.sequence,
      n: i,
      addr: input.coinbase ? 'Coinbase' : input.prev.addr,
      valueSat: input.prev.value,
      value: input.prev.value / 100000000,
      doubleSpendTxID: null
    };
  });

  txn.out = tx.vout.map(function(output, i) {
    return {
      value: output.value,
      n: i,
      scriptPubKey: output.scriptPubKey
      // scriptPubKey: {
      //   asm:
      //   hex:
      //   reqSigs:
      //   type:
      //   addresses: []
      // }
    };
  });

  txn.blockhash = tx.blockhash;
  txn.confirmations = block ? block.confirmations
    : (tx.confirmations != null ? tx.confirmations : -1);
  txn.time = tx.time || tx.timereceived;
  txn.blocktime = block ? block.timereceived : tx.time;
  txn.valueOut = tx.vout.reduce(function(total, vout) {
    return total + vout.value;
  }, 0);
  txn.size = tx.size;
  txn.valueIn = tx.vin.reduce(function(total, vin) {
    return total + vin.prev.value;
  }, 0);
  txn.fees = tx.fee || 0;

  // txn.relayed_by = tx.from || tx.fromlocal || '0.0.0.0';
  // txn.mine = tx.ismine;

  return txn;
};

transforms.txs = function(txs) {
  var txns = txs.map(function(tx) {
    return transforms.tx(tx);
  });

  return txns;
};

transforms.addr = function(addr) {
  if (addr.n_tx) {
    return addr;
  }

  var addrn = {};

  addrn.address = addr.address;
  // XXX Use bitcore:
  //addrn.hash160 = new Buffer(bcoin.wallet.addr2hash(addr.address)).toString('hex');
  addrn.n_tx = addr.tx.length;

  // NOTE: These should be satoshis
  addrn.total_sent = addr.tx.reduce(function(total, tx) {
    return total + tx.vin.reduce(function(total, vin) {
      return total + vin.prev.value;
    }, 0);
  }, 0);

  addrn.total_received = addr.tx.reduce(function(total, tx) {
    return total + tx.vout.reduce(function(total, vout) {
      return total + vout.value;
    }, 0);
  }, 0);

  addrn.final_balance = addrn.total_received - addrn.total_sent;

  addrn.txs = addr.tx.map(function(tx) {
    return transforms.tx(tx);
  });

  //utils.hideProperty(addrn, 'd', { __proto__: addr, txs: addr.tx });
  //utils.hideProperty(addrn, 'o', addr);

  return addrn;
};

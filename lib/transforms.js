'use strict';

var bitcore = require('bitcore');

var transforms = exports;

transforms.blocks = function(blocks) {
  if (!blocks[0] || blocks[0].txLength != null) {
    return blocks;
  }

  return blocks.map(function(block) {
    return {
      height: block.height,
      size: block.size,
      hash: block.hash,
      time: block.time || block.timereceived,
      txLength: block.tx.length
    };
  });
};

transforms.block = function(block) {
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
  if (tx.valueOut != null) {
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

transforms.txs = function(txs, block) {
  if (!txs[0] || txs[0].valueOut != null) {
    return txs;
  }

  return txs.map(function(tx) {
    return transforms.tx(tx, block);
  });
};

transforms.addr = function(addr) {
  if (addr.addrStr) {
    return addr;
  }

  var addrn = {};

  var sent = addr.tx.reduce(function(total, tx) {
    return total + tx.vin.reduce(function(total, vin) {
      return total + vin.prev.value;
    }, 0);
  }, 0);

  var received = addr.tx.reduce(function(total, tx) {
    return total + tx.vout.reduce(function(total, vout) {
      return total + vout.value;
    }, 0);
  }, 0);

  addrn.addrStr = addr.address;
  addrn.balance = (received - sent) / 100000000;
  addrn.balanceSat = received - sent;
  addrn.totalReceived = received / 100000000;
  addrn.totalReceivedSat = received;
  addrn.totalSent = sent / 100000000;
  addrn.totalSentSat = sent;
  addrn.unconfirmedBalance = 0;
  addrn.unconfirmedBalanceSat = 0;
  addrn.unconfirmedTxApperances = 0;
  addrn.txApperances =  0;
  addrn.transactions = addr.tx.map(function(tx) {
    return tx.txid;
  });

  return addrn;
};

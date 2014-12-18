'use strict';

var bitcore = require('bitcore');

// XXX Convert to blockchain.info format for template right now.

var transforms = exports;

transforms.block = function(block, tx) {
  if (block.prev_block) {
    return block;
  }

  var blockn = {};

  blockn.hash = block.hash;
  blockn.prev_block = block.previousblockhash;
  blockn.next_block = block.nextblockhash;
  blockn.mrkl_root = block.merkleroot;
  blockn.n_tx = block.tx.length;
  blockn.fee = block.fee || -1;
  blockn.main_chain = true;
  blockn.est_tx_volume = block.tx.reduce(function(total, tx) {
    return total + tx.vout.reduce(function(total, vout) {
      return total + vout.value;
    }, 0);
  }, 0);
  blockn.fee = block.fee || -1;
  blockn.height = block.height;
  blockn.time = block.time;
  blockn.received_time = block.timereceived;
  blockn.relayed_by = '0.0.0.0';
  blockn.difficulty = block.difficulty;
  blockn.bits = block.bits;
  blockn.size = block.size;
  blockn.ver = block.version;
  blockn.nonce = block.nonce;

  blockn.tx = block.tx.map(function(tx) {
    return transforms.tx(tx, block);
  });

  //utils.hideProperty(blockn, 'o', block);
  //utils.hideProperty(blockn, 'd', block);

  return blockn;
};

transforms.tx = function(tx, block) {
  if (tx.inputs) {
    return tx;
  }

  var txn = {};

  var blockHash = tx.blockhash;

  function getInputValue(input) {
    return input.prev.value;
  }

  txn.inputs = tx.vin.map(function(input, i) {
    var addr;
    if (input.coinbase) {
      //addr = 'coinbase:' + input.coinbase.substring(0, 4);
      addr = 'Coinbase';
    } else {
      addr = input.prev.address;
    }
    return {
      prev_out: {
        //txid: input.txid,
        n: input.vout || 0,
        value: input.prev.value,
        addr: addr,
        tx_index: -1,
        // type: 0
        type: input.type
      },
      script: input.scriptSig.hex
    };
  });

  txn.out = tx.vout.map(function(output, i) {
    var scriptPubKey = output.scriptPubKey || {};
    var addresses = scriptPubKey.addresses || [];
    var address = addresses[0] || 'Unknown';
    return {
      n: i,
      value: output.value,
      //addr: output.scriptPubKey.addresses[0],
      addr: address,
      tx_index: output.index || -1,
      spent: output.spent || false,
      //type: 0,
      type: output.type || 0,
      //script: output.scriptPubKey.asm
      script: scriptPubKey.asm || ''
    };
  });

  txn.ver = tx.version;
  txn.size = tx.size;
  txn.hash = tx.txid;
  txn.block = tx.blockhash;
  txn.double_spend = false;

  txn.block_height = block ? block.height : -1;

  txn.time = tx.time || tx.timereceived;

  txn.relayed_by = '0.0.0.0';

  txn.vin_sz = tx.vin.length;
  txn.vout_sz = tx.vout.length;

  txn.confirmations = block ? block.confirmations
    : (tx.confirmations != null ? tx.confirmations : -1);

  txn.mine = tx.ismine;

  //utils.hideProperty(txn, 'o', tx);
  //utils.hideProperty(txn, 'd', tx);

  return txn;
};

transforms.txs = function(txs) {
  var txns = txs.map(function(tx) {
    return transforms.tx(tx);
  });

  //utils.hideProperty(txns, 'o', txs);

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

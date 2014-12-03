module.exports = require('bitcoind.js')({
  datadir: '~/.insight-bitcoindjs',
  txindex: true,
  rpc: true
});

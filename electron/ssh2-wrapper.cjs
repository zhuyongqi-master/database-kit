// CommonJS wrapper for ssh2
const ssh2 = require('ssh2');

// Export the entire ssh2 module as default export
// module.exports = ssh2;
module.exports.default = ssh2;

// Also export individual components that might be needed
module.exports.Client = ssh2.Client;
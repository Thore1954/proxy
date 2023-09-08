#!/usr/bin/env node

process.title = 'proxy';

/**
 * Module dependencies.
 */

const args = require('args');
const pkg = require('../package');

args.option(
	'port',
	'Port number to the proxy server should bind to',
	3128,
	parseInt
)
	.option(
		'authenticate',
		'The username and password separated with a colon (user:pass)',
		'',
		String
	)
	.option(
		'local-address',
		'IP address of the network interface to send the outgoing requests through',
		'',
		String
	);

const flags = args.parse(process.argv, { name: pkg.name });
const { port, authenticate } = flags;

const http = require('http');
const setup = require('../');
const debug = require('debug')('proxy');

/**
 * Setup the HTTP "proxy server" instance.
 */

const proxy = http.createServer();
setup(proxy);

/**
 * Outbound proxy requests will use `agent: false`.
 */

debug("setting outbound proxy request's `agent` to `false`");
proxy.agent = false;

/**
 * Proxy outgoing request localAddress parameter
 */

if (flags.localAddress) {
	proxy.localAddress = flags.localAddress;
}

/**
 * Proxy authenticate function.
 */

if (authenticate) {
	debug('setting `authenticate()` function for: "%s"', authenticate);
	proxy.authenticate = function(req, fn) {
		debug('authenticate(): "%s"', authenticate);

		// parse the "Proxy-Authorization" header
		var auth = req.headers['proxy-authorization'];
		if (!auth) {
			// optimization: don't invoke the child process if no
			// "Proxy-Authorization" header was given
			return fn(null, false);
		}
		var parts = auth.split(' ');
		if (parts[0] !== 'Basic') {
			return fn(null, false);
		}
		var decoded = new Buffer(parts[1], 'base64').toString('utf8');

		fn(null, decoded == authenticate);
	};
}

/**
 * Bind to port.
 */

proxy.listen(port, function() {
	console.log(
		'HTTP(s) proxy server listening on port %d',
		this.address().port
	);
});

/**
 * Created by Michel Verbraak (info@1st-setup.nl).
 */

var util = require('util');
var Cul = require('cul');

module.exports = function (RED) {

	/**
	 * ====== CUL-CONTROLLER ================
	 * Holds configuration for culjs,
	 * initializes new culjs connections
	 * =======================================
	 */
	function CULControllerNode(config) {

		RED.nodes.createNode(this, config);

		this.name = config.name;
		this.serialport = config.serialport;
		this.baudrate = parseInt(config.baudrate);
		this.mode = config.mode;
		this.parse = config.parse;
		this.init = config.init;
		this.coc = config.coc;
		this.scc = config.scc;
		this.rssi = config.rssi;
		this.debug = config.debug;

		this.culConn = null;

		this.nodeList = {};
		this.nodeCount = 0;

		var controller = this;

		this.addNode = function (newNode) {
			// First check if it is not yet in the list
			if (controller.nodeList[newNode.id]) {
				controller.log('Node "' + newNode.id + '" already connected to controller "' + controller.name + '" so will not add again.');
			} else {
				controller.log('Adding node "' + newNode.id + '" to controller "' + controller.name + '".');
				controller.nodeList[newNode.id] = newNode;

				if (controller.nodeCount === 0) {
					controller.connect();
				}
				controller.nodeCount++;
			}
		}

		this.removeNode = function (oldNode) {
			if (controller.nodeList[oldNode.id]) {
				delete controller.nodeList[oldNode.id];
				controller.nodeCount--;

				if (controller.nodeCount === 0) {
					controller.disconnect();
				}
			} else {
				controller.log('Node "' + oldNode.id + '" is not connected to controller "' + controller.name + '" so cannot remove.');
			}
		}

		this.connect = function () {
			if (controller.culConn) {
				controller.log('Controller "' + controller.name + '" already connect not going to reconnect.');
			}

			controller.log('Connecting to cul device at ' + controller.serialport + '@' + controller.baudrate + ' in mode[' + controller.mode + ']');
			controller.culConn = null;

			Object.values(controller.nodeList).forEach(node => node.emit("connecting"));
			
			controller.log("serialport:" + controller.serialport);
			controller.log("baudrate:" + controller.baudrate);
			controller.log("mode:" + controller.mode);
			controller.log("parse:" + controller.parse);
			controller.log("init:" + controller.init);
			controller.log("coc:" + controller.coc);
			controller.log("scc:" + controller.scc);
			controller.log("rssi:" + controller.rssi);
			controller.log("debug:" + controller.debug);

			controller.culConn = new Cul({
				serialport: controller.serialport,
				baudrate: controller.baudrate,
				mode: controller.mode,
				parse: controller.parse,
				init: controller.init,
				coc: controller.coc,
				scc: controller.scc,
				rssi: controller.rssi,
				debug: controller.debug
			});

			// ready event is emitted after serial connection is established and culfw acknowledged data reporting
			controller.culConn.on('ready', function () {
				// send arbitrary commands to culfw
				controller.log('Controller "' + controller.name + '" ready.');

				Object.values(controller.nodeList).forEach(node => node.emit("connected"));

				// Get version info of cul
				controller.culConn.write('V');
			});

			controller.culConn.on('data', function (raw, message) {
				Object.values(controller.nodeList).forEach(node => node.emit("data", message));
			});

			controller.culConn.on('error', function (err) {
				if (err == "Error: Error Resource temporarily unavailable Cannot lock port") {
					controller.log(`Cul unavailable (${err}). Will retry to open in 500ms.`)
					setTimeout(controller.connect,500);
				}
			});
		}

		this.disconnect = function () {
			controller.log('Controller "' + controller.name + '" disconnected as we have no nodes connected.');
		}

		this.on("close", function () {
			controller.log('disconnecting from cul device at ' + controller.serialport + '@' + controller.baudrate + ' in mode[' + controller.mode + ']');
			if (controller.culConn) {
				controller.log('Going to close ' + controller.serialport + '@' + controller.baudrate + ' in mode[' + controller.mode + ']');
				if (controller.culConn && controller.culConn.close) {
					controller.log('Closing ' + controller.serialport + '@' + controller.baudrate + ' in mode[' + controller.mode + ']');
					controller.culConn.close(() => {
						Object.values(controller.nodeList).forEach(node => node.emit("disconnected"));
						controller.log('Closed ' + controller.serialport + '@' + controller.baudrate + ' in mode[' + controller.mode + ']');
					});
					

				}
			}
		});

		this.raw = function(rawData, cb) {
			if (controller.culConn) {
				controller.culConn.write(rawData, cb);
			}
		}
		this.cmd = function(payload, cb) {
			if (controller.culConn) {
				controller.culConn.cmd.apply(null, payload, cb);
			}
			else {
				if (cb) {
					cb();
				}
			}
		}
	}

	RED.nodes.registerType("cul-controller", CULControllerNode);

	/**
	 * ====== CUL-OUT =======================
	 * Sends message to cul device from
	 * messages received via node-red flows
	 * =======================================
	 */
	function CULOut(config) {
		RED.nodes.createNode(this, config);
		this.name = config.name;
		this.controller = RED.nodes.getNode(config.controller);
		var node = this;

		this.on("close", function () {
			node.controller && node.controller.removeNode && node.controller.removeNode(node);
		});

		if (node.controller && node.controller.addNode) {
			node.log("Going to add:" + config.name);
			node.controller.addNode(node);
		}

		this.on("input", function (msg, send, done) {
			if (!msg) return;

			if (!msg.hasOwnProperty('topic')) return;
			if (!msg.hasOwnProperty('payload')) return;

			switch (msg.topic) {
				case "raw":
					node.controller.raw(msg.payload, done);
					break;
				case "cmd":
					node.controller.cmd(msg.payload, done);
					break;
			}
		});

		this.on("close", function () {
			node.log('culout.close');
		});

		node.status({
			fill: "yellow",
			shape: "dot",
			text: "inactive"
		});

		this.nodeStatusConnecting = function () {
			node.status({
				fill: "green",
				shape: "ring",
				text: "connecting"
			});
		}

		this.nodeStatusConnected = function () {
			node.status({
				fill: "green",
				shape: "dot",
				text: "connected"
			});
		}

		this.nodeStatusDisconnected = function () {
			node.status({
				fill: "red",
				shape: "dot",
				text: "disconnected"
			});
		}

		this.on("connecting", this.nodeStatusConnecting);
		this.on("connected", this.nodeStatusConnected);
		this.on("disconnected", this.nodeStatusDisconnected);
	}

	//
	RED.nodes.registerType("cul-out", CULOut);

	/**
	 * ====== CUL-IN ========================
	 * Handles incoming CUL messages, injecting
	 * json into node-red flows
	 * =======================================
	 */
	function CULIn(config) {
		RED.nodes.createNode(this, config);
		this.name = config.name;
		var node = this;

		this.controller = RED.nodes.getNode(config.controller);

		/* ===== Node-Red events ===== */
		this.on("input", function (msg) {
			if (msg != null) {

			}
		});

		this.on("close", function () {
			node.controller && node.controller.removeNode && node.controller.removeNode(node);
		});

		if (node.controller && node.controller.addNode) {
			node.log("Going to add:" + config.name);
			node.controller.addNode(node);
		}

		this.nodeStatusConnecting = function () {
			node.status({
				fill: "green",
				shape: "ring",
				text: "connecting"
			});
		}

		this.nodeStatusConnected = function () {
			node.status({
				fill: "green",
				shape: "dot",
				text: "connected"
			});
		}

		this.nodeStatusDisconnected = function () {
			node.status({
				fill: "red",
				shape: "dot",
				text: "disconnected"
			});
		}

		this.onData = function (message) {
			node.log('Message from CUL:' + JSON.stringify(message));
			node.send({
				topic: 'cul:message',
				payload: message
			});
		};

		this.on("connecting", this.nodeStatusConnecting);
		this.on("connected", this.nodeStatusConnected);
		this.on("disconnected", this.nodeStatusDisconnected);

		this.on("data", this.onData);

		this.on("error", function (msg) {});

	}

	//
	RED.nodes.registerType("cul-in", CULIn);
}

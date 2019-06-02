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

			controller.culConn = new Cul({
				serialport: controller.serialport,
				baudrate: controller.baudrate,
				mode: controller.mode,
				parse: controller.parse,
				init: controller.init,
				coc: controller.coc,
				scc: controller.scc,
				rssi: controller.rssi
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

		}

		this.disconnect = function () {
			controller.log('Controller "' + controller.name + '" disconnected as we have no nodes connected.');
		}

		this.on("close", function () {
			controller.log('disconnecting from cul device at ' + controller.serialport + '@' + controller.baudrate + ' in mode[' + controller.mode + ']');
			if (controller.culConn && controller.culConn.close) {
				controller.culConn.close();
				Object.values(controller.nodeList).forEach(node => node.emit("disconnected"));
			}
		});
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
		this.ctrl = RED.nodes.getNode(config.controller);
		var node = this;
		//node.log('new CUL-OUT, config: ' + util.inspect(config));
		this.on("input", function (msg) {
			node.log('culout.onInput, msg[' + util.inspect(msg) + ']');
			if (!(msg && msg.hasOwnProperty('payload'))) return;
			var payload;
			if (typeof (msg.payload) === "object") {
				payload = msg.payload;
			} else if (typeof (msg.payload) === "string") {
				payload = JSON.parse(msg.payload);
			}
			if (payload == null) {
				node.log('culout.onInput: illegal msg.payload!');
				return;
			}
			/*            this.groupAddrSend(payload.dstgad, payload.value, payload.dpt, action, function (err) {
			                if (err) {
			                    node.error('groupAddrSend error: ' + util.inspect(err));
			                }
			            });
			*/
		});
		this.on("close", function () {
			node.log('culout.close');
		});

		node.status({
			fill: "yellow",
			shape: "dot",
			text: "inactive"
		});

		function nodeStatusConnected() {
			node.status({
				fill: "green",
				shape: "dot",
				text: "connected"
			});
		}

		function nodeStatusDisconnected() {
			node.status({
				fill: "red",
				shape: "dot",
				text: "disconnected"
			});
		}

		function nodeStatusConnecting() {
			node.status({
				fill: "green",
				shape: "ring",
				text: "connecting"
			});
		}
		/*
		        this.groupAddrSend = function (dstgad, value, dpt, action, callback) {
		            dpt = dpt.toString();
		            if (action !== 'write')
		                throw 'Unsupported action[' + action + '] inside of groupAddrSend';
		            node.log('groupAddrSend action[' + action + '] dstgad:' + dstgad + ', value:' + value + ', dpt:' + dpt);
		            switch (dpt) {
		                case '1': //Switch
		                    value = (value.toString() === 'true' || value.toString() === '1')
		                    break;
		                case '9': //Floating point
		                    value = parseFloat(value);
		                    break;
		                case '5':    //8-bit unsigned value               1 Byte                  EIS 6         DPT 5    0...255
		                case '5.001':    //8-bit unsigned value               1 Byte                  DPT 5.001    DPT 5.001    0...100
		                case '6':    //8-bit signed value                 1 Byte                  EIS 14        DPT 6    -128...127
		                case '7':    //16-bit unsigned value              2 Byte                  EIS 10        DPT 7    0...65535
		                case '8':    //16-bit signed value                2 Byte                  DPT 8         DPT 8    -32768...32767
		                case '12':   //32-bit unsigned value              4 Byte                  EIS 11        DPT 12    0...4294967295
		                case '13':   //32-bit signed value                4 Byte                  DPT 13        DPT 13    -2147483648...2147483647
		                case '17':   //Scene                              1 Byte                  DPT 17        DPT 17    0...63
		                case '20':   //HVAC                               1 Byte                  DPT 20        DPT 20    0..255
		                    value = parseInt(value);
		                    break;
		                default:
		                    throw 'Unsupported dpt[' + dpt + '] inside groupAddrSend of knx node'

		            }

		            if (!this.ctrl)
		                node.error('Cannot proceed groupAddrSend, cause no controller-node specified!');
		            else
		            // init a new one-off connection from the effectively singleton KnxController
		            // there seems to be no way to reuse the outgoing conn in adreek/node-culjs
		                this.ctrl.initializeKnxConnection(function (connection) {

		                    if (connection.connected)
		                        nodeStatusConnected();
		                    else
		                        nodeStatusDisconnected();
		                    connection.removeListener('connecting', nodeStatusConnecting);
		                    connection.on('connecting', nodeStatusConnecting);
		                    connection.removeListener('connected', nodeStatusConnected);
		                    connection.on('connected', nodeStatusConnected);
		                    connection.removeListener('disconnected', nodeStatusDisconnected);
		                    connection.on('disconnected', nodeStatusDisconnected);

		                    try {
		                        node.log("sendAPDU: " + util.inspect(value));
		                        connection.Action(dstgad.toString(), value, null);
		                        callback && callback();
		                    }
		                    catch (err) {
		                        node.error('error calling groupAddrSend: ' + err);
		                        callback(err);
		                    }
		                });
		        }
		*/
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

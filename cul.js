/**
 * Created by Michel Verbraak (info@1st-setup.nl).
 */

var util = require('util');
var Cul = require('cul');

module.exports = function (RED) {

    var culjs = require('cul.js');

    /**
     * ====== CUL-CONTROLLER ================
     * Holds configuration for culjs,
     * initializes new culjs connections
     * =======================================
     */
    function CULControllerNode(config) {
        RED.nodes.createNode(this, config);

/*
            name: {value: ""},
            serialport: {value: "/dev/ttyAMA0", required: true},
            baudrate: {value: 9600, required: true},
            mode: {value: "SlowRF", required: true},
            parse: {value: "true", required: true},
            init: {value: "true", required: true},
            coc: {value: "false", required: true},
            scc: {value: "false", required: true},
            rssi: {value: "true", required: true},
*/
        this.name = config.name;
        this.serialport = config.serialport;
        this.baudrate = config.baudrate;
        this.mode = config.mode;
        this.parse = config.parse === "true" ? true : false;
        this.init = config.init === "true" ? true : false;
        this.coc = config.coc === "true" ? true : false;
        this.scc = config.scc === "true" ? true : false;
        this.rssi = config.rssi === "true" ? true : false;

        this.culConn = null;
        var node = this;
        //node.log("new CULControllerNode, config: " + util.inspect(config));

        /**
         * Initialize an culjs socket, calling the handler function
         * when successfully connected, passing it the culjs connection
         */
        this.initializeCULConnection = function (handler) {
            if (node.culConn) {
                node.log('already connected to cul device at ' + node.serialport + '@' + node.baudrate + ' in mode[' + node.mode + ']');
                if (handler && (typeof handler === 'function'))
                    handler(node.culConn);
                return node.culConn;
            }
            node.log('connecting to to cul device at ' + node.serialport + '@' + node.baudrate + ' in mode[' + node.mode + ']');
            node.culConn = null;
	    node.culConn = new Cul({
		serialport: node.serialport,
		baudrate: node.baudrate,
		mode: node.mode,
		parse: node.parse,
		init: node.init,
		coc: node.coc,
		scc: node.scc,
		rssi: node.rssi
	    });

	    node.culConn.on('ready', function() {
		node.log('Knx: successfully connected to cul device at ' + node.serialport + '@' + node.baudrate + ' in mode[' + node.mode + ']');
		handler(node.culConn);
	    };

            return node.culConn;
        };
        this.on("close", function () {
            node.log('disconnecting from culjs server at cul device at ' + node.serialport + '@' + node.baudrate + ' in mode[' + node.mode + ']');
            node.culConn && node.culConn.close && node.culConn.close();
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
            if (typeof(msg.payload) === "object") {
                payload = msg.payload;
            } else if (typeof(msg.payload) === "string") {
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

        node.status({fill: "yellow", shape: "dot", text: "inactive"});

        function nodeStatusConnected() {
            node.status({fill: "green", shape: "dot", text: "connected"});
        }

        function nodeStatusDisconnected() {
            node.status({fill: "red", shape: "dot", text: "disconnected"});
        }

        function nodeStatusConnecting() {
            node.status({fill: "green", shape: "ring", text: "connecting"});
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
    }
*/
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
        this.connection = null;
        var node = this;
        //node.log('new CUL-IN, config: ' + util.inspect(config));
        var culjsController = RED.nodes.getNode(config.controller);
        /* ===== Node-Red events ===== */
        this.on("input", function (msg) {
            if (msg != null) {

            }
        });
        var node = this;
        this.on("close", function () {
            if (node.receiveEvent && node.connection)
                node.connection.removeListener('event', node.receiveEvent);
            if (node.receiveStatus && node.connection)
                node.connection.removeListener('status', node.receiveStatus);
        });

        function nodeStatusConnecting() {
            node.status({fill: "green", shape: "ring", text: "connecting"});
        }

        function nodeStatusConnected() {
            node.status({fill: "green", shape: "dot", text: "connected"});
        }

        function nodeStatusDisconnected() {
            node.status({fill: "red", shape: "dot", text: "disconnected"});
        }

        node.receiveEvent = function (gad, data, datagram) {
            node.log('knx event gad[' + gad + ']data[' + data.toString('hex') + ']');
            node.send({
                topic: 'knx:event',
                payload: {
                    'srcphy': datagram.source_address,
                    'dstgad': gad,
                    'dpt': 'no_dpt',
                    'value': data.toString(),
                    'type': 'event'
                }
            });
        };
        node.receiveStatus = function (gad, data, datagram) {
            node.log('knx status gad[' + gad + ']data[' + data.toString('hex') + ']');
            node.send({
                topic: 'knx:status',
                payload: {
                    'srcphy': datagram.source_address,
                    'dstgad': gad,
                    'dpt': 'no_dpt',
                    'value': data.toString(),
                    'type': 'status'
                }
            });
        };

//		this.on("error", function(msg) {});

        /* ===== culjs events ===== */
        // initialize incoming KNX event socket (openGroupSocket)
        // there's only one connection for culjs-in:
/*        culjsController && culjsController.initializeKnxConnection(function (connection) {
            node.connection = connection;
            node.connection.removeListener('event', node.receiveEvent);
            node.connection.on('event', node.receiveEvent);
            node.connection.removeListener('status', node.receiveStatus);
            node.connection.on('status', node.receiveStatus);

            if (node.connection.connected)
                nodeStatusConnected();
            else
                nodeStatusDisconnected();
            node.connection.removeListener('connecting', nodeStatusConnecting);
            node.connection.on('connecting', nodeStatusConnecting);
            node.connection.removeListener('connected', nodeStatusConnected);
            node.connection.on('connected', nodeStatusConnected);
            node.connection.removeListener('disconnected', nodeStatusDisconnected);
            node.connection.on('disconnected', nodeStatusDisconnected);
        });
*/    }

    //
    RED.nodes.registerType("cul-in", CULIn);
}


CUL node for node-red.
======================

It contains a controller node which is defined by either the cul-in or cul-out node. It is not a node you can place on your flow.

The cul-in node you can use to receive messages from your cul device.

The cul-out node you can use to send messages to your cul device.

Example flow:
```json
[{"id":"4bd73285.cdb2fc","type":"tab","label":"CUL examples","disabled":false,"info":""},{"id":"3786f92c.1bf35e","type":"cul-out","z":"4bd73285.cdb2fc","name":"cul-out example","address":"123456","controller":"3a1129af.24462e","x":460,"y":80,"wires":[]},{"id":"f1a7bf61.92ca68","type":"inject","z":"4bd73285.cdb2fc","name":"FS20 cmd","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"cmd","payload":"[\"FS20\",\"2341 2131\",\"1112\",\"on\"]","payloadType":"json","x":250,"y":80,"wires":[["3786f92c.1bf35e"]]},{"id":"401308c5.c2d16","type":"cul-in","z":"4bd73285.cdb2fc","name":"cul-in example","controller":"3a1129af.24462e","x":260,"y":180,"wires":[["3f1e5d3a.8a2502"]]},{"id":"3f1e5d3a.8a2502","type":"debug","z":"4bd73285.cdb2fc","name":"cul message","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","statusVal":"","statusType":"auto","x":430,"y":180,"wires":[]},{"id":"27ab8085.9b311","type":"inject","z":"4bd73285.cdb2fc","name":"FS20 raw","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"raw","payload":"F6C480111","payloadType":"str","x":240,"y":120,"wires":[["3786f92c.1bf35e"]]},{"id":"3a1129af.24462e","type":"cul-controller","name":"scc","serialport":"/dev/ttyAMA0","baudrate":"38400","mode":"MORITZ","parse":true,"init":true,"coc":false,"scc":true,"rssi":false,"debug":true}]
```

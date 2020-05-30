'use strict'

const simulate = require('simulate-network-conditions')
const createSender = require('./lib/sender')
const createReceiver = require('./lib/receiver')

const sender = createSender()
const receiver = createReceiver()

// sender -> network -> receiver
sender.pipe(simulate(simulate.basicLatency(500))).pipe(receiver)
// receiver -> network -> sender
receiver.pipe(simulate(simulate.basicLatency(500))).pipe(sender)

// sender.on('round-trip-time', (rtt) => {
// 	console.log('round trip time', rtt, 'ms')
// })
receiver.on('message', (newState) => {
	console.log('new state', newState + '')
})
// receiver.on('sender-address-changed', (newSenderAddress) => {
// 	console.log('sender address changed', newSenderAddress)
// })

let i = 0
const send = () => {
	sender.send(Buffer.from(`data ${i++}`, 'utf8'))
	setTimeout(send, 10 + Math.random() * 1000)
}
send()

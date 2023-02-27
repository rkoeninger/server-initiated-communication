const express = require('express')
const expressStatic = require('express-static')
const expressWs = require('express-ws')
const webpush = require('web-push')
const bodyParser = require('body-parser')
const vapidKeys = {
    publicKey: 'BDuKsTaDBhnc5wQ1RXzNUueJgwIMbLEwKeDU-_3ezXjNOQjyY1GL_fLBf8mL-l5LZfqdrSqMrF46rvS-jRylpe4',
    privateKey: 'o2CFkIdwCRYOS_hcRsnGfndXep7txFZfJfLF339h-Wk'
}
webpush.setVapidDetails(
    'mailto:rckoeninger@winsupplyinc.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
)
const app = express()
expressWs(app)
const port = 3000
const subscriptions = new Map()
const nub = collection => [...(new Set(collection))]
const send = (recipient, sender, message, meta = []) => {
    const payload = JSON.stringify({ sender, recipient, message, meta: nub(meta) })
    const subscription = subscriptions.get(recipient)
    if (subscription.protocol === 'push') {
        webpush.sendNotification(subscription, payload).catch(console.error)
    } else if (subscription.protocol === 'sse') {
        subscription.response.write(`data: ${payload}\n\n`)
    } else if (subscription.protocol === 'ws') {
        subscription.ws.send(payload)
    }
}
const broadcast = (sender, message, meta = []) => {
    for (const recipient of subscriptions.keys()) {
        send(recipient, sender, message, [...meta, 'broadcast'])
    }
}
const signup = (username, subscription) => {
    subscriptions.set(username, subscription)
    const reply = `${username} subscribed via ${subscription.protocol}`
    broadcast('server', reply, ['subscription', 'automated', subscription.protocol])
    return { message: reply }
}
const publish = (recipient, sender, message) => {
    if (!recipient || recipient.length === 0) {
        broadcast(sender, message, ['user-authored'])
        return { message: 'published' }
    } else if (subscriptions.has(recipient)) {
        send(recipient, sender, message, ['user-authored', 'whispered'])
        return { message: 'published' }
    } else {
        const reply = `no recipient named ${recipient}`
        send(sender, 'server', reply, ['automated'])
        return { message: reply }
    }
}
app.use(bodyParser.json())
app.get('/favicon.ico', (_request, response) => { response.redirect('/favicon.png') })
app.use((request, _response, next) => {
    if (request.path.indexOf('.') < 0) {
        console.log(request.url, request.body)
    }
    next()
})
app.get('/publickey', (_request, response) => { response.send(vapidKeys.publicKey) })
app.post('/subscribe', (request, response) => {
    const { username, subscription } = request.body
    for (const [name, sub] of subscriptions.entries()) {
        if (sub.endpoint === subscription.endpoint) {
            subscriptions.delete(name)
        }
    }
    response.status(201).json(signup(username, { ...subscription, protocol: 'push' }))
})
app.get('/events', (request, response) => {
    const username = request.query['username']
    response.writeHead(200, headers={
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    })
    response.write(`data: ${JSON.stringify(signup(username, { protocol: 'sse', response }))}\n\n`)
})
app.ws('/socket', (ws, request) => {
    const username = request.query['username']
    ws.on('message', event => {
        const { recipient, sender, message } = JSON.parse(event.data)
        ws.send(JSON.stringify(publish(recipient, sender, message)))
    })
    ws.send(JSON.stringify(signup(username, { protocol: 'ws', ws })))
})
app.post('/publish', (request, response) => {
    const { recipient, sender, message } = request.body
    response.status(201).json(publish(recipient, sender, message))
})
app.get('/status', (_request, response) => {
    response.json(Object.fromEntries([...(subscriptions.entries())].map(([u, s]) => [u, s.protocol])))
})
app.use(expressStatic('./'))
app.listen(port, () => { console.log(`app listening at http://localhost:${port}/index.html`) })

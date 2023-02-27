console.log('loaded service worker')

self.addEventListener('push', event => {
    const data = event.data.json()
    console.log('received push notification', data)
    self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length === 0) {
            console.warn('no clients')
        }
        for (const client of clients) {
            console.log('posting back to client ', client)
            client.postMessage(data)
        }
    })
})

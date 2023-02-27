document.addEventListener('DOMContentLoaded', () => {
    const [protocolSelect, usernameInput, subscribeButton, messageInput,
           recipientInput, publishButton, messageList] =
        ['protocol-select', 'username-input', 'subscribe-button', 'message-input',
         'recipient-input', 'publish-button', 'message-list'].map(x => document.getElementById(x))
    const getText = url => fetch(url).then(x => x.text())
    const postJson = (url, body) =>
        fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'content-type': 'application/json' }
        })
        .then(x => x.json())
        .then(x => ({ ...x, protocol: 'http' }))
    const show = content => {
        console.log(content)
        const li = document.createElement('li')
        li.innerHTML = JSON.stringify(content)
        messageList.appendChild(li)
        return content
    }
    let ws
    subscribeButton.addEventListener('click', async () => {
        const username = usernameInput.value
        if (protocolSelect.value === 'push') {
            const publicKey = show(await getText('/publickey'))
            const registration = show(await navigator.serviceWorker.register('./worker.js', { scope: '/' }))
            await navigator.serviceWorker.ready
            const subscription = show(await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: publicKey
            }))
            navigator.serviceWorker.addEventListener('message', event => {
                show({ ...event.data, protocol: 'push' })
            })
            show(await postJson('/subscribe', { username, subscription }))
        } else if (protocolSelect.value === 'sse') {
            const source = new EventSource(`/events?username=${username}`)
            source.addEventListener('open', () => show('event stream open'))
            source.addEventListener('error', () => show('event stream error'))
            source.addEventListener('message', event => {
                show({ data: JSON.parse(event.data), protocol: 'sse' })
            })
        } else if (protocolSelect.value === 'ws') {
            const host = new URL(document.baseURI).host
            ws = new WebSocket(`ws://${host}/socket?username=${username}`)
            ws.addEventListener('open', () => show('socket open'))
            ws.addEventListener('close', () => show('socket closed'))
            ws.addEventListener('message', event => {
                show({ data: JSON.parse(event.data), protocol: 'ws' })
            })
        }
        protocolSelect.disabled = usernameInput.disabled = subscribeButton.disabled = true
        recipientInput.disabled = messageInput.disabled = publishButton.disabled = false
    })
    publishButton.addEventListener('click', async () => {
        const sender = usernameInput.value
        const recipient = recipientInput.value
        const message = messageInput.value
        const data = { recipient, sender, message }
        if (protocolSelect.value === 'ws') {
            ws.send(JSON.stringify(data))
        } else {
            show(await postJson('/publish', data))
        }
    })
})

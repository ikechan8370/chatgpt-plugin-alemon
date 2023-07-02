import {ALRedis} from "alemon-redis";

export async function upsertMessage (message) {
    await ALRedis.set(`CHATGPT:MESSAGE:${message.id}`, JSON.stringify(message))
}

export async function getMessageById (id) {
    const messageStr = await ALRedis.get(`CHATGPT:MESSAGE:${id}`)
    return JSON.parse(messageStr)
}
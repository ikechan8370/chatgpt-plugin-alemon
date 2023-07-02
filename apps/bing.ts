import {Messagetype, plugin, segment} from "alemon";
import logger from "../utils/logger";
import {ALRedis} from 'alemon-redis'
import {Config} from "../utils/config";
import {ConversationRecord} from "../types/conversation";
import SydneyAIClient from "../client/bing/SydneyAIClient";
import {KeyvFile} from 'keyv-file'
import {SydneySendMessageOption} from "../types/bing";
import _ from 'lodash'

export class bing extends plugin {


    constructor() {
        super({
            rule: [
                {
                    reg: /^\/bing/,
                    fnc: "bing",
                },
            ],
        });
    }

    async bing(e: Messagetype): Promise<boolean> {
        let prompt = e.msg.content.replace(/^\/bing/, '')
        logger.info('chat bing mode, prompt: ' + prompt)
        try {
            const cacheOptions = {
                namespace: Config.toneStyle,
                store: new KeyvFile({ filename: 'cache.json' })
            }
            const bingAIClient = new SydneyAIClient({
                userToken: Config.bingtoken, // "_U" cookie from bing.com
                debug: Config.debug,
                cache: cacheOptions,
                user: e.msg.author.id,
                proxy: Config.proxy
            })
            const key = `BING:CONVERSATIONS:${e.msg.author.id}`
            const ctime = new Date()
            const previousConversation: string = (key ? await ALRedis.get(key) : null) || JSON.stringify({
                sender: e.msg.user,
                ctime,
                utime: ctime,
                num: 0,
                conversation: {}
            })
            const previousConversationObj: ConversationRecord = JSON.parse(previousConversation)
            const conversation = {
                conversationId: previousConversationObj.conversation?.conversationId,
                parentMessageId: previousConversationObj.parentMessageId,
                clientId: previousConversationObj.clientId,
                invocationId: previousConversationObj.invocationId,
                conversationSignature: previousConversationObj.conversationSignature,
                bingToken: previousConversationObj.bingToken
            }
            // Sydney不实现上下文传递，删除上下文索引
            delete conversation.clientId
            delete conversation.invocationId
            delete conversation.conversationSignature
            const opt: SydneySendMessageOption = _.cloneDeep(conversation) || {}
            opt.toneStyle = Config.toneStyle
            opt.context = Config.sydneyContext
            let sendMsgRes
            let retry = 5
            while (retry > 0) {
                try {
                    sendMsgRes = await sendMsg(bingAIClient, prompt, opt)
                    break
                } catch (err) {
                    logger.error('bing对话失败，准备重试', err)
                    retry--
                }
            }
            if (!sendMsgRes) {
                await e.reply('对话出现错误')
                return false
            }
            logger.debug(sendMsgRes)
            previousConversationObj.parentMessageId = sendMsgRes.messageId
            previousConversationObj.conversation.conversationId = sendMsgRes.conversationId
            previousConversationObj.num = previousConversationObj.num + 1
            previousConversationObj.utime = new Date()
            await ALRedis.set(key, JSON.stringify(previousConversationObj))
            const obj = segment.reply(e.msg.id);
            // const obj1 = segment.embed(
            //     'Sydney的回复',
            //     prompt,
            //     "https://q1.qlogo.cn/g?b=qq&nk=330265814&s=0",
            //     sendMsgRes.response.split('\n').filter(t => !!t)
            // );
            await e.reply(sendMsgRes.response.split('\n').filter(t => !!t), obj);
        } catch (err) {
            logger.error('error happened when chatting with bing mode', err)
            const obj = segment.reply(e.msg.id);
            await e.reply(err.message, obj);
        }
        return false
    }
}

async function sendMsg (client, prompt, opt) {
    logger.debug(JSON.stringify({prompt, opt}))
    return await client.sendMessage(prompt, opt)
}
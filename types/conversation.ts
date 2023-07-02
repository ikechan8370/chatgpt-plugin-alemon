import {UserType} from "alemon/types/types";

export interface ConversationRecord {
    sender: UserType,
    ctime: Date,
    utime: Date,
    num: number,
    conversation: ConversationRecordContent,
    parentMessageId: string,
    clientId?: string,
    invocationId?: number,
    conversationSignature?: string,
    bingToken?: string,
}

export interface ConversationRecordContent {
    conversationId: string,

}
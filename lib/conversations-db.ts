import { get, set, del } from "idb-keyval";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  sources?: { id: string; title: string }[];
}

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationData {
  messages: ChatMessage[];
  contextNoteIds: string[];
  autoFollow: boolean;
}

const INDEX_KEY = "conversations:index";
const DATA_PREFIX = "conversations:";
const UI_CURRENT_CONVERSATION_KEY = "ui:current-conversation-id";
const UI_SIDEBAR_WIDTH_KEY = "ui:sidebar-width";

function dataKey(id: string): string {
  return `${DATA_PREFIX}${id}`;
}

async function getIndex(): Promise<ConversationMeta[]> {
  return (await get(INDEX_KEY)) || [];
}

async function setIndex(index: ConversationMeta[]): Promise<void> {
  await set(INDEX_KEY, index);
}

export async function listConversations(): Promise<ConversationMeta[]> {
  return await getIndex();
}

export async function getConversationData(
  id: string
): Promise<ConversationData | undefined> {
  return await get(dataKey(id));
}

export async function createConversation(): Promise<ConversationMeta> {
  const now = Date.now();
  const conversation: ConversationMeta = {
    id: crypto.randomUUID(),
    title: "",
    createdAt: now,
    updatedAt: now,
  };

  const data: ConversationData = {
    messages: [],
    contextNoteIds: [],
    autoFollow: true,
  };

  const index = await getIndex();
  index.unshift(conversation);
  await setIndex(index);
  await set(dataKey(conversation.id), data);

  return conversation;
}

export async function updateConversationMeta(
  id: string,
  updates: Partial<Pick<ConversationMeta, "title">>
): Promise<void> {
  const index = await getIndex();
  const idx = index.findIndex((c) => c.id === id);
  if (idx === -1) return;

  index[idx] = { ...index[idx], ...updates, updatedAt: Date.now() };
  // Move to front since it was just updated
  const [item] = index.splice(idx, 1);
  index.unshift(item);
  await setIndex(index);
}

export async function updateConversationData(
  id: string,
  updates: Partial<ConversationData>
): Promise<void> {
  const existing = (await get(dataKey(id))) as ConversationData | undefined;
  const merged: ConversationData = {
    messages: [],
    contextNoteIds: [],
    autoFollow: true,
    ...existing,
    ...updates,
  };
  await set(dataKey(id), merged);

  // Also bump updatedAt on the meta
  const index = await getIndex();
  const idx = index.findIndex((c) => c.id === id);
  if (idx !== -1) {
    index[idx].updatedAt = Date.now();
    const [item] = index.splice(idx, 1);
    index.unshift(item);
    await setIndex(index);
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const index = await getIndex();
  const filtered = index.filter((c) => c.id !== id);
  await setIndex(filtered);
  await del(dataKey(id));
}

export async function getCurrentConversationId(): Promise<string | undefined> {
  return await get(UI_CURRENT_CONVERSATION_KEY);
}

export async function setCurrentConversationId(id: string | undefined): Promise<void> {
  if (id === undefined) {
    await del(UI_CURRENT_CONVERSATION_KEY);
  } else {
    await set(UI_CURRENT_CONVERSATION_KEY, id);
  }
}

export async function getSidebarWidth(): Promise<number | undefined> {
  return await get(UI_SIDEBAR_WIDTH_KEY);
}

export async function setSidebarWidth(width: number): Promise<void> {
  await set(UI_SIDEBAR_WIDTH_KEY, width);
}

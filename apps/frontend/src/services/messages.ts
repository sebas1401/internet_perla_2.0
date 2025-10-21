import api from './api';

export interface Contact {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  lastAt?: string;
  unreadCount?: number;
}

export interface Message {
  id: string;
  sender: {
    id: string;
    name?: string;
  };
  recipient: {
    id: string;
    name?: string;
  };
  content: string;
  createdAt: string;
  read: boolean;
}

export async function listContacts(): Promise<Contact[]> {
  try {
    const response = await api.get('/messages/contacts');
    return response.data || [];
  } catch (error) {
    console.error('Error listing contacts:', error);
    return [];
  }
}

export async function getThread(contactId: string): Promise<Message[]> {
  try {
    const response = await api.get(`/messages/thread/${contactId}`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching thread:', error);
    return [];
  }
}

export async function sendMessage(recipientId: string, content: string): Promise<Message> {
  try {
    const response = await api.post('/messages/send', {
      recipientId,
      content,
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

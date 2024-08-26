import { Layer } from "ol/layer";
import { Feature } from 'ol';
import { Style } from "ol/style";
import { Source } from "ol/source";

export interface Chat {
    id?: string;
    contactId?: string;
    contact?: Contact;
    unreadCount?: number;
    muted?: boolean;
    lastMessage?: string;
    lastMessageAt?: string;
    messages?: {
        id?: string;
        chatId?: string;
        contactId?: string;
        isMine?: boolean;
        value?: string;
        createdAt?: string;
    }[];
}

export interface Contact {
    id?: string;
    avatar?: string;
    name?: string;
    about?: string;
    details?: {
        emails?: {
            email?: string;
            label?: string;
        }[];
        phoneNumbers?: {
            country?: string;
            phoneNumber?: string;
            label?: string;
        }[];
        title?: string;
        company?: string;
        birthday?: string;
        address?: string;
    };
    attachments?: {
        media?: any[];
        docs?: any[];
        links?: any[];
    };
}

export interface CustomLayer {
    id: string;
    name: string;
    title?: string;
    type: 'VECTOR' | 'RASTER';
    layer: Layer<Source>;
    source: 'WFS' | 'IMPORT' | 'WMS';
    features: Feature[];
    style?: Style;
    inStyle?: Style;
  }  
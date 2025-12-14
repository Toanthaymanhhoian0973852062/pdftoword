export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ConvertResponse {
  markdown: string;
  usage?: {
    promptTokens: number;
    responseTokens: number;
  };
}

export interface FileData {
  file: File;
  previewUrl: string; // Object URL for previewing images/pdfs
  base64: string;
  mimeType: string;
  pages: string[]; // Array of base64 strings representing each page of the original document
}

export interface HistoryItem {
  id: string;
  fileName: string;
  timestamp: number;
  markdown: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}
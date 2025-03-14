
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// Add DOM type references to ensure browser APIs are available
interface Window {
  dispatchEvent(event: Event): boolean;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

interface Storage {
  key(index: number): string | null;
  readonly length: number;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

interface EventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
}

interface EventListenerOrEventListenerObject {
  handleEvent?(evt: Event): void;
  (evt: Event): void;
}

// Add additional DOM types needed for auth.ts
interface StorageEvent extends Event {
  readonly key: string | null;
  readonly newValue: string | null;
  readonly oldValue: string | null;
  readonly storageArea: Storage | null;
  readonly url: string;
}

interface CustomEventInit<T = any> extends EventInit {
  detail?: T;
}

interface CustomEvent<T = any> extends Event {
  readonly detail: T;
  initCustomEvent(type: string, bubbles?: boolean, cancelable?: boolean, detail?: T): void;
}

declare var CustomEvent: {
  prototype: CustomEvent;
  new<T>(typeArg: string, eventInitDict?: CustomEventInit<T>): CustomEvent<T>;
};

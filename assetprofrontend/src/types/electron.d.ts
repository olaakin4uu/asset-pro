/**
 * Global type declaration for SalvageConnect Electron bridge.
 * When the web app runs inside SalvageConnect, `window.electronAPI` is available.
 * In a browser, it is `undefined`.
 */

interface ElectronPrintRequest {
  /** HTML string to print */
  content: string;
  /** Print type determines page size and margins */
  type: 'thermal' | 'a4';
  /** Printer name — omit to use configured default */
  printerName?: string;
  /** Print silently without dialog (default: true) */
  silent?: boolean;
  /** Number of copies (default: 1) */
  copies?: number;
  /** Thermal paper width in mm (default: 80) */
  width?: number;
}

interface ElectronPrintResult {
  success: boolean;
  error?: string;
}

interface ElectronDiscoveredServer {
  name: string;
  host: string;
  port: number;
  url: string;
  version?: string;
}

interface ElectronPrinterInfo {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

interface ElectronAPI {
  // Printing
  print(request: ElectronPrintRequest): Promise<ElectronPrintResult>;
  getPrinters(): Promise<ElectronPrinterInfo[]>;

  // Server Discovery
  discoverServers(): Promise<ElectronDiscoveredServer[]>;
  stopDiscovery(): void;
  onServerFound(callback: (server: ElectronDiscoveredServer) => void): () => void;

  // Config
  getConfig(key: string): Promise<unknown>;
  setConfig(key: string, value: unknown): Promise<void>;

  // App Info
  getVersion(): string;
  getPlatform(): string;
  isKioskMode(): boolean;

  // Window Controls
  minimize(): void;
  maximize(): void;
  close(): void;

  // Updates
  checkForUpdate(): Promise<{ available: boolean; version?: string }>;
  onUpdateAvailable(callback: (info: { version: string }) => void): () => void;
  onUpdateDownloaded(callback: (info: { version: string }) => void): () => void;
  installUpdate(): void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

import { OnlineSocketServer } from "./socketServer";

let onlineServerInstance: OnlineSocketServer<string> | null = null;

export function initOnlineSocketServer(config: { enabled: boolean; port: number }): OnlineSocketServer<string> | null {
  if (!config.enabled) {
    onlineServerInstance = null;
    return null;
  }

  onlineServerInstance = new OnlineSocketServer<string>(config.port);
  onlineServerInstance.start();
  return onlineServerInstance;
}

export function getOnlineSocketServer(): OnlineSocketServer<string> | null {
  return onlineServerInstance;
}

// SSH2 类型修复
export interface SFTPExtended {
  fastGet: (remotePath: string, localPath: string, callback: (err: Error | undefined) => void) => void;
  stat: (path: string, callback: (err: Error | undefined, stats: any) => void) => void;
  mkdir: (path: string, callback: (err: Error | undefined) => void) => void;
  fastPut: (localPath: string, remotePath: string, callback: (err: Error | undefined) => void) => void;
  readdir: (path: string, callback: (err: Error | undefined, list: any[]) => void) => void;
  // 添加其他必要的方法
}

// FTP 类型修复
export interface FTPExtended {
  on: any;
  list: any;
  get: any;
  put: any;
  mkdir: any;
  end: any;
  connect: any;
  // 添加其他必要的方法
} 
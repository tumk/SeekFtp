import * as vscode from 'vscode';
import FTP from 'ftp';
import { Client as SSHClient } from 'ssh2';
import * as path from 'path';
import * as fs from 'fs';

export class FTPExplorerProvider implements vscode.TreeDataProvider<FTPItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FTPItem | undefined | null | void> = new vscode.EventEmitter<FTPItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FTPItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private connections: Map<string, any> = new Map();

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FTPItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FTPItem): Promise<FTPItem[]> {
        if (!element) {
            // 根级别：显示所有保存的连接
            const configs = await this.loadConfigurations();
            return configs.map(config => new FTPConnectionItem(
                config.name,
                config,
                this.connections.has(config.name) ? 'connected' : 'disconnected'
            ));
        } else if (element instanceof FTPConnectionItem && element.status === 'connected') {
            // 连接级别：显示远程文件和文件夹
            return this.getRemoteItems(element.config, element.path || '/');
        }

        return [];
    }

    private async loadConfigurations(): Promise<any[]> {
        const config = vscode.workspace.getConfiguration('idea-ftp');
        return config.get<any[]>('connections') || [];
    }

    private async getRemoteItems(config: any, remotePath: string): Promise<FTPItem[]> {
        try {
            if (config.type === 'sftp') {
                return this.getSFTPItems(config, remotePath);
            } else {
                return this.getFTPItems(config, remotePath);
            }
        } catch (error) {
            console.error('Failed to get remote items:', error);
            return [];
        }
    }

    private async getFTPItems(config: any, remotePath: string): Promise<FTPItem[]> {
        return new Promise((resolve, reject) => {
            const client = new FTP();
            client.on('ready', () => {
                client.list(remotePath, (err, list) => {
                    client.end();
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(list.map(item => new FTPFileItem(
                        item.name,
                        item.type === 'd' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                        path.join(remotePath, item.name),
                        item.type === 'd' ? 'folder' : 'file'
                    )));
                });
            });
            client.connect(config);
        });
    }

    private async getSFTPItems(config: any, remotePath: string): Promise<FTPItem[]> {
        return new Promise((resolve, reject) => {
            const conn = new SSHClient();
            conn.on('ready', () => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        conn.end();
                        reject(err);
                        return;
                    }
                    sftp.readdir(remotePath, (err, list) => {
                        conn.end();
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(list.map(item => new FTPFileItem(
                            item.filename,
                            item.attrs.isDirectory() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                            path.join(remotePath, item.filename),
                            item.attrs.isDirectory() ? 'folder' : 'file'
                        )));
                    });
                });
            }).connect(config);
        });
    }

    async connect(item: FTPConnectionItem): Promise<void> {
        try {
            if (item.config.type === 'sftp') {
                const conn = new SSHClient();
                this.connections.set(item.config.name, conn);
            } else {
                const client = new FTP();
                this.connections.set(item.config.name, client);
            }
            item.status = 'connected';
            this.refresh();
        } catch (error) {
            console.error('Connection failed:', error);
            vscode.window.showErrorMessage(`连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    async disconnect(item: FTPConnectionItem): Promise<void> {
        const connection = this.connections.get(item.config.name);
        if (connection) {
            connection.end();
            this.connections.delete(item.config.name);
            item.status = 'disconnected';
            this.refresh();
        }
    }
}

class FTPItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}

class FTPConnectionItem extends FTPItem {
    constructor(
        public readonly label: string,
        public readonly config: any,
        public status: 'connected' | 'disconnected',
        public path?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = status;
        this.iconPath = new vscode.ThemeIcon(status === 'connected' ? 'plug' : 'circle-outline');
        this.description = config.host;
    }
}

class FTPFileItem extends FTPItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly path: string,
        public readonly type: 'file' | 'folder'
    ) {
        super(label, collapsibleState);
        this.contextValue = type;
        this.iconPath = new vscode.ThemeIcon(type === 'folder' ? 'folder' : 'file');
    }
} 
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { FTPExplorerProvider } from './ftpExplorer';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('IDEA FTP 插件已激活');

	// 创建 FTP 资源管理器提供程序
	const ftpExplorerProvider = new FTPExplorerProvider(context);
	
	// 注册 FTP 资源管理器视图
	vscode.window.registerTreeDataProvider('ftpExplorer', ftpExplorerProvider);

	// 注册命令
	context.subscriptions.push(
		vscode.commands.registerCommand('idea-ftp.refresh', () => ftpExplorerProvider.refresh()),
		vscode.commands.registerCommand('idea-ftp.connect', (item) => ftpExplorerProvider.connect(item)),
		vscode.commands.registerCommand('idea-ftp.disconnect', (item) => ftpExplorerProvider.disconnect(item))
	);

	// 首先定义一个全局状态管理器
	class ConfigurationManager {
		private static instance: ConfigurationManager;
		private configs: any[] = [];

		private constructor() {}

		static getInstance(): ConfigurationManager {
			if (!ConfigurationManager.instance) {
				ConfigurationManager.instance = new ConfigurationManager();
			}
			return ConfigurationManager.instance;
		}

		async loadConfigs(): Promise<any[]> {
			const config = vscode.workspace.getConfiguration('idea-ftp');
			this.configs = config.get<any[]>('connections') || [];
			return this.configs;
		}

		async saveConfig(newConfig: any, index: number | null): Promise<any[]> {
			const config = vscode.workspace.getConfiguration('idea-ftp');
			let connections = config.get<any[]>('connections') || [];

			if (index !== null && index >= 0 && index < connections.length) {
				// 更新现有配置
				connections[index] = newConfig;
			} else {
				// 添加新配置
				connections.push(newConfig);
			}

			// 保存到 VS Code 配置
			await config.update('connections', connections, vscode.ConfigurationTarget.Global);
			this.configs = connections;
			return connections;
		}

		async deleteConfig(index: number): Promise<any[]> {
			const config = vscode.workspace.getConfiguration('idea-ftp');
			let connections = config.get<any[]>('connections') || [];
			
			if (index >= 0 && index < connections.length) {
				connections.splice(index, 1);
				await config.update('connections', connections, vscode.ConfigurationTarget.Global);
				this.configs = connections;
			}
			
			return connections;
		}
	}

	// 修改 WebView 内容
	function getWebviewContent() {
		return `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					body {
						padding: 0;
						margin: 0;
					}
					.container {
						display: flex;
						height: 100vh;
					}
					.sidebar {
						width: 200px;
						background: var(--vscode-sideBar-background);
						border-right: 1px solid var(--vscode-sideBar-border);
					}
					.main-content {
						flex: 1;
						padding: 20px;
					}
					.connection-list {
						list-style: none;
						padding: 0;
						margin: 0;
					}
					.connection-item {
						display: flex;
						align-items: center;
						padding: 8px 12px;
						cursor: pointer;
						border-bottom: 1px solid var(--vscode-list-inactiveSelectionBackground);
					}
					.connection-item:hover {
						background: var(--vscode-list-hoverBackground);
					}
					.connection-item.active {
						background: var(--vscode-list-activeSelectionBackground);
					}
					.connection-info {
						flex: 1;
						display: flex;
						align-items: center;
						gap: 8px;
					}
					.delete-btn {
						opacity: 0;
						background: none;
						border: none;
						color: var(--vscode-errorForeground);
						cursor: pointer;
						padding: 4px;
					}
					.connection-item:hover .delete-btn {
						opacity: 1;
					}
					.form-group {
						display: grid;
						grid-template-columns: 120px 1fr auto;
						align-items: center;
						gap: 10px;
						margin-bottom: 10px;
					}
					.form-label {
						text-align: right;
						color: var(--vscode-foreground);
					}
					.form-input {
						padding: 4px 8px;
						background: var(--vscode-input-background);
						color: var(--vscode-input-foreground);
						border: 1px solid var(--vscode-input-border);
					}
					.browse-btn {
						padding: 4px 8px;
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						cursor: pointer;
					}
					#type {
						width: 100%;
					}
					.button-group {
						display: flex;
						gap: 10px;
						margin-top: 20px;
						justify-content: flex-end;
					}

					.action-btn {
						padding: 6px 12px;
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						cursor: pointer;
					}

					.action-btn:hover {
						background: var(--vscode-button-hoverBackground);
					}

					.test-btn {
						background: var(--vscode-button-secondaryBackground);
						color: var(--vscode-button-secondaryForeground);
					}

					.test-btn:hover {
						background: var(--vscode-button-secondaryHoverBackground);
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="sidebar">
						<ul id="connectionList" class="connection-list"></ul>
					</div>
					<div class="main-content">
						<form id="connectionForm" onsubmit="saveConfig(event)">
							<div class="form-group">
								<label class="form-label">连接名称</label>
								<input type="text" id="name" class="form-input" />
							</div>
							<div class="form-group">
								<label class="form-label">连接类型</label>
								<select id="type" class="form-input">
									<option value="ftp">FTP</option>
									<option value="sftp">SFTP</option>
								</select>
							</div>
							<div class="form-group">
								<label class="form-label">主机地址</label>
								<input type="text" id="host" class="form-input" />
							</div>
							<div class="form-group">
								<label class="form-label">端口</label>
								<input type="number" id="port" class="form-input" />
							</div>
							<div class="form-group">
								<label class="form-label">用户名</label>
								<input type="text" id="username" class="form-input" />
							</div>
							<div class="form-group">
								<label class="form-label">密码</label>
								<input type="password" id="password" class="form-input" />
							</div>
							<div class="form-group">
								<label class="form-label">本地路径</label>
								<input type="text" id="localPath" class="form-input" />
								<button type="button" class="browse-btn" onclick="selectLocalPath()">浏览</button>
							</div>
							<div class="form-group">
								<label class="form-label">部署路径</label>
								<input type="text" id="deployPath" class="form-input" />
								<button type="button" class="browse-btn" onclick="selectRemotePath()">浏览</button>
							</div>

							<div class="button-group">
								<button type="button" class="action-btn test-btn" onclick="testConnection()">测试连接</button>
								<button type="submit" class="action-btn">保存</button>
							</div>
						</form>
					</div>
				</div>
				<script>
					const vscode = acquireVsCodeApi();
					let connections = [];
					let currentConnection = null;

					function updateConnectionsList() {
						const list = document.getElementById('connectionList');
						list.innerHTML = '';
						connections.forEach((connection, index) => {
							const li = document.createElement('li');
							li.className = 'connection-item' + (currentConnection === index ? ' active' : '');
							
							const infoDiv = document.createElement('div');
							infoDiv.className = 'connection-info';
							infoDiv.onclick = () => selectConnection(index);
							infoDiv.innerHTML = \`
								<span class="connection-icon">🔌</span>
								<span>\${connection.name || '未命名连接'}</span>
							\`;
							
							const deleteBtn = document.createElement('button');
							deleteBtn.className = 'delete-btn';
							deleteBtn.innerHTML = '🗑️';
							deleteBtn.onclick = (e) => {
								e.stopPropagation();
								if (confirm('确定要删除这个连接吗？')) {
									vscode.postMessage({
										command: 'deleteConfig',
										index: index
									});
								}
							};
							
							li.appendChild(infoDiv);
							li.appendChild(deleteBtn);
							list.appendChild(li);
						});
					}

					function selectConnection(index) {
						currentConnection = index;
						const connection = connections[index];
						
						// 填充表单数据
						document.getElementById('name').value = connection.name || '';
						document.getElementById('type').value = connection.type || 'ftp';
						document.getElementById('host').value = connection.host || '';
						document.getElementById('port').value = connection.port || '';
						document.getElementById('username').value = connection.username || '';
						document.getElementById('password').value = connection.password || '';
						document.getElementById('localPath').value = connection.localPath || '';
						document.getElementById('deployPath').value = connection.deployPath || '';
						
						updateConnectionsList();
					}

					function selectLocalPath() {
						vscode.postMessage({
							command: 'selectLocalPath'
						});
					}

					function selectRemotePath() {
						const config = getFormData();
						if (!config.host || !config.port || !config.username) {
							vscode.postMessage({
								command: 'showError',
								text: '请先填写服务器连接信息'
							});
							return;
						}
						vscode.postMessage({
							command: 'selectRemotePath',
							config: config
						});
					}

					function testConnection() {
						const config = getFormData();
						if (!config.host || !config.port || !config.username) {
							vscode.postMessage({
								command: 'showError',
								text: '请填写完整的连接信息'
							});
							return;
						}
						vscode.postMessage({
							command: 'testConnection',
							config: config
						});
					}

					function saveConfig(event) {
						event.preventDefault();
						const config = getFormData();
						if (!config.name || !config.host || !config.port || !config.username) {
							vscode.postMessage({
								command: 'showError',
								text: '请填写必要的连接信息'
							});
							return;
						}
						vscode.postMessage({
							command: 'saveConfig',
							config: config,
							index: currentConnection
						});
					}

					function getFormData() {
						return {
							name: document.getElementById('name').value,
							type: document.getElementById('type').value,
							host: document.getElementById('host').value,
							port: parseInt(document.getElementById('port').value) || '',
							username: document.getElementById('username').value,
							password: document.getElementById('password').value,
							localPath: document.getElementById('localPath').value,
							deployPath: document.getElementById('deployPath').value
						};
					}

					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.command) {
							case 'loadConnections':
								connections = message.connections;
								updateConnectionsList();
								break;
							case 'configDeleted':
								connections = message.connections;
								currentConnection = null;
								updateConnectionsList();
								document.getElementById('connectionForm').reset();
								break;
							case 'setLocalPath':
								document.getElementById('localPath').value = message.path;
								break;
							case 'setRemotePath':
								document.getElementById('deployPath').value = message.path;
								break;
							case 'configSaved':
								connections = message.connections;
								updateConnectionsList();
								vscode.postMessage({
									command: 'showInfo',
									text: '配置已保存'
								});
								break;
						}
					});
				</script>
			</body>
			</html>
		`;
	}

	// 修改 activate 函数
	const configManager = ConfigurationManager.getInstance();

	let disposable = vscode.commands.registerCommand('idea-ftp.openFTPConfig', () => {
		const panel = vscode.window.createWebviewPanel(
			'ftpConfig',
			'FTP Configuration',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		panel.webview.html = getWebviewContent();

		// 处理来自 WebView 的消息
		panel.webview.onDidReceiveMessage(
			async message => {
				console.log('Received message from webview:', message);
				
				switch (message.command) {
					case 'selectLocalPath':
						try {
							const result = await vscode.window.showOpenDialog({
								canSelectFiles: false,
								canSelectFolders: true,
								canSelectMany: false,
								title: '选择本地路径'
							});
							if (result && result.length > 0) {
								panel.webview.postMessage({
									command: 'setLocalPath',
									path: result[0].fsPath
								});
							}
						} catch (error) {
							vscode.window.showErrorMessage('选择本地路径失败');
						}
						break;

					case 'selectRemotePath':
						try {
							const remotePicker = new RemoteDirectoryPicker(panel, message.config);
							await remotePicker.showPicker();
						} catch (error) {
							vscode.window.showErrorMessage('浏览远程目录失败：' + (error instanceof Error ? error.message : '未知错误'));
						}
						break;

					case 'testConnection':
						try {
							const config = message.config;
							// 这里应该实现实际的连接测试逻辑
							await testFTPConnection(config);
							vscode.window.showInformationMessage('连接测试成功！');
						} catch (error) {
							vscode.window.showErrorMessage('连接测试失败：' + (error instanceof Error ? error.message : '未知错误'));
						}
						break;

					case 'saveConfig':
						try {
							const updatedConfigs = await configManager.saveConfig(message.config, message.index);
							panel.webview.postMessage({
								command: 'configSaved',
								connections: updatedConfigs
							});
							vscode.window.showInformationMessage('配置已保存');
						} catch (error) {
							vscode.window.showErrorMessage('保存配置失败：' + (error instanceof Error ? error.message : '未知错误'));
						}
						break;

					case 'deleteConfig':
						try {
							console.log('Deleting config at index:', message.index);
							const updatedConfigs = await configManager.deleteConfig(message.index);
							panel.webview.postMessage({
								command: 'configDeleted',
								connections: updatedConfigs
							});
							vscode.window.showInformationMessage('连接已删除');
						} catch (error) {
							console.error('Delete config failed:', error);
							vscode.window.showErrorMessage('删除配置失败：' + (error instanceof Error ? error.message : '未知错误'));
						}
						break;
				}
			},
			undefined,
			context.subscriptions
		);

		// 初始加载配置
		configManager.loadConfigs().then(configs => {
			panel.webview.postMessage({
				command: 'loadConnections',
				connections: configs
			});
		}).catch(error => {
			console.error('Load configurations failed:', error);
			vscode.window.showErrorMessage('加载配置失败');
		});
	});

	context.subscriptions.push(disposable);
}

// 修改配置保存函数，添加类型定义
interface FTPConfig {
	name: string;
	type: 'ftp' | 'sftp';  // 添加类型字段
	host: string;
	port: number;
	username: string;
	password: string;
	rootPath: string;
	// SFTP 特有的配置
	privateKeyPath?: string;
	passphrase?: string;
	mappings?: Array<{
		localPath: string;
		deploymentPath: string;
		webPath?: string;
	}>;
}

async function saveConfiguration(config: FTPConfig): Promise<FTPConfig[]> {
	try {
		const configurations = vscode.workspace.getConfiguration('idea-ftp');
		const currentConfigs = configurations.get<FTPConfig[]>('connections') || [];
		const newConfigs = [...currentConfigs, config];
		await configurations.update('connections', newConfigs, vscode.ConfigurationTarget.Global);
		return newConfigs;
	} catch (error) {
		console.error('Save configuration failed:', error);
		throw error;
	}
}

async function loadConfigurations(): Promise<FTPConfig[]> {
	const config = vscode.workspace.getConfiguration('idea-ftp');
	return config.get<FTPConfig[]>('connections') || [];
}

async function testFTPConnection(config: FTPConfig): Promise<boolean> {
	try {
		if (config.type === 'sftp') {
			const Client = require('ssh2').Client;
			const conn = new Client();
			
			return new Promise((resolve) => {
				const timeout = setTimeout(() => {
					conn.end();
					resolve(false);
					vscode.window.showErrorMessage('连接超时');
				}, 10000); // 10秒超时

				conn.on('ready', () => {
					clearTimeout(timeout);
					conn.end();
					resolve(true);
				}).on('error', (err: Error) => {
					clearTimeout(timeout);
					console.error('SFTP connection error:', err);
					vscode.window.showErrorMessage(`连接错误: ${err.message}`);
					resolve(false);
				}).connect({
					host: config.host,
					port: config.port,
					username: config.username,
					password: config.password,
					privateKey: config.privateKeyPath ? require('fs').readFileSync(config.privateKeyPath) : undefined,
					passphrase: config.passphrase,
					readyTimeout: 10000,
					keepaliveInterval: 10000
				});
			});
		} else {
			const Client = require('ftp');
			const ftp = new Client();
			
			return new Promise((resolve) => {
				const timeout = setTimeout(() => {
					ftp.end();
					resolve(false);
					vscode.window.showErrorMessage('连接超时');
				}, 10000); // 10秒超时

				ftp.on('ready', () => {
					clearTimeout(timeout);
					ftp.end();
					resolve(true);
				}).on('error', (err: Error) => {
					clearTimeout(timeout);
					console.error('FTP connection error:', err);
					vscode.window.showErrorMessage(`连接错误: ${err.message}`);
					resolve(false);
				}).connect({
					host: config.host,
					port: config.port,
					user: config.username,
					password: config.password,
					connTimeout: 10000,
					pasvTimeout: 10000,
					keepalive: 10000
				});
			});
		}
	} catch (error) {
		console.error('Connection test failed:', error);
		vscode.window.showErrorMessage(`连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
		return false;
	}
}

// 添加远程目录浏览功能
async function browseRemoteDirectory(config: FTPConfig, currentPath: string = '/'): Promise<string | undefined> {
	try {
		if (config.type === 'sftp') {
			const Client = require('ssh2').Client;
			const conn = new Client();
			
			return new Promise((resolve, reject) => {
				conn.on('ready', () => {
					conn.sftp((err: Error, sftp: any) => {
						if (err) {
							conn.end();
							reject(err);
							return;
						}
						
						sftp.readdir(currentPath, (err: Error, list: any[]) => {
							if (err) {
								conn.end();
								reject(err);
								return;
							}
							
							const items = list
								.filter(item => item.attrs.isDirectory())
								.map(item => ({
									name: item.filename,
									path: currentPath + (currentPath.endsWith('/') ? '' : '/') + item.filename
								}));

							showRemoteDirectoryPicker(items, currentPath, config).then(result => {
								conn.end();
								resolve(result);
							});
						});
					});
				}).connect({
					host: config.host,
					port: config.port,
					username: config.username,
					password: config.password,
					privateKey: config.privateKeyPath ? require('fs').readFileSync(config.privateKeyPath) : undefined,
					passphrase: config.passphrase
				});
			});
		} else {
			const Client = require('ftp');
			const ftp = new Client();
			
			return new Promise((resolve, reject) => {
				ftp.on('ready', () => {
					ftp.list(currentPath, (err: Error, list: any[]) => {
						if (err) {
							ftp.end();
							reject(err);
							return;
						}
						
						const items = list
							.filter(item => item.type === 'd')
							.map(item => ({
								name: item.name,
								path: currentPath + (currentPath.endsWith('/') ? '' : '/') + item.name
							}));

						showRemoteDirectoryPicker(items, currentPath, config).then(result => {
							ftp.end();
							resolve(result);
						});
					});
				}).connect({
					host: config.host,
					port: config.port,
					user: config.username,
					password: config.password
				});
			});
		}
	} catch (error) {
		console.error('Browse remote directory failed:', error);
		vscode.window.showErrorMessage(`浏览远程目录失败: ${error instanceof Error ? error.message : '未知错误'}`);
		return undefined;
	}
}

async function showRemoteDirectoryPicker(
	items: Array<{name: string, path: string}>,
	currentPath: string,
	config: FTPConfig
): Promise<string | undefined> {
	const parentDir = currentPath === '/' ? null : {
		label: '../',
		description: '上级目录',
		path: currentPath.split('/').slice(0, -1).join('/') || '/'
	};

	const choices = [
		...(parentDir ? [parentDir] : []),
		...items.map(item => ({
			label: item.name + '/',
			description: item.path,
			path: item.path
		}))
	];

	const selected = await vscode.window.showQuickPick(choices, {
		placeHolder: `当前目录: ${currentPath}`,
		title: '选择远程目录'
	});

	if (!selected) {
		return undefined;
	}

	if (selected === parentDir) {
		return browseRemoteDirectory(config, selected.path);
	}

	const action = await vscode.window.showQuickPick([
		{ label: '选择此目录', value: 'select' },
		{ label: '进入此目录', value: 'enter' }
	], {
		placeHolder: `当前选择: ${selected.path}`
	});

	if (!action) {
		return undefined;
	}

	if (action.value === 'enter') {
		return browseRemoteDirectory(config, selected.path);
	}

	return selected.path;
}

// This method is called when your extension is deactivated
export function deactivate() {}

// 首先添加一个远程目录浏览器的实现
class RemoteDirectoryPicker {
	constructor(private panel: vscode.WebviewPanel, private config: any) {}

	async showPicker(): Promise<void> {
		const pickerPanel = vscode.window.createWebviewPanel(
			'remotePicker',
			`${this.config.name} - ${this.config.host}`,  // 修改标题显示
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		pickerPanel.webview.html = this.getPickerContent();

		pickerPanel.webview.onDidReceiveMessage(async message => {
			switch (message.command) {
				case 'loadDirectory':
					try {
						const items = await this.listDirectory(message.path || '/');
						pickerPanel.webview.postMessage({
							command: 'directoryLoaded',
							items: items,
							path: message.path || '/'
						});
					} catch (error) {
						vscode.window.showErrorMessage('加载目录失败：' + (error instanceof Error ? error.message : '未知错误'));
					}
					break;
				case 'selectPath':
					this.panel.webview.postMessage({
						command: 'setRemotePath',
						path: message.path
					});
					pickerPanel.dispose();
					break;
				case 'openFile':
					try {
						await this.openRemoteFile(message.path);
						pickerPanel.dispose();
					} catch (error) {
						vscode.window.showErrorMessage('打开文件失败：' + (error instanceof Error ? error.message : '未知错误'));
					}
					break;
			}
		});
	}

	private getPickerContent(): string {
		return `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					body {
						padding: 10px;
					}
					.path-navigator {
						display: flex;
						align-items: center;
						padding: 8px;
						background: var(--vscode-editor-background);
						border-bottom: 1px solid var(--vscode-panel-border);
						margin-bottom: 10px;
					}
					.path-navigator .back-btn {
						margin-right: 8px;
						cursor: pointer;
						padding: 4px 8px;
						background: var(--vscode-button-secondaryBackground);
						border: none;
						color: var(--vscode-button-secondaryForeground);
					}
					.path-navigator .current-path {
						flex: 1;
						white-space: nowrap;
						overflow: hidden;
						text-overflow: ellipsis;
					}
					.directory-list {
						list-style: none;
						padding: 0;
						margin: 0;
					}
					.directory-item {
						display: flex;
						align-items: center;
						padding: 6px 8px;
						cursor: pointer;
						border-bottom: 1px solid var(--vscode-list-inactiveSelectionBackground);
					}
					.directory-item:hover {
						background: var(--vscode-list-hoverBackground);
					}
					.directory-icon {
						margin-right: 8px;
					}
					.expand-icon {
						margin-right: 8px;
						width: 16px;
						height: 16px;
						text-align: center;
						cursor: pointer;
					}
					.sub-directory {
						margin-left: 20px;
						display: none;
					}
					.expanded .sub-directory {
						display: block;
					}
				</style>
			</head>
			<body>
				<div class="path-navigator">
					<button class="back-btn" onclick="navigateUp()">⬆️ 返回上级</button>
					<div id="currentPath" class="current-path"></div>
				</div>
				<ul id="directoryList" class="directory-list"></ul>
				<script>
					const vscode = acquireVsCodeApi();
					let currentPath = '/';

					function updateCurrentPath(path) {
						currentPath = path;
						document.getElementById('currentPath').textContent = path;
					}

					function navigateUp() {
						if (currentPath === '/') return;
						const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
						vscode.postMessage({
							command: 'loadDirectory',
							path: parentPath
						});
					}

					function createDirectoryItem(item) {
						const li = document.createElement('li');
						li.className = 'directory-item';
						
						const expandIcon = document.createElement('span');
						expandIcon.className = 'expand-icon';
						expandIcon.textContent = item.isDirectory ? '▶' : ' ';
						
						const icon = document.createElement('span');
						icon.className = 'directory-icon';
						icon.textContent = item.isDirectory ? '📁' : '📄';
						
						const name = document.createElement('span');
						name.textContent = item.name;
						
						li.appendChild(expandIcon);
						li.appendChild(icon);
						li.appendChild(name);

						if (item.isDirectory) {
							expandIcon.onclick = (e) => {
								e.stopPropagation();
								vscode.postMessage({
									command: 'loadDirectory',
									path: item.path
								});
							};
							
							li.onclick = () => {
								vscode.postMessage({
									command: 'selectPath',
									path: item.path
								});
							};
						} else {
							// 文件双击事件
							li.ondblclick = () => {
								vscode.postMessage({
									command: 'openFile',
									path: item.path
								});
							};
						}
						
						return li;
					}

					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.command) {
							case 'directoryLoaded':
								updateCurrentPath(message.path);
								const list = document.getElementById('directoryList');
								list.innerHTML = '';
								message.items.forEach(item => {
									list.appendChild(createDirectoryItem(item));
								});
								break;
						}
					});

					// 初始加载根目录
					vscode.postMessage({
						command: 'loadDirectory',
						path: '/'
					});
				</script>
			</body>
			</html>
		`;
	}

	private async openRemoteFile(path: string): Promise<void> {
		// 实现远程文件打开逻辑
		return new Promise((resolve, reject) => {
			const client = this.config.type === 'ftp' ? new (require('ftp'))() : new (require('ssh2').Client)();

			client.on('ready', () => {
				client.get(path, (err: Error | null, stream: any) => {
					if (err) {
						client.end();
						reject(err);
						return;
					}

					let content = '';
					stream.on('data', (chunk: Buffer) => {
						content += chunk.toString('utf8');
					});

					stream.on('end', async () => {
						client.end();
						try {
							// 创建临时文件并打开
							const document = await vscode.workspace.openTextDocument({
								content: content,
								language: this.getLanguageFromPath(path)
							});
							await vscode.window.showTextDocument(document);
							resolve();
						} catch (error) {
							reject(error);
						}
					});
				});
			});

			client.on('error', (err: Error) => {
				client.end();
				reject(err);
			});

			const connectConfig = {
				host: this.config.host,
				port: this.config.port,
				user: this.config.username,
				password: this.config.password
			};

			try {
				client.connect(connectConfig);
			} catch (error) {
				reject(error);
			}
		});
	}

	private getLanguageFromPath(path: string): string {
		const ext = path.split('.').pop()?.toLowerCase() || '';
		const languageMap: { [key: string]: string } = {
			'js': 'javascript',
			'ts': 'typescript',
			'json': 'json',
			'html': 'html',
			'css': 'css',
			'php': 'php',
			'py': 'python',
			// 添加更多文件类型映射
		};
		return languageMap[ext] || 'plaintext';
	}

	private async listDirectory(path: string): Promise<any[]> {
		return new Promise((resolve, reject) => {
			const client = this.config.type === 'ftp' ? new (require('ftp'))() : new (require('ssh2').Client)();

			client.on('ready', () => {
				client.list(path, (err: Error | null, list: any[]) => {
					client.end();
					if (err) {
						reject(err);
					} else {
						resolve(list.map(item => ({
							name: item.name,
							isDirectory: item.type === 'd',
							path: path + (path.endsWith('/') ? '' : '/') + item.name
						})));
					}
				});
			});

			client.on('error', (err: Error) => {
				client.end();
				reject(err);
			});

			const connectConfig = {
				host: this.config.host,
				port: this.config.port,
				user: this.config.username,
				password: this.config.password
			};

			try {
				client.connect(connectConfig);
			} catch (error) {
				reject(error);
			}
		});
	}
}

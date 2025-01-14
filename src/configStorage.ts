import * as vscode from 'vscode';
import { FTPConfig } from './types';

export function saveConfiguration(config: FTPConfig) {
    const configurations = vscode.workspace.getConfiguration('idea-ftp');
    configurations.update('ftpConfigs', config, vscode.ConfigurationTarget.Global);
} 
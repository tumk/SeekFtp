export interface FTPConfig {
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    rootPath: string;
    mappings: {
        localPath: string;
        deploymentPath: string;
        webPath: string;
    }[];
} 
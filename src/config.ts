import { readFile } from 'fs/promises';

export interface IHostConfig {
    'record_type'?: string,
    'record_ttl'?: number,
    'shared_secret': string,
    'provider': string
}

export interface IConfig {
    'auth_backends': {
        'predefined': {
            'users': Record<string, string>
        }
    },
    'update_endpoint': string,
    'hosts': Record<string, IHostConfig>,
    'providers': Record<string, any>
}

export class Loader {
    private static config: IConfig;

    static async load(): Promise<IConfig> {
        if (!Loader.config) {
            const json:Buffer = await readFile(process.env.CONFIG_FILE || './config.json');
            Loader.config = JSON.parse(json.toString());
        }

        return Loader.config;
    }
}

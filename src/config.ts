import Conf from 'conf';

interface ConfigType {
    apiKey?: string;
}

export const config = new Conf<ConfigType>({
    projectName: 'horizon-cli',
    projectVersion: '1.0.0',
});

export function setApiKey(key: string) {
    config.set('apiKey', key);
}

export function getApiKey(): string | undefined {
    return config.get('apiKey');
}

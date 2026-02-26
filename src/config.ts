import Conf from 'conf';

interface ConfigType {
    apiKey?: string;
    promptCount?: number;
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

export function removeApiKey() {
    config.delete('apiKey');
}

export function getPromptCount(): number {
    return config.get('promptCount', 0);
}

export function incrementPromptCount() {
    const current = getPromptCount();
    config.set('promptCount', current + 1);
}

export function resetPromptCount() {
    config.set('promptCount', 0);
}

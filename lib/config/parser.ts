import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export function loadYaml<T>(filename: string): T {
    const yamlPath = path.join(process.cwd(), 'content', filename);

    if (!fs.existsSync(yamlPath)) {
        if (filename === 'gallery.yaml') {
            throw new Error(
                `Required config not found: ${yamlPath}\n` +
                `Copy content/gallery.yaml.example to content/gallery.yaml and add your album IDs.`,
            );
        }
        return {} as T;
    }

    const raw = fs.readFileSync(yamlPath, 'utf8');
    return (yaml.load(raw) || {}) as T;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuid(id: string, context: string): string {
    const trimmed = id.trim();
    if (!UUID_REGEX.test(trimmed)) {
        throw new Error(`Invalid UUID in ${context}: "${trimmed}"`);
    }
    return trimmed;
}

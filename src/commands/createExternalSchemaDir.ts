import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as tools from './tools';

export async function cmdCreateExternalSchemaDir(context: vscode.ExtensionContext, uri: vscode.Uri) {
    const name = await vscode.window.showInputBox({
        prompt: 'Enter external schema directory name',
        placeHolder: 'e.g. common_schema',
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return 'Name cannot be empty';
            }
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                return 'Name can only contain letters, numbers and underscores, and cannot start with a number';
            }
            return null;
        }
    });

    if (!name) {
        return;
    }

    try {
        const targetPath = tools.getRightClickedPath(uri);
        const newDirPath = path.join(targetPath, name);

        if (fs.existsSync(newDirPath)) {
            vscode.window.showErrorMessage(`Directory already exists: ${name}`);
            return;
        }

        fs.mkdirSync(newDirPath, { recursive: true });

        const templatePath = path.join(context.extensionPath, 'assets', 'external.schema.base.template');
        const targetFilePath = path.join(newDirPath, 'base.py');

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template file not found: external.schema.base.template`);
        }

        fs.copyFileSync(templatePath, targetFilePath);

        // Update external_schema_path in .env files
        const workspacePath = tools.getWorkspacePath();
        updateEnvFiles(workspacePath, newDirPath);

        vscode.window.showInformationMessage(`External schema directory created: ${name}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}


function updateEnvFiles(workspacePath: string, newDirPath: string): void {
    const dirs = [workspacePath];

    while (dirs.length > 0) {
        const currentDir = dirs.pop()!;
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
                dirs.push(fullPath);
            } else if (entry.isFile() && entry.name === '.env') {
                updateEnvFile(fullPath, newDirPath);
            }
        }
    }
}

function updateEnvFile(envFilePath: string, newDirPath: string): void {
    const content = fs.readFileSync(envFilePath, 'utf-8');

    if (!content.includes('external_schema_path=')) {
        return;
    }

    const envDir = path.dirname(envFilePath);
    const relativePath = path.relative(envDir, newDirPath).replace(/\\/g, '/');

    const updatedContent = content.replace(
        /external_schema_path=.*/,
        `external_schema_path=${relativePath}`
    );

    fs.writeFileSync(envFilePath, updatedContent, 'utf-8');
}

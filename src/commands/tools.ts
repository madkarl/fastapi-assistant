import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('FastAPI-Assistant');
    }
    return outputChannel;
}

export function log(message: string): void {
    getOutputChannel().appendLine(message);
    getOutputChannel().show();
}


export function getRightClickedPath(uri: vscode.Uri | undefined): string {
    // 如果没有uri（从命令面板执行），使用workspace路径
    if (!uri) {
        return getWorkspacePath();
    }
    const stat = fs.statSync(uri.fsPath);
    return stat.isDirectory() ? uri.fsPath : path.dirname(uri.fsPath);
}

export function getWorkspacePath(): string {
    // 获取 workspace 根目录
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
    }
    throw new Error('can\'t find workspace path!');
}

export function getExtensionPath(context: vscode.ExtensionContext): string {
    // 获取当前插件所在的目录
    return context.extensionPath;
}

export function getCurrentFilePath(): string {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        return editor.document.uri.fsPath;
    }
    throw new Error('can\'t find current file path!');
}

export function validZipExist(context: vscode.ExtensionContext, zipName: string): string {
    const zipPath = path.join(getExtensionPath(context), 'assets', zipName);
    if (!fs.existsSync(zipPath)) {
        throw Error(`file not exist: ${zipName}`);
    }
    return zipPath;
}

export async function extractTemplate(context: vscode.ExtensionContext, zipName: string, targetDir: string, createDir: boolean) {
    try {
        const zipPath = validZipExist(context, zipName);
        const zip = new AdmZip(zipPath);
        if (createDir) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        zip.extractAllTo(targetDir, true);
    } catch (error) {
        throw new Error(`extract template failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}

export function generateSecretKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}


function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 渲染指定模板文件
 * 1.读取文件
 * 2.遍历replacements的k和v，在文件中找到所有格式为"${k}"的字符串，替换为v
 *   例如存在 replacements['test'] = 'demo',则将文件中"${test}"替换为"demo"
 *   如果文件中${k}存在多次，则每个位置都替换为对应的v
 * 3.写入文件
 * @param filePath 待渲染文件名
 * @param replacements 渲染KV对
 */
export function renderFile(filePath: string, replacements: Record<string, string>): void {
    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        for (const [key, value] of Object.entries(replacements)) {
            const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
            content = content.replace(pattern, value);
        }
        fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
        throw new Error(`render file failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}


/**
 * 替换指定模板文件
 * 1.读取文件
 * 2.遍历replacements的k和v，在文件中找到所有格式为"k"的字符串，替换为v
 *   例如存在 replacements['test'] = 'demo',则将文件中"test"替换为"demo"
 *   如果文件中k存在多次，则每个位置都替换为对应的v
 * 3.写入文件
 * @param filePath 文件路径
 * @param replacements 替换KV
 */
export function replaceFileContent(filePath: string, replacements: Record<string, string>): void {
    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        for (const [key, value] of Object.entries(replacements)) {
            const pattern = new RegExp(escapeRegExp(key), 'g');
            content = content.replace(pattern, value);
        }
        fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
        throw new Error(`replace file content failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}

/**
 * 在文件中找到标志字符串，并在其下一行插入appendText内容
 * 如果标志位不存在，则不追加内容
 * 追加完appendText后，在下一行继续输出原文件内容
 * @param filePath 待修改的文件路径
 * @param appendTag 标志字符串
 * @param appendText 待追加的字符串（可能是多行）
 */
export function appendFileByTag(filePath: string, tag: string, appendText: string): void {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const tagIndex = lines.findIndex(line => line.includes(tag));
        if (tagIndex === -1) {
            return;
        }
        lines.splice(tagIndex + 1, 0, appendText);
        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    } catch (error) {
        throw new Error(`append file by tag failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}


export function appendToFile(filePath: string, appendText: string, outputPath?: string): void {
    try {
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            throw new Error(`file not exist: ${filePath}`);
        }

        // 读取文件内容
        let content = fs.readFileSync(filePath, 'utf-8');

        // 在文件末尾追加内容
        // 如果文件不以换行符结尾，先添加一个换行符
        if (content.length > 0 && !content.endsWith('\n')) {
            content += '\n';
        }
        content += appendText;

        // 确定输出路径
        const targetPath = outputPath || filePath;

        // 确保输出目录存在
        const outputDir = path.dirname(targetPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 写入文件
        fs.writeFileSync(targetPath, content, 'utf-8');
    } catch (error) {
        throw Error(`append content to file failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}


export function appendFromTemplateFile(context: vscode.ExtensionContext, templateFileName: string, schemaFilePath: string) {
    try {
        const sourceFile = path.join(context.extensionPath, 'assets', templateFileName);

        if (!fs.existsSync(sourceFile)) {
            throw new Error(`template file not exist: ${sourceFile}`);
        }

        // 读取模板内容
        const templateContent = fs.readFileSync(sourceFile, 'utf8');

        // 追加到schema.py文件
        appendToFile(schemaFilePath, '\n' + templateContent);

    } catch (error) {
        throw new Error(`append template content failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}

/**
 * 读取filePath文件，从上向下以此查找是否存在开头是"import ****"或"from * import ****)的语句，在这行之后插入appendText
 * @param filePath 文件路径
 * @param appendText 待添加的文字
 */
export function appendImports(filePath: string, appendText: string): void {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`file not exist: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // 匹配 "import ..." 或 "from ... import ..." 语句
        const importPattern = /^\s*(import\s+|from\s+\S+\s+import\s+)/;

        // 从上往下查找最后一个import语句的位置
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (importPattern.test(lines[i])) {
                lastImportIndex = i;
            }
        }

        // 如果找到了import语句，在其后插入；否则在文件开头插入
        if (lastImportIndex !== -1) {
            lines.splice(lastImportIndex + 1, 0, appendText);
        } else {
            lines.unshift(appendText);
        }

        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    } catch (error) {
        throw new Error(`append imports failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}

/**
 * 读取schemaFile文件，获取所有的SQLModel类
 * 例如 class Item1(xxxxxx,table=True), 则提取Item1加入返回值
 * 例如 class Item1(SQLModel), 则Item1不加入返回值
 * @param schemaFile schema文件路径
 * @returns schema列表
 */
export function getAllSchema(schemaFile: string): Array<string> {
    try {
        if (!fs.existsSync(schemaFile)) {
            throw new Error(`file not exist: ${schemaFile}`);
        }

        const content = fs.readFileSync(schemaFile, 'utf-8');
        const result: string[] = [];

        // 匹配 class ClassName(..., table=True) 格式
        const pattern = /class\s+(\w+)\s*\([^)]*table\s*=\s*True[^)]*\)/g;
        let match;

        while ((match = pattern.exec(content)) !== null) {
            result.push(match[1]);
        }

        return result;
    } catch (error) {
        throw new Error(`get all schema failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}

export function convertToUnderScoreCase(input: string): string {
    return input.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}
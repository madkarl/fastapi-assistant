import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as tools from './tools';

/**
 * 调用vscode.window.showInputBox 让用户输入模块名称并返回
 * 如果未输入模块名称，则抛出异常
 */
async function getModuleName(): Promise<string> {
    const moduleName = await vscode.window.showInputBox({
        prompt: 'Enter module name',
        ignoreFocusOut: true
    });
    if (!moduleName) {
        throw new Error('Module name is required');
    }
    return moduleName;
}

/**
 * 创建 projectBase/moduleName 目录，创建成功返回目录全路径
 * 创建失败则抛出异常
 * @param projectBase  
 * @param moduleName 
 */
async function createModuleDirectory(projectBase: string, moduleName: string): Promise<string> {
    const modulePath = path.join(projectBase, moduleName);
    try {
        fs.mkdirSync(modulePath, { recursive: true });
        return modulePath;
    } catch (error) {
        throw new Error(`Failed to create module directory: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}



export async function cmdCreateModule(context: vscode.ExtensionContext, uri: vscode.Uri) {
    const projectBase: string = tools.getRightClickedPath(uri);

    const moduleName: string = await getModuleName();
    const modulePath: string = await createModuleDirectory(projectBase, moduleName);
    // tools.log(`module path: ${modulePath}`);

    await tools.extractTemplate(context, 'module.zip', modulePath, false);

    const replaceData: Record<string, string> = {
        'module-name': moduleName
    };

    const apiFile = path.join(modulePath, 'api.py');
    // tools.log(`api path: ${apiFile}`);
    tools.renderFile(apiFile, replaceData);

    vscode.window.showInformationMessage('Module created successfully!');
}
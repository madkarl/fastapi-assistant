import * as vscode from 'vscode';
import * as tools from './tools';
import * as path from 'path';

/**
 * 使用vscode.window.showInputBox获取所有必要参数
 */
export async function getParameters(moduleBase: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    // 1.select schema， key = schema-class
    const schemaFile = path.join(moduleBase, 'schema.py');
    const schemaList = tools.getAllSchema(schemaFile);

    // schemaList作为选项，让用户选择，同时也允许用户自己输入
    const schemaClass = await vscode.window.showQuickPick(
        [...schemaList, '$(edit) Custom Input...'],
        { placeHolder: 'Select a schema class or choose custom input' }
    );
    if (!schemaClass) {
        throw new Error('Schema class selection cancelled');
    }
    if (schemaClass === '$(edit) Custom Input...') {
        const customSchema = await vscode.window.showInputBox({
            prompt: 'Enter custom schema class name',
            placeHolder: 'e.g. MyModel'
        });
        if (!customSchema) {
            throw new Error('Schema class input cancelled');
        }
        result['schema-class'] = customSchema;
    } else {
        result['schema-class'] = schemaClass;
    }

    // 2. select authentication type, key= auth-type
    // 在 require root， require login，none 中进行选择
    const authOptions = [
        { label: 'Require Root', value: 'root' },
        { label: 'Require Login', value: 'login' },
        { label: 'None', value: 'none' }
    ];
    const authType = await vscode.window.showQuickPick(
        authOptions.map(opt => opt.label),
        { placeHolder: 'Select authentication type' }
    );
    if (!authType) {
        throw new Error('Authentication type selection cancelled');
    }
    result['auth-type'] = authOptions.find(opt => opt.label === authType)!.value;

    // 3. select id type, key = id-type
    // 在 UUID int 中让用户选择，同时也允许用户自己输入
    const idType = await vscode.window.showQuickPick(
        ['UUID', 'int', '$(edit) Custom Input...'],
        { placeHolder: 'Select ID type or choose custom input' }
    );
    if (!idType) {
        throw new Error('ID type selection cancelled');
    }
    if (idType === '$(edit) Custom Input...') {
        const customIdType = await vscode.window.showInputBox({
            prompt: 'Enter custom ID type',
            placeHolder: 'e.g. str'
        });
        if (!customIdType) {
            throw new Error('ID type input cancelled');
        }
        result['id-type'] = customIdType;
    } else {
        result['id-type'] = idType;
    }

    if (result['auth-type'] === 'root') {
        result['depends'] = ', dependencies=[Depends(get_root_info)]';
    } else if (result['auth-type'] === 'login') {
        result['depends'] = ', dependencies=[Depends(get_user_info)]';
    } else {
        result['depends'] = '';
    }

    result['schema-name'] = tools.convertToUnderScoreCase(result['schema-class'])

    return result;
}

export async function cmdCreateAPI(context: vscode.ExtensionContext, uri: vscode.Uri) {
    try {
        const moduleBase: string = tools.getRightClickedPath(uri);
        const parameters = await getParameters(moduleBase);
        const apiFile = path.join(moduleBase, 'api.py');
        // 判断apiFile是否存在，否则抛出异常

        tools.appendFromTemplateFile(context, 'api.template', apiFile);
        tools.renderFile(apiFile, parameters);

        const schema = parameters['schema-class'];

        const importData: string = `from .schema import ${schema}, ${schema}Create, ${schema}Read, ${schema}Update\n` + `from .filter import ${schema}Filter`;
        tools.appendImports(apiFile, importData);

        vscode.window.showInformationMessage('API created successfully');
    } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error}`);
    }


}
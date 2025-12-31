import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as tools from './tools';

export async function getParameters(): Promise<Record<string, string>> {
    const schemaName = await vscode.window.showInputBox({
        prompt: '请输入Schema名称',
        placeHolder: '例如: User, Product, Order',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Schema名称前缀不能为空';
            }
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
                return 'Schema名称前缀必须以大写字母开头，只能包含字母和数字';
            }
            return null;
        }
    });

    if (!schemaName) {
        throw new Error('Schema名称前缀不能为空');
    }

    const idType = await vscode.window.showQuickPick(
        [
            { label: 'UUID', description: 'use UUID type ID' },
            { label: 'int', description: 'use integer type ID' },
        ],
        {
            placeHolder: 'Select \'id\' field type',
            canPickMany: false
        }
    );

    if (!idType) {
        throw new Error('Must select id type');
    }

    const paramerts: Record<string, string> = {
        'id-type': idType.label,
        'schema-name': schemaName.trim()
    };

    if (paramerts['id-type'] === 'UUID') {
        paramerts['id-config'] = 'default_factory=uuid4, primary_key=True';
    } else {
        paramerts['id-config'] = 'default=None, primary_key=True';
    }

    return paramerts;
}

export async function cmdCreateSchema(context: vscode.ExtensionContext, uri: vscode.Uri) {
    const moduleBase: string = tools.getRightClickedPath(uri);
    const parameters: Record<string, string> = await getParameters();


    const schemaFile: string = path.join(moduleBase, 'schema.py');
    const filterFile: string = path.join(moduleBase, 'filter.py');

    if (!fs.existsSync(schemaFile)) {
        throw new Error(`schema.py not found: ${schemaFile}`);
    }
    if (!fs.existsSync(filterFile)) {
        throw new Error(`filter.py not found: ${filterFile}`);
    }

    try {
        // tools.log(`Rendering schema file: ${schemaFile}`);
        tools.appendFromTemplateFile(context, 'schema.template', schemaFile);
        tools.renderFile(schemaFile, parameters);

        // tools.log(`Rendering filter file: ${filterFile}`);
        const importLine: string = `from .schema import ${parameters['schema-name']}`;
        tools.appendImports(filterFile, importLine);

        tools.appendFromTemplateFile(context, 'filter.template', filterFile);
        tools.renderFile(filterFile, parameters);

        vscode.window.showInformationMessage(`Generate successfully!`);
    } catch (error) {
        vscode.window.showErrorMessage(`Generate schema field: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}
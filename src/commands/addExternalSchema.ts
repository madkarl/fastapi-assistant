import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as tools from './tools';

export async function getParameters(): Promise<Record<string, string>> {
    const schemaName = await vscode.window.showInputBox({
        prompt: 'Enter schema name',
        placeHolder: 'e.g. User, Product, Order',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Schema name cannot be empty';
            }
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
                return 'Schema name must start with uppercase letter and contain only letters and numbers';
            }
            return null;
        }
    });

    if (!schemaName) {
        throw new Error('Schema name cannot be empty');
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

    const parameters: Record<string, string> = {
        'id-type': idType.label,
        'schema-name': schemaName.trim()
    };

    if (parameters['id-type'] === 'UUID') {
        parameters['id-config'] = 'default_factory=uuid4, primary_key=True';
    } else {
        parameters['id-config'] = 'default=None, primary_key=True';
    }

    return parameters;
}

export async function cmdAddExternalSchema(context: vscode.ExtensionContext, uri: vscode.Uri) {
    const fileName: string = tools.getRightClickedFile(uri);
    const parameters: Record<string, string> = await getParameters();


    try {
        // Add import statements if not present
        if (!tools.fileContains(fileName, 'from sqlmodel import SQLModel, Field')) {
            tools.prependToFile(fileName, 'from sqlmodel import SQLModel, Field');
        }
        if (!tools.fileContains(fileName, 'from .base import make_partial_model')) {
            tools.prependToFile(fileName, 'from .base import make_partial_model');
        }

        if (parameters['id-type'] === 'UUID') {
            if (!tools.fileContains(fileName, 'from uuid import UUID, uuid4')) {
                tools.prependToFile(fileName, 'from uuid import UUID, uuid4');
            }
        }

        tools.appendFromTemplateFile(context, 'schema.template', fileName);
        tools.renderFile(fileName, parameters);

        vscode.window.showInformationMessage(`Add successfully!`);
    } catch (error) {
        vscode.window.showErrorMessage(`Add External schema field: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}
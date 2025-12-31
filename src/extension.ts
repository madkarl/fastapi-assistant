import * as vscode from 'vscode';
import { cmdCreateProject } from './commands/createProject';
import { cmdCreateModule } from './commands/createModule';
import { cmdCreateAPI } from './commands/createAPI';
import { cmdCreateSchema } from './commands/createSchema';


export function activate(context: vscode.ExtensionContext) {
	const createProject = vscode.commands.registerCommand('fastapi-assistant.createProject', async (uri: vscode.Uri) => {
		try {
			await cmdCreateProject(context, uri);
		} catch (error) {
			vscode.window.showErrorMessage(`Create Project failed: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
	});

	const createModule = vscode.commands.registerCommand('fastapi-assistant.createModule', async (uri: vscode.Uri) => {
		try {
			await cmdCreateModule(context, uri);
		} catch (error) {
			vscode.window.showErrorMessage(`Create Module failed: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
	});

	const createAPI = vscode.commands.registerCommand('fastapi-assistant.createAPI', async (uri: vscode.Uri) => {
		try {
			await cmdCreateAPI(context, uri);
		} catch (error) {
			vscode.window.showErrorMessage(`Create API failed: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
	});

	const createSchema = vscode.commands.registerCommand('fastapi-assistant.createSchema', async (uri: vscode.Uri) => {
		try {
			await cmdCreateSchema(context, uri);
		} catch (error) {
			vscode.window.showErrorMessage(`Create Schema failed: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
	});

	context.subscriptions.push(createProject, createModule, createAPI, createSchema);
}

export function deactivate() { }

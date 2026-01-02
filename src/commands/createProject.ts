import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

import * as tools from './tools';

const execAsync = promisify(exec);

/**
 * 为cmdCreateProject收集必要参数
 * 需要输入的内容如下：
 * 1.项目名称，默认为workPath的目录名称
 * 2.项目描述, 默认为 Powered By FastAPI-Assistant
 * 3.数据库配置
 *      数据库IP，默认为localhost
 *      数据库PORT，默认为5432，数据类型为string
 *      数据库名称，无默认值
 *      数据库账号，默认值postgresql
 *      数据库密码，默认值postgresql
 * @param workPath 工作目录
 */
async function getParameters(projectBase: string): Promise<Record<string, string>> {
    const params: Record<string, string> = {};

    // 1. 项目名称
    const defaultName = path.basename(projectBase);
    const projectName = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        value: defaultName,
        ignoreFocusOut: true
    });
    if (!projectName) {
        throw new Error('Project name is required');
    }
    params['app-name'] = projectName;

    // 2. 项目描述
    const projectDesc = await vscode.window.showInputBox({
        prompt: 'Enter project description',
        value: 'Powered By FastAPI-Assistant',
        ignoreFocusOut: true
    });
    params['app-description'] = projectDesc || 'Powered By FastAPI-Assistant';

    const dbHost = await vscode.window.showInputBox({
        prompt: 'Database host',
        value: 'localhost',
        ignoreFocusOut: true
    });
    params['db-host'] = dbHost || 'localhost';

    const dbPort = await vscode.window.showInputBox({
        prompt: 'Database port',
        value: '5432',
        ignoreFocusOut: true
    });
    params['db-port'] = dbPort || '5432';

    const dbName = await vscode.window.showInputBox({
        prompt: 'Database name',
        ignoreFocusOut: true
    });
    if (!dbName) {
        throw new Error('Database name is required');
    }
    params['db-name'] = dbName;

    const dbUsername = await vscode.window.showInputBox({
        prompt: 'Database username',
        value: 'postgres',
        ignoreFocusOut: true
    });
    params['db-username'] = dbUsername || 'postgresql';

    const dbPassword = await vscode.window.showInputBox({
        prompt: 'Database password',
        value: 'postgres',
        ignoreFocusOut: true
    });
    params['db-password'] = dbPassword || 'postgresql';

    return params;
}


/**
 * 初始化uv项目
 * 1.调用 uv help ，判断是否已经安装了uv
 * 2.切换到workspace目录下, 调用" uv init --bare" 初始化uv项目
 * @param workspacePath vs工作区目录
 */
async function initUvProject(workspacePath: string) {
    // 1. 检查 uv 是否安装
    try {
        await execAsync('uv help');
    } catch {
        throw new Error('uv not installed, please install uv: https://docs.astral.sh/uv/');
    }

    // 2. 判断workspace下是否pyproject.toml文件
    const pyprojectPath = path.join(workspacePath, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
        const answer = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: "pyproject.toml already exists, do you want to skip 'uv project initialize produce'?"
        });
        if (answer === 'Yes') {
            return;
        }
    }

    // 3. 初始化 uv 项目
    await execAsync('uv init --bare', { cwd: workspacePath });
}

/**
 * 安装python依赖
 * 1.创建一个string的list，加入 fastapi[],sqlmodel, psycopg, psycopg-binary, alembic, fastapi-filter
 * 2.切换到workspace目录下, 调用"uv add" 安装上一条list中所有依赖库，将命令格式化成一行并执行
 * @param workspacePath vs工作区目录
 */
async function installDependencies(workspacePath: string) {
    const dependencies = [
        'fastapi[standard]',
        'sqlmodel',
        'psycopg',
        'psycopg-binary',
        'alembic',
        'fastapi-filter',
        'PyJWT',
        'pwdlib[argon2]',
        "taskiq"
    ];

    const cmd = `uv add ${dependencies.join(' ')}`;
    await execAsync(cmd, { cwd: workspacePath });
}

/**
 * 初始化Alembic
 * 在projectBase目录下执行“uv run alembic init alembic -t async”
 * @param projectBase 项目根目录
 */
async function initializeAlembic(projectBase: string) {
    try {
        await execAsync('uv run alembic init alembic', { cwd: projectBase });
    } catch (error) {
        throw new Error(`initialize alembic failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
}

async function configureAlembic(projectBase: string, parameters: Record<string, string>) {
    const alembicIniPath = path.join(projectBase, 'alembic.ini');
    // tools.log(`alembic.ini: ${alembicIniPath}`);

    if (fs.existsSync(alembicIniPath)) {
        try {
            const uriConfig: Record<string, string> = {
                'driver://user:pass@localhost/dbname': `postgresql+psycopg://${parameters["db-username"]}:${parameters["db-password"]}@${parameters["db-host"]}:${parameters["db-port"]}/${parameters["db-name"]}`
            };
            tools.replaceFileContent(alembicIniPath, uriConfig);
        } catch (error) {
            throw new Error(`update alembic.ini failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
    } else {
        throw new Error('update alembic.ini failed: file not found');
    }

    const scriptPyMakoPath = path.join(projectBase, 'alembic', 'script.py.mako');
    // tools.log(`script.py.mako: ${scriptPyMakoPath}`);

    if (fs.existsSync(scriptPyMakoPath)) {
        try {
            tools.appendFileByTag(scriptPyMakoPath, "import sqlalchemy as sa", "import sqlmodel.sql.sqltypes");
        } catch (error) {
            throw new Error(`update script.py.mako failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
    } else {
        throw new Error('update script.py.mako failed: file not found');
    }

    const envPyPath = path.join(projectBase, 'alembic', 'env.py');
    // tools.log(`env.py: ${envPyPath}`);

    if (fs.existsSync(envPyPath)) {
        try {
            const metaConfig: Record<string, string> = {
                "target_metadata = None": "target_metadata = SQLModel.metadata"
            };
            tools.replaceFileContent(envPyPath, metaConfig);
            tools.appendFileByTag(envPyPath, "from alembic import context", "from sqlmodel import SQLModel\n### auto generate start ###\n# ...\n### auto generate end ###\n");
        } catch (error) {
            throw new Error(`update alembic/env.py failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
    } else {
        throw new Error('update alembic/env.py failed: file not found');
    }
}


export async function cmdCreateProject(context: vscode.ExtensionContext, uri: vscode.Uri) {
    const projectBase: string = tools.getRightClickedPath(uri);

    // 0. 填写必要参数 getParamters
    const parameters = await getParameters(projectBase);
    parameters['app-secret'] = tools.generateSecretKey();

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'FastAPI-Assistant',
            cancellable: false
        },
        async (progress) => {
            // 1. 初始化uv项目
            progress.report({ message: 'Initializing uv project...' });
            await initUvProject(tools.getWorkspacePath());

            // 2. 安装依赖
            progress.report({ message: 'Installing dependencies...' });
            await installDependencies(tools.getWorkspacePath());

            // 3. 解压文件到模板 
            progress.report({ message: 'Extracting template files...' });
            await tools.extractTemplate(context, 'project.zip', tools.getRightClickedPath(uri), false);

            // 4. 渲染参数到模板
            progress.report({ message: 'Rendering settings...' });
            const settingFile = path.join(projectBase, 'core', 'settings.py');
            tools.renderFile(settingFile, parameters);

            // 5. 初始化 Alembic
            progress.report({ message: 'Initializing alembic...' });
            await initializeAlembic(projectBase);

            // 6. 更新 Alembic
            progress.report({ message: 'Configuring alembic...' });
            await configureAlembic(projectBase, parameters);
        }
    );

    vscode.window.showInformationMessage('Project created successfully!');
}

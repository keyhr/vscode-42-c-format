import * as vscode from 'vscode';
import * as cp from 'child_process';

// Configuration constants
const FORMATTER_TIMEOUT_MS = 30000; // 30 seconds

// Extension constants
const EXTENSION_NAME = '42-c-format';
const DEFAULT_EXECUTABLE = 'c_formatter_42';

// UI labels
const UI_LABELS = {
  openSettings: 'Open Settings',
  showOutput: 'Show Output',
} as const;

// Error message constants
const ERROR_MESSAGES = {
  formatterTimeout: `Formatter timed out after ${FORMATTER_TIMEOUT_MS / 1000} seconds`,
  noWorkspace: 'No workspace folder found. Using default working directory.',
  canceled: 'Formatting was canceled.',
  commandNotFound: (executable: string) =>
    `Command not found: "${executable}". Please ensure it is installed and in your PATH, or provide a full path in settings.`,
  formattingFailed: `${EXTENSION_NAME}: Formatting failed. See output for details.`,
  formattingFailedInternal: 'Formatting failed',
} as const;

export let outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);

class DocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {

  public async provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): Promise<vscode.TextEdit[]> {
    return await this.formatDocument(document, options, token);
  }

  private getEdits(document: vscode.TextDocument, formattedContent: string): vscode.TextEdit[] {
    const firstLine = document.lineAt(0);
    const lastLine = document.lineAt(document.lineCount - 1);
    const currentEdit = vscode.TextEdit.replace(
      new vscode.Range(firstLine.range.start, lastLine.range.end),
      formattedContent
    );

    return [currentEdit];
  }

  private spawnFormatter(textContent: string, token: vscode.CancellationToken): Promise<string> {
    return new Promise((resolve, reject) => {
      const { executable, args } = this.getConfiguration();
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceFolder) {
        outputChannel.appendLine(`[Warning] ${ERROR_MESSAGES.noWorkspace}`);
      }

      const child = cp.spawn(
        executable,
        args,
        { cwd: workspaceFolder }
      );

      // Timeout handling
      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error(ERROR_MESSAGES.formatterTimeout));
      }, FORMATTER_TIMEOUT_MS);

      let cancellationDisposable: vscode.Disposable | undefined;
      const cleanup = () => {
        clearTimeout(timeoutId);
        cancellationDisposable?.dispose();
      };

      child.stdin.end(textContent);
      child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      child.on('error', (err: NodeJS.ErrnoException) => {
        cleanup();
        if (err.code === 'ENOENT') {
          vscode.window.showErrorMessage(
            ERROR_MESSAGES.commandNotFound(executable),
            UI_LABELS.openSettings
          ).then(selection => {
            if (selection === UI_LABELS.openSettings) {
              vscode.commands.executeCommand('workbench.action.openSettings', EXTENSION_NAME);
            }
          });
          return resolve('');
        }
        return reject(err);
      });

      child.on('close', code => {
        cleanup();
        const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
        const stderr = Buffer.concat(stderrChunks).toString('utf-8');

        if (code !== 0 || stderr.length !== 0) {
          outputChannel.clear();
          outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] Error: Exit Code ${code}`);
          if (stderr) {outputChannel.appendLine(`Standard Error:\n${stderr}`);}

          vscode.window.showErrorMessage(
            ERROR_MESSAGES.formattingFailed,
            UI_LABELS.showOutput
          ).then(selection => {
            if (selection === UI_LABELS.showOutput) {
              outputChannel.show(true);
            }
          });

          return reject(new Error(ERROR_MESSAGES.formattingFailedInternal));
        }
        return resolve(stdout);
      });

      if (token) {
        cancellationDisposable = token.onCancellationRequested(() => {
          cleanup();
          child.kill();
          reject(new Error(ERROR_MESSAGES.canceled));
        });
      }
    });
  }

  private async formatDocument(document: vscode.TextDocument, _: vscode.FormattingOptions, token: vscode.CancellationToken): Promise<vscode.TextEdit[]> {
    const textContent = document.getText();

    try {
      const stdout = await this.spawnFormatter(textContent, token);
      if (stdout === '') {
        return [];
      }
      return this.getEdits(document, stdout);
    } catch (error) {
      outputChannel.appendLine(`[Error] Formatting failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private getConfiguration() {
    const config = vscode.workspace.getConfiguration(EXTENSION_NAME);

    return {
      executable: config.get<string>('executable', DEFAULT_EXECUTABLE),
      args: config.get<string[]>('args', []),
    };
  }
}

function showBreakingChangeNotes(context: vscode.ExtensionContext, version: string) {
  const panel = vscode.window.createWebviewPanel(
    '42CFormatBreakingChanges',
    '⚠️ 42 C Format - Breaking Changes',
    vscode.ViewColumn.One,
    {
      enableScripts: true
    }
  );

  panel.webview.html = getBreakingChangesHtml(context, version);

  panel.webview.onDidReceiveMessage(
    message => {
      if (message.command === 'openSettings') {
        vscode.commands.executeCommand('workbench.action.openSettings', '42-c-format');
      }
    },
    undefined,
    context.subscriptions
  );
}

function getBreakingChangesHtml(context: vscode.ExtensionContext, version: string): string {
  const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'breaking-changes.html');
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Breaking Changes</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            border-left: 4px solid var(--vscode-editorWarning-foreground);
            padding-left: 16px;
            margin-bottom: 24px;
        }
        .header h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
            color: var(--vscode-editorWarning-foreground);
        }
        .header p {
            margin: 0;
            color: var(--vscode-descriptionForeground);
        }
        .warning-box {
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            border-radius: 4px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .warning-box h2 {
            margin: 0 0 12px 0;
            font-size: 18px;
            color: var(--vscode-editorWarning-foreground);
        }
        .warning-box p {
            margin: 8px 0;
        }
        .warning-box ul {
            margin: 8px 0;
            padding-left: 24px;
        }
        .warning-box li {
            margin: 4px 0;
        }
        .warning-box code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        .button-container {
            margin-top: 24px;
            display: flex;
            gap: 12px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            font-size: 14px;
            cursor: pointer;
            border-radius: 2px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .secondary-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .secondary-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚠️ Breaking Changes in v${version}</h1>
        <p>42 C Format has been updated with important changes to settings configuration.</p>
    </div>

    <div class="warning-box">
        <h2>Default Execution Command Changed</h2>
        <p>The default command changed from <code>python3 -m c_formatter_42</code> to <code>c_formatter_42</code>.</p>

        <p><strong>If you want to run as a Python module, please configure the following settings:</strong></p>
        <ul>
            <li><code>42-c-format.executable</code>: <code>"python3"</code> (or <code>"python"</code> on Windows)</li>
            <li><code>42-c-format.args</code>: <code>["-m", "c_formatter_42"]</code></li>
        </ul>

        <p><strong>Alternatively:</strong></p>
        <ul>
            <li>Add <code>c_formatter_42</code> as an executable to your PATH with pipx</li>
        </ul>
    </div>

    <div class="button-container">
        <button onclick="openSettings()">Open Settings</button>
        <button class="secondary-button" onclick="closePanel()">Close</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function openSettings() {
            vscode.postMessage({ command: 'openSettings' });
        }

        function closePanel() {
            // Panel will be closed automatically when user clicks close button
            window.close();
        }
    </script>
</body>
</html>
`;
  return htmlContent;
}

let myStatusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  myStatusBarItem.text = '$(rocket) 42CFmt';
  myStatusBarItem.tooltip = '42 C Format is Active';
  myStatusBarItem.show();
  context.subscriptions.push(myStatusBarItem);

  // Register current version and show release notes if updated
  const currentVersion = context.extension.packageJSON.version;
  const lastVersion = context.globalState.get<string>('lastVersion');

  if (currentVersion.startsWith('0.1.')) {
    if (lastVersion === undefined || lastVersion.startsWith('0.0.')) {
      showBreakingChangeNotes(context, currentVersion);
    }
  }

  context.globalState.update('lastVersion', currentVersion);

  let formatter = new DocumentFormattingEditProvider();

  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider({ language: 'c', scheme: 'file' }, formatter));
  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider({ language: 'cpp', scheme: 'file' }, formatter));
}

export function deactivate() {
  outputChannel.dispose();
}

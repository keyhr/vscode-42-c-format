import * as vscode from 'vscode';
import * as cp from 'child_process';

export let outputChannel = vscode.window.createOutputChannel('c_formatter_42');

class DocumntFormattingEditProvider implements vscode.DocumentFormattingEditProvider {

  public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
    return this.formatDocument(document, options, token);
  }

  public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, _: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
    return this.formatDocument(document, options, token);
  }

  private getEdits(document: vscode.TextDocument, formatedContent: string): Thenable<vscode.TextEdit[]> {
    return new Promise((resolve, _) => {
      let currentEdit: vscode.TextEdit;

      let firstLine = document.lineAt(0);
      let lastLine = document.lineAt(document.lineCount - 1);
      // currentEdit = new vscode.TextEdit(new vscode.Range(firstLine.range.start, lastLine.range.end), formatedContent);
      currentEdit = vscode.TextEdit.replace(new vscode.Range(firstLine.range.start, lastLine.range.end), formatedContent);

      resolve([currentEdit]);
    });
  }

  private formatDocument(document: vscode.TextDocument, _: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
    return new Promise((resolve, reject) => {
      let textContent = document.getText();

      let stdout = '';
      let stderr = '';
      let child = cp.spawn('python3', ['-m', 'c_formatter_42'], { cwd: vscode.workspace.rootPath });
      child.stdin.end(textContent);
      child.stdout.on('data', chunk => stdout += chunk);
      child.stderr.on('data', chunk => stderr += chunk);
      child.on('error', err => {
        if (err && (<any>err).code === 'ENOENT') {
          vscode.window.showInformationMessage('c_formatter_42 is not executable.');
          return resolve([]);
        }
        return reject(err);
      });
      child.on('close', code => {
        try {
          if (stderr.length !== 0) {
            outputChannel.show();
            outputChannel.clear();
            outputChannel.appendLine(stderr);
            return reject('Cannot format');
          }

          if (code !== 0) {
            return reject();
          }

          outputChannel.appendLine(stdout);
          return resolve(this.getEdits(document, stdout));
        } catch (e) {
          reject(e);
        }
      });

      if (token) {
        token.onCancellationRequested(() => {
          child.kill();
          reject('Canceled.');
        });
      }
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  let formatter = new DocumntFormattingEditProvider();

  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider({ language: 'c', scheme: 'file' }, formatter));
  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider({ language: 'cpp', scheme: 'file' }, formatter));

  context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider({ language: 'c', scheme: 'file' }, formatter));
  context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider({ language: 'cpp', scheme: 'file' }, formatter));
}

export function deactivate() { }

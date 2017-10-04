const vscode = require('vscode');
const rp = require('request-promise');
const child = require('child_process');
const fs = require('fs');

function activate(context) {

    vscode.commands.registerCommand('extension.gitmicReset', () => {
        try {
            context.globalState.update('GitHubAuthToken', undefined);
            context.globalState.update('defaultProjectDir', undefined);
        }
        catch(err) {
            console.error(err);
            vscode.window.showErrorMessage(err.message);
        }
    });

    vscode.commands.registerCommand('extension.gitmicOpen', async () => {
        
        try {

            let authToken = context.globalState.get('GitHubAuthToken');
            if (!authToken) {
                authToken = await vscode.window.showInputBox({placeHolder: 'Give your GitHub authorization token. Get one from https://github.com/settings/tokens'});
                context.globalState.update('GitHubAuthToken', authToken);
            }

            let projectDir = context.globalState.get('defaultProjectDir');
            if (!projectDir) {
                projectDir = await vscode.window.showInputBox({value: process.env.HOME + '/code', prompt: 'Give your default project directory.'});
                projectDir = projectDir.replace(/\/$/, '');
                context.globalState.update('defaultProjectDir', projectDir);
            }
            var options = {
                url: 'https://api.github.com/user/repos?sort=updated',
                headers: {
                    'authorization' : 'Bearer ' + authToken,
                    'Content-Type' : 'application/json',
                    'User-Agent' : 'Request-Promise'
                },
                json: true
            };
            var repoList = await rp.get(options);
            let namelist = repoList.map(item => { return item.full_name } );    
            var selected = await vscode.window.showQuickPick(namelist, { placeHolder: 'Select repository to clone' });

            for (let i in repoList){
                if (repoList[i].full_name == selected) {
                    try{
                        let targetPath = `${projectDir}/${repoList[i].name}`
                        if (!fs.existsSync(targetPath)) {
                            vscode.window.showInformationMessage(`Cloning ${repoList[i].name} to ${targetPath}`);
                            var res = await runCommand(`git clone ${repoList[i].ssh_url} ${targetPath}`);    
                        } else {
                            vscode.window.showInformationMessage(`Pulling ${repoList[i].name} to ${targetPath}`);
                            var res = await runCommand(`cd ${targetPath} && git pull`);
                        }
                        let uri = vscode.Uri.parse(targetPath);
                        let success = await vscode.commands.executeCommand('vscode.openFolder', uri, true);
                    }
                    catch(err){
                        console.log(err);
                        vscode.window.showErrorMessage(err.message);
                    }
                }
            }

        }
        catch (err) {
            console.error(err);
            vscode.window.showErrorMessage(err.message);
        }
    });
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;

// Execute SHELL commands
function runCommand(command) {
    return new Promise((resolve, reject) => {
        child.exec(command, (err, stderr, stdout) => {
            if(err){
                reject(err);
            } else {
                resolve(stdout); 
            }
        });
    });
}
  
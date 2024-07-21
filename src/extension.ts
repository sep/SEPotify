import * as vscode from 'vscode';
import { redirectToAuthCodeFlow, getAccessToken } from "./authCodeWithPkce";

const clientId = "your-client-id";

export function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('SEPotify.login', () => {
		redirectToAuthCodeFlow(clientId, context);
	});

	const handleUri = async (uri: vscode.Uri) => {
		const queryParams = new URLSearchParams(uri.query);

		if (queryParams.has('code')) {
			await getAccessToken(clientId, queryParams.get('code')!, context);
			vscode.window.showInformationMessage('Login successful');
		}
	}

	context.subscriptions.push(
		vscode.window.registerUriHandler({
			handleUri
		})
	);

	context.subscriptions.push(disposable);
}

export function deactivate() {}

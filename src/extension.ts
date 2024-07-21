import * as vscode from 'vscode';
import { redirectToAuthCodeFlow, getAccessToken } from "./authCodeWithPkce";

const clientId = "your-client-id";

export function activate(context: vscode.ExtensionContext) {

	const provider = new SpotifyPlayerViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SpotifyPlayerViewProvider.viewType, provider));

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.login', () => {
		redirectToAuthCodeFlow(clientId, context);
	}));

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

	const refreshToken = async () => {
		const refreshToken = await context.secrets.get("refresh_token");
   		const url = "https://accounts.spotify.com/api/token";

		const payload = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken!,
			client_id: clientId
		}),
		}
		const body = await fetch(url, payload);
		const { access_token, refresh_token} = await body.json();

		context.secrets.store('access_token', access_token);
		context.secrets.store('refresh_token', refresh_token);

		return access_token;
	}

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.pause', async () => {
		pause();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.play', async () => {
		play();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.pausePlay', async () => {
		const accessToken = await refreshToken();

		const request = await fetch("https://api.spotify.com/v1/me/player", {
			method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
		});

		const { is_playing } = await request.json();

		if (is_playing) {
			pause();
		} else {
			play();
		}
	}));

	const play = async () => {
		const accessToken = await refreshToken();

		await fetch("https://api.spotify.com/v1/me/player/play", {
			method: "PUT", headers: { Authorization: `Bearer ${accessToken}` }
		});
	}

	const pause = async () => {
		const accessToken = await refreshToken();

		await fetch("https://api.spotify.com/v1/me/player/pause", {
			method: "PUT", headers: { Authorization: `Bearer ${accessToken}` }
		});
	}
}

class SpotifyPlayerViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'SEPotify.playerView';

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Thenable<void> | void {
		webviewView.webview.options = {
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'pausePlay':
					{
						vscode.commands.executeCommand('SEPotify.pausePlay');
						break;
					}
			}
		});
	} 
	
	private _getHtmlForWebview(webview: vscode.Webview) {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading styles from our extension directory,
					and only allow scripts that have a specific nonce.
					(See the 'webview-sample' extension sample for img-src content security policy examples)
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<title>SEPotify</title>
			</head>
			<body>
				<button class="pause-play-button">Pause | Play</button>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}

}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function deactivate() {}

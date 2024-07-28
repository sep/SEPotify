import * as vscode from 'vscode';
import { redirectToAuthCodeFlow, getAccessToken } from "./authCodeWithPkce";
import * as Spotify from '@spotify/web-api-ts-sdk';

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
	};

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
		};
		const body = await fetch(url, payload);
		const { access_token, refresh_token} = await body.json() as Spotify.AccessToken;

		context.secrets.store('access_token', access_token);
		context.secrets.store('refresh_token', refresh_token);

		return access_token;
	};

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.pause', async () => {
		pause();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.play', async () => {
		play();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.pausePlay', async () => {
		const playStatus = await getPlayStatus();

		if (playStatus.is_playing) {
			pause();
		} else {
			play();
		}

		if ('album' in playStatus.item) {
			provider.update(playStatus.item.name, playStatus.item.album.images[0].url);
		}
	}));

	const play = async () => {
		const accessToken = await refreshToken();

		await fetch("https://api.spotify.com/v1/me/player/play", {
			method: "PUT", headers: { Authorization: `Bearer ${accessToken}` }
		});
	};

	const pause = async () => {
		const accessToken = await refreshToken();

		await fetch("https://api.spotify.com/v1/me/player/pause", {
			method: "PUT", headers: { Authorization: `Bearer ${accessToken}` }
		});
	};

	async function getPlayStatus(): Promise<Spotify.PlaybackState> {
		const accessToken = await refreshToken();

		const request = await fetch("https://api.spotify.com/v1/me/player", {
			method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
		});

		return await request.json() as Spotify.PlaybackState;
	}

}

class SpotifyPlayerViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'SEPotify.playerView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Thenable<void> | void {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri,
				vscode.Uri.joinPath(this._extensionUri, 'media')
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

	public update(songName: string, image: string) {
		if (this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({ type: 'update', name: songName, image: image });
		}
	}
	
	private _getHtmlForWebview(webview: vscode.Webview) {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<title>SEPotify</title>
			</head>
			<body>
				<h1 class="song-title">Song Title</h1>
				<img class="album-art" src="https://i.scdn.co/image/ab67616d0000b273ef7bfaf6252210b502861ffd" alt="Song Cover" />

				<button type="submit" class="pause-play-button" style="background-color:black; outline:none">
					<img src="https://img.icons8.com/?size=100&id=QgHnLwTtAxG8&format=png&color=ffffff" alt="Play/Pause" />
				</button>

				<p><small>Icons by <a href="https://icons8.com">Icons8</a></small></p>

				<script src="${scriptUri}"></script>
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

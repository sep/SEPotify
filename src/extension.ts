import * as vscode from 'vscode';
import { redirectToAuthCodeFlow, getAccessToken } from "./authCodeWithPkce";
import { SpotifyApi, type AccessToken, type PlaybackState } from '@spotify/web-api-ts-sdk';

export async function activate(context: vscode.ExtensionContext) {

	let spotify: SpotifyApi | undefined;
	spotify?.getAccessToken();

	const clientId = process.env.CLIENT_ID as string;
	const accessToken = await retrieveAccessToken();
	if (accessToken) {
		spotify = SpotifyApi.withAccessToken(clientId, accessToken);

		try {
			await spotify.player.getPlaybackState();

			storeAccessToken(await spotify.getAccessToken());
		} catch (error) {
			vscode.window.showInformationMessage('Auto-login failed. Please login again.');

			spotify = undefined;
		}
	}

	const provider = new SpotifyPlayerViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SpotifyPlayerViewProvider.viewType, provider));

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.login', () => {
		redirectToAuthCodeFlow(clientId, context);
	}));

	const handleUri = async (uri: vscode.Uri) => {
		const queryParams = new URLSearchParams(uri.query);

		if (queryParams.has('code')) {
			const accessToken = await getAccessToken(clientId, queryParams.get('code')!, context);

			spotify = SpotifyApi.withAccessToken(clientId, accessToken);

			vscode.window.showInformationMessage('Login successful');

			updateView(await spotify.player.getPlaybackState());

			storeAccessToken(accessToken);
		}
	};

	context.subscriptions.push(
		vscode.window.registerUriHandler({
			handleUri
		})
	);

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.pause', async () => {
		if (spotify) {
			try {
				await spotify.player.pausePlayback("");
			} catch (error) {
				// I don't know why this is throwing an error, so I'm ignoring it.
			}
			requestUpdate();

			storeAccessToken(await spotify.getAccessToken());
		} else {
			vscode.window.showInformationMessage('Please login.');
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.play', async () => {
		if (spotify) {
			try {
				await spotify.player.startResumePlayback("");
			} catch (error) {
				// I don't know why this is throwing an error, so I'm ignoring it.
			}
			requestUpdate();

			storeAccessToken(await spotify.getAccessToken());
		} else {
			vscode.window.showInformationMessage('Please login.');
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.pausePlay', async () => {
		if (!spotify) {
			vscode.window.showInformationMessage('Please login.');
			return;
		}

		const playStatus = await spotify.player.getPlaybackState();

		if (playStatus.is_playing) {
			spotify.player.pausePlayback("");
		} else {
			spotify.player.startResumePlayback("");
		}

		updateView(playStatus);

		storeAccessToken(await spotify.getAccessToken());
	}));

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.nextTrack', async () => {
		if (spotify) {
			try {
				await spotify.player.skipToNext("");
			} catch (error) {
				// I don't know why this is throwing an error, so I'm ignoring it.
			}
			requestUpdate();

			storeAccessToken(await spotify.getAccessToken());
		} else {
			vscode.window.showInformationMessage('Please login.');
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.previousTrack', async () => {
		if (spotify) {
			try {
				await spotify.player.skipToPrevious("");
			} catch (error) {
				// I don't know why this is throwing an error, so I'm ignoring it.
			}
			requestUpdate();

			storeAccessToken(await spotify.getAccessToken());
		} else {
			vscode.window.showInformationMessage('Please login.');
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('SEPotify.updateSongInformation', () => {
		if (!spotify) {
			vscode.window.showInformationMessage('Please login.');
			return;
		}

		requestUpdate();
	}));

	function updateView(playStatus: PlaybackState) {
		let albumImageUrl: string = "";
		if ('album' in playStatus.item) {
			albumImageUrl = playStatus.item.album.images[0].url;
		}

		provider.update(playStatus.item.name, albumImageUrl);
	}

	function storeAccessToken(accessToken: AccessToken | null) {
		if (!accessToken) {
			return;
		}

		context.secrets.store('SEPotify.access_token.access_token', accessToken.access_token);
		context.secrets.store('SEPotify.access_token.token_type', accessToken.token_type);
		context.secrets.store('SEPotify.access_token.expires_in', accessToken.expires_in.toString());
		context.secrets.store('SEPotify.access_token.refresh_token', accessToken.refresh_token);

		if (accessToken.expires) {
			context.secrets.store('SEPotify.access_token.expires', accessToken.expires.toString());
		}
	}

	async function retrieveAccessToken(): Promise<AccessToken | undefined> {
		const accessToken = await context.secrets.get('SEPotify.access_token.access_token');

		if (!accessToken) {
			return undefined;
		}

		const tokenType = await context.secrets.get('SEPotify.access_token.token_type');
		const expiresIn = await context.secrets.get('SEPotify.access_token.expires_in');
		const refreshToken = await context.secrets.get('SEPotify.access_token.refresh_token');
		const expires = await context.secrets.get('SEPotify.access_token.expires');

		return {
			access_token: accessToken!,
			token_type: tokenType!,
			expires_in: parseInt(expiresIn!),
			refresh_token: refreshToken!,
			expires: expires ? parseInt(expires) : undefined
		};
	}

	async function requestUpdate() {
		if (!spotify) {
			return;
		}

		const playStatus = await spotify.player.getPlaybackState();

		if ('album' in playStatus.item) {
			provider.update(playStatus.item.name, playStatus.item.album.images[0].url);
		}

		storeAccessToken(await spotify.getAccessToken());
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

		vscode.commands.executeCommand('SEPotify.updateSongInformation');

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'pausePlay':
				{
					vscode.commands.executeCommand('SEPotify.pausePlay');
					break;
				}
				case 'skip':
				{
					vscode.commands.executeCommand('SEPotify.nextTrack');
					break;
				}
				case 'rewind':
				{
					vscode.commands.executeCommand('SEPotify.previousTrack');
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
				<div>
					<img class="album-art" src="https://img.icons8.com/?size=999999&id=QDqTv8PbGZgc&format=png&color=ffffff" alt="Song Cover" />
				</div>

				<div>
				<button type="submit" class="rewind-button" style="background-color:black; outline:none; max-width:32%">
					<img src="https://img.icons8.com/?size=999999&id=91480&format=png&color=ffffff" alt="Rewind" />
				</button>

				<button type="submit" class="pause-play-button" style="background-color:black; outline:none; max-width:32%">
					<img src="https://img.icons8.com/?size=999999&id=QgHnLwTtAxG8&format=png&color=ffffff" alt="Play/Pause" />
				</button>

				<button type="submit" class="skip-button" style="background-color:black; outline:none; max-width:32%">
					<img src="https://img.icons8.com/?size=999999&id=91476&format=png&color=ffffff" alt="Skip" />
				</button>
				</div>

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

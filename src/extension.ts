import * as vscode from 'vscode';
import { redirectToAuthCodeFlow, getAccessToken } from "./authCodeWithPkce";

const clientId = "your-client-id";

export function activate(context: vscode.ExtensionContext) {

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

export function deactivate() {}

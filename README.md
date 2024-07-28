# SEPotify README

SEPotify is a VS Code extension developed by SEPeers that adds a graphical user interface for a Spotify player directly within VS Code. This extension is designed to allow users to control their Spotify music without having to leave the VS Code environment.

## Features

SEPotify provides four commands:
1. Login
2. Play
3. Pause
4. Pause | Play

You can also access the visual interface in the sidebar.

## Install

1. Clone this repository and open it in VS Code.
2. Run `npm install` in the root directory.
3. Create a Spotify Developer account and create a new app. [Instructions](https://developer.spotify.com/documentation/web-api/tutorials/getting-started#set-up-your-account)
4. Add `vscode://SEP.SEPotify` as a redirect URI in your Spotify app settings.
5. Set your Spotify app client ID in `.vscode/launch.json`.
6. Press `F5` to run the extension in a new window to test.
7. Package the extension by running `vsce package` in the root directory.
8. Open the Extensions view in VS Code and click the `...` button, then `Install from VSIX...`.
9. Select the `.vsix` file that was created in the root directory.
10. Reload VS Code to activate the extension.
11. Open the command palette and run `SEPotify: Login` to authenticate your Spotify account.
12. You can now use the commands in the command palette or access the visual interface in the sidebar.

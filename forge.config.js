export default {
    packagerConfig: {
        asar: true,
        arch: ['x64', 'arm64'],
        platform: ['darwin', 'win32'],
        overwrite: true,
        ignore: [
            /\/(?:build|node_modules|\.[a-z]+|yarn\.lock|package-lock\.json|README\.md|LICENSE)$/,
            /\/(?:src|out|electron|public|.vscode|.idea|.github|.git|.DS_Store)$/,
            /\.gitignore|\.npmrc/
        ]
        /*osxSign: {},
        executableName: 'DatabaseKit',
        icon: './public/icon', // Path to icon without extension
        appBundleId: 'com.yourname.electronviteproject', // Replace with your app bundle ID
        appCategoryType: 'public.app-category.developer-tools',
        osxNotarize: {
          tool: 'notarytool',
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_PASSWORD,
          teamId: process.env.APPLE_TEAM_ID
        }*/
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-zip',
            arch: ['x64', 'arm64'],
            platforms: ['darwin', 'win32'],
        },
        /*{
            name: '@electron-forge/maker-squirrel',
            config: {
                // name: 'electron-vite-project',
                /!*setupIcon: './public/icon.ico',
                iconUrl: 'https://raw.githubusercontent.com/yourusername/yourrepo/main/public/icon.ico', // Replace with actual URL
                loadingGif: './public/install-spinner.gif', *!/// Optional: custom spinner for the installer
                setupExe: 'electron-vite-project-setup.exe',
                noMsi: false // Set to true if you don't want to generate an MSI
            }
        },
        {
            name: '@electron-forge/maker-dmg',
            config: {
                background: './public/dmg-background.png', // Optional: custom background for DMG
                format: 'ULFO'
                // icon: './public/icon.icns',
            }
        }*/
    ],
    /*publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                repository: {
                    owner: 'yourusername', // Replace with your GitHub username
                    name: 'yourrepo' // Replace with your repository name
                },
                prerelease: true, // Set to false for production releases
                draft: true // Create releases as drafts to review before publishing
            }
        }
    ],*/
}
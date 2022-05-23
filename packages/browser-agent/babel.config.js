module.exports = {
    presets: ['@babel/preset-env'],
    "env": {
        "production": {
            "presets": ["minify"]
        }
    },
    plugins: [
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-private-methods'
    ],
}
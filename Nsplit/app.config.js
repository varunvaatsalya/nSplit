// Extends app.json with settings that come from environment variables.

/**
 * Google sign-in needs the iOS client's reversed id as a URL scheme. Android
 * needs no native config (the Android OAuth client is matched by package name +
 * SHA-1), so the plugin is only added once an iOS client id is set.
 */
function withGoogleSignIn(plugins) {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId) return plugins;
  const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, '')}`;
  return [...plugins, ['@react-native-google-signin/google-signin', { iosUrlScheme }]];
}

module.exports = ({ config }) => ({
  ...config,
  plugins: withGoogleSignIn(config.plugins ?? []),
});

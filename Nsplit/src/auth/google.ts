import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * Google sign-in uses native code, so it is missing in Expo Go; it also needs
 * the web client id (and on iOS, the iOS client id) to be configured.
 */
export const googleSignInAvailable =
  Boolean(WEB_CLIENT_ID) &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  (Platform.OS === 'android' || (Platform.OS === 'ios' && Boolean(IOS_CLIENT_ID)));

let mod: GoogleModule | null = null;

/** Loaded on first use, so Expo Go never touches the native module. */
function google(): GoogleModule {
  if (!mod) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@react-native-google-signin/google-signin') as GoogleModule;
    mod.GoogleSignin.configure({
      // Tokens are issued for the web client, which is what the server checks.
      webClientId: WEB_CLIENT_ID,
      iosClientId: IOS_CLIENT_ID,
    });
  }
  return mod;
}

/** Shows Google's account picker. Resolves to an ID token, or null if the user backed out. */
export async function getGoogleIdToken(): Promise<string | null> {
  if (!googleSignInAvailable) throw new Error('Google sign-in is not available in this build.');
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = google();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Forget the last account so the picker always shows, letting people switch accounts.
    await GoogleSignin.signOut().catch(() => {});
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    if (!response.data.idToken) throw new Error('Google did not return a sign-in token. Please try again.');
    return response.data.idToken;
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.IN_PROGRESS) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play services are missing or out of date on this phone.');
      }
      // Android's DEVELOPER_ERROR (10): this build's SHA-1 / package isn't registered in Google Cloud.
      if (String(e.code) === '10' || /DEVELOPER_ERROR/.test(e.message)) {
        throw new Error('Google sign-in is not set up for this version of the app yet.');
      }
    }
    throw e instanceof Error ? e : new Error('Google sign-in failed. Please try again.');
  }
}

/** Clears Google's remembered account on logout. */
export async function googleSignOut() {
  if (!googleSignInAvailable || !mod) return;
  await mod.GoogleSignin.signOut().catch(() => {});
}

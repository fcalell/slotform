import { type AuthClient, createAuthClient } from "@slotform/auth/expo";
import * as SecureStore from "expo-secure-store";
import { cookiePrefix, scheme } from "../../.slotform/native-auth";

// The native auth client: docs/architecture/plugins/native-ui.md, "Native auth client".
export const authClient: AuthClient = createAuthClient({
	baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787",
	scheme,
	cookiePrefix,
	storage: SecureStore,
});

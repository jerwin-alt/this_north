import AsyncStorage from "@react-native-async-storage/async-storage";

let token: string | null = null;

export async function setToken(newToken: string | null): Promise<void> {
  token = newToken;

  if (token !== null) {
    await AsyncStorage.setItem("token", token);
  } else {
    await AsyncStorage.removeItem("token");
  }
}

export async function getToken(): Promise<string | null> {
  if (token !== null) {
    return token;
  }

  token = await AsyncStorage.getItem("token");
  return token;
}
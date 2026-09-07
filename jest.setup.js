/* eslint-env jest */

// Zustand stores in this app persist through AsyncStorage / expo-secure-store.
// Mock both globally so store tests don't touch real native modules.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

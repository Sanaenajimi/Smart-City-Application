// frontend/src/lib/auth.js
import { apiPost } from "./api";

const LS_TOKEN = "sc_token";
const LS_USER = "sc_user";
const LS_REMEMBER = "sc_remember";

// DEMO USERS
export const DEMO_USERS = [
  {
    persona: "env",
    label: "Marie D. (Env.)",
    roleLabel: "Responsable Environnement",
    email: "marie.env@smartcity.demo",
    password: "demo",
    name: "Marie Dubois",
  },
  {
    persona: "elected",
    label: "Paul M. (Élu)",
    roleLabel: "Élu",
    email: "paul.elu@smartcity.demo",
    password: "demo",
    name: "Paul Martin",
  },
  {
    persona: "citizen",
    label: "Citoyen (démo)",
    roleLabel: "Citoyen",
    email: "citoyen@smartcity.demo",
    password: "demo",
    name: "Sam Citizen",
  },
];

export function isAuthenticated() {
  return Boolean(localStorage.getItem(LS_TOKEN));
}

export function getToken() {
  return localStorage.getItem(LS_TOKEN);
}

export function setSession({ token, user }) {
  if (token) localStorage.setItem(LS_TOKEN, token);
  if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
}

export function getUser() {
  try {
    const raw = localStorage.getItem(LS_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
}

export function setRemember(flag) {
  localStorage.setItem(LS_REMEMBER, flag ? "1" : "0");
}

export function getRemember() {
  return localStorage.getItem(LS_REMEMBER) === "1";
}

export async function login(payload) {
  const data = await apiPost("/api/auth/login", payload);
  setSession({ token: data?.token, user: data?.user });
  return data;
}

export async function loginDemo(persona) {
  const u = DEMO_USERS.find((x) => x.persona === persona) || DEMO_USERS[0];
  return login({ email: u.email, password: u.password, persona: u.persona });
}
/* Copyright 2024 Marimo. All rights reserved. */
import { KnownQueryParams } from "../constants";

export function createWsUrl(sessionId: string): string {
  const baseURI = document.baseURI;

  const url = new URL(baseURI);
  const protocol = url.protocol === "https:" ? "wss" : "ws";
  url.protocol = protocol;
  url.pathname = `${withoutTrailingSlash(url.pathname)}/ws`;

  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set(KnownQueryParams.sessionId, sessionId);
  url.search = searchParams.toString();

  return url.toString();
}

function withoutTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

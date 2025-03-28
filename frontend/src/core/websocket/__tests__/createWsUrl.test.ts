/* Copyright 2024 Marimo. All rights reserved. */

import { describe, expect, it } from "vitest";
import { createWsUrl } from "../createWsUrl";
import { KnownQueryParams } from "@/core/constants";

describe("createWsUrl", () => {
  it("should return a URL with the wss protocol when the baseURI uses https", () => {
    // Mock the document.baseURI to return an https URL
    Object.defineProperty(document, "baseURI", {
      value: "https://marimo.app/",
      writable: true,
    });

    const sessionId = "1234";
    const result = createWsUrl(sessionId);
    const url = new URL(result, document.baseURI);
    expect(url.toString()).toBe("wss://marimo.app/ws?session_id=1234");
    expect(url.searchParams.get(KnownQueryParams.sessionId)).toBe(sessionId);
  });

  it("should return a URL with the ws protocol when the baseURI uses http", () => {
    // Mock the document.baseURI to return an http URL
    Object.defineProperty(document, "baseURI", {
      value: "http://marimo.app/",
      writable: true,
    });

    const sessionId = "1234";
    const result = createWsUrl(sessionId);
    const url = new URL(result, document.baseURI);
    expect(url.toString()).toBe("ws://marimo.app/ws?session_id=1234");
    expect(url.searchParams.get(KnownQueryParams.sessionId)).toBe(sessionId);
  });

  it("should work with nested baseURI", () => {
    // Mock the document.baseURI to return an http URL
    Object.defineProperty(document, "baseURI", {
      value: "http://marimo.app/nested/",
      writable: true,
    });

    const sessionId = "1234";
    const result = createWsUrl(sessionId);
    const url = new URL(result, document.baseURI);
    expect(url.toString()).toBe("ws://marimo.app/nested/ws?session_id=1234");
    expect(url.searchParams.get(KnownQueryParams.sessionId)).toBe(sessionId);
  });

  it("should work with nested baseURI and query params", () => {
    // Mock the document.baseURI to return an http URL
    Object.defineProperty(document, "baseURI", {
      value: "http://marimo.app/nested/?foo=bar",
      writable: true,
    });
    Object.defineProperty(window, "location", {
      value: { search: "?foo=bar" },
      writable: true,
    });

    const sessionId = "1234";
    const result = createWsUrl(sessionId);
    const url = new URL(result, document.baseURI);
    expect(url.toString()).toBe(
      "ws://marimo.app/nested/ws?foo=bar&session_id=1234",
    );
    expect(url.searchParams.get(KnownQueryParams.sessionId)).toBe(sessionId);
  });
});

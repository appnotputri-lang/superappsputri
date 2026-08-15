import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getDepositNoteByIdD1,
  updateDepositNoteD1,
  deleteDepositNoteD1
} from '../../../src/lib/d1DepositNoteRepository';

export const onRequestGet = async (context: any) => {
  const { params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id;
    if (!id) {
      return createErrorResponse("Deposit Note ID is required", 400);
    }

    const result = await getDepositNoteByIdD1(db, id);
    if (!result.success) {
      return createErrorResponse(result.error || "Deposit Note not found", 404);
    }

    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Deposit Notes API] Error fetching deposit note by ID:", error);
    return createErrorResponse(error?.message || "Failed to fetch deposit note", 500);
  }
};

export const onRequestPut = async (context: any) => {
  const { params, request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id;
    if (!id) {
      return createErrorResponse("Deposit Note ID is required", 400);
    }

    const payload = await request.json();
    const result = await updateDepositNoteD1(db, id, payload);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Deposit Notes API] Error updating deposit note:", error);
    return createErrorResponse(error?.message || "Failed to update deposit note", 500);
  }
};

export const onRequestDelete = async (context: any) => {
  const { params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id;
    if (!id) {
      return createErrorResponse("Deposit Note ID is required", 400);
    }

    const result = await deleteDepositNoteD1(db, id);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Deposit Notes API] Error deleting deposit note:", error);
    return createErrorResponse(error?.message || "Failed to delete deposit note", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};

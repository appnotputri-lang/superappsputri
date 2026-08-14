import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getProductByIdD1,
  updateProductD1,
  deleteProductD1
} from '../../../src/lib/d1ProductRepository';

export const onRequestGet = async (context: any) => {
  const { params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id;
    const product = await getProductByIdD1(db, id);
    if (!product) {
      return createErrorResponse("Product not found", 404);
    }
    return createJsonResponse({ success: true, product });
  } catch (error: any) {
    console.error("[CF Products API] Error fetching product:", error);
    return createErrorResponse(error?.message || "Failed to fetch product", 500);
  }
};

export const onRequestPut = async (context: any) => {
  const { request, params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id;
    const payload = await request.json();
    const result = await updateProductD1(db, id, payload);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Products API] Error updating product:", error);
    return createErrorResponse(error?.message || "Failed to update product", 500);
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
    const result = await deleteProductD1(db, id);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Products API] Error deleting product:", error);
    return createErrorResponse(error?.message || "Failed to delete product", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
